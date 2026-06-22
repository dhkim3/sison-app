import { get, put } from '@vercel/blob';
import { Buffer } from 'node:buffer';
import pg from 'pg';

type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

// ---- DB pool (module-scoped, reused across invocations) ----
let pool: pg.Pool | null = null;
let dbMissingWarnLogged = false;
const getConnectionString = () => (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
const emptyStoryList = () => ({
  stories: [],
  comments: {},
  likeCounts: {},
  likedStoryIds: [],
  cards: [],
});

const getPool = () => {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) throw new Error('POSTGRES_URL이 설정되지 않았어요.');
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
};

const getBlobToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim();

// 비공개(private) Blob 스토어이므로 공개 URL을 만들 수 없다.
// 이미지는 이 프록시 경로로 서버에서 토큰으로 읽어 스트리밍한다.
const blobProxyUrl = (pathname: string) => `/api/story?action=image&path=${encodeURIComponent(pathname)}`;

const getSingle = (value: string | string[] | undefined, fallback = '') => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
};

const asBody = (req: VercelRequest): Record<string, unknown> => {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const str = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));

const relativeTime = (createdAt: Date | string): string => {
  const then = new Date(createdAt).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return '오늘';
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return '이번 주';
  return `${diffDay}일 전`;
};

const sendError = (res: VercelResponse, code: number, message: string) => {
  res.status(code).json({ ok: false, error: message });
};

// ---- per-action handlers ----

const handleList = async (res: VercelResponse, deviceKey: string) => {
  if (!getConnectionString()) {
    if (!dbMissingWarnLogged) {
      console.warn('[api/story] POSTGRES_URL/DATABASE_URL not configured — returning empty story list');
      dbMissingWarnLogged = true;
    }
    res.status(200).json({ ok: true, ...emptyStoryList() });
    return;
  }

  const db = getPool();
  const [storiesResult, commentsResult, likesResult, cardsResult] = await Promise.all([
    db.query(
      `select id, author_name, author_key, region, city, location, title, body, image_url,
              activity_title, activity_date, created_at
       from stories order by created_at desc`,
    ),
    db.query(
      `select id, story_id, author_name, author_key, body, edited, created_at
       from story_comments order by created_at asc`,
    ),
    db.query(`select story_id, liker_key from story_likes`),
    db.query(
      `select id, story_id, title, subtitle, generated_image_url, created_at
       from story_cards order by created_at desc`,
    ),
  ]);

  const stories = storiesResult.rows.map((row) => ({
    id: Number(row.id),
    title: str(row.title),
    region: str(row.region),
    city: str(row.city) || undefined,
    location: str(row.location) || undefined,
    author: str(row.author_name),
    authorName: str(row.author_name),
    body: str(row.body),
    content: str(row.body),
    imageUrl: str(row.image_url),
    activityTitle: str(row.activity_title) || undefined,
    activityDate: str(row.activity_date) || undefined,
    createdAt: relativeTime(row.created_at),
    likes: 0,
    comments: 0,
    isMine: true,
  }));

  const comments: Record<number, unknown[]> = {};
  for (const row of commentsResult.rows) {
    const storyId = Number(row.story_id);
    if (!comments[storyId]) comments[storyId] = [];
    comments[storyId].push({
      id: Number(row.id),
      author: str(row.author_name),
      body: str(row.body),
      time: relativeTime(row.created_at),
      edited: Boolean(row.edited),
      isMine: Boolean(deviceKey) && row.author_key === deviceKey,
    });
  }

  const likeCounts: Record<number, number> = {};
  const likedStoryIds: number[] = [];
  for (const row of likesResult.rows) {
    const storyId = Number(row.story_id);
    likeCounts[storyId] = (likeCounts[storyId] ?? 0) + 1;
    if (deviceKey && row.liker_key === deviceKey) likedStoryIds.push(storyId);
  }

  const cards = cardsResult.rows.map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    storyId: row.story_id != null ? Number(row.story_id) : null,
    title: str(row.title),
    subtitle: str(row.subtitle),
    imageUrl: str(row.generated_image_url),
    createdAt: row.created_at,
  }));

  res.status(200).json({ ok: true, stories, comments, likeCounts, likedStoryIds, cards });
};

const handleCreate = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const story = (body.story && typeof body.story === 'object' ? body.story : body) as Record<string, unknown>;
  const id = str(story.id) || String(Date.now());
  const title = str(story.title).trim();
  if (!title) return sendError(res, 400, '제목이 필요해요.');

  const db = getPool();
  await db.query(
    `insert into stories (id, author_name, author_key, region, city, location, title, body, image_url, activity_title, activity_date)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (id) do update set
       title = excluded.title, body = excluded.body, image_url = excluded.image_url,
       region = excluded.region, city = excluded.city, location = excluded.location,
       activity_title = excluded.activity_title, activity_date = excluded.activity_date`,
    [
      id,
      str(story.authorName) || str(story.author) || '여행자',
      deviceKey || null,
      str(story.region) || null,
      str(story.city) || null,
      str(story.location) || null,
      title,
      str(story.body) || str(story.content) || null,
      str(story.imageUrl) || null,
      str(story.activityTitle) || null,
      str(story.activityDate) || null,
    ],
  );
  res.status(200).json({ ok: true, id: Number(id) });
};

const handleDeleteStory = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const id = str(body.id || body.storyId);
  if (!id) return sendError(res, 400, '스토리 id가 필요해요.');
  const db = getPool();
  const result = await db.query('delete from stories where id = $1', [id]);
  await db.query('delete from story_comments where story_id = $1', [id]);
  await db.query('delete from story_likes where story_id = $1', [id]);
  res.status(200).json({ ok: true, deleted: result.rowCount ?? 0 });
};

const handleComment = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const storyId = str(body.storyId);
  const text = str(body.body).trim();
  if (!storyId || !text) return sendError(res, 400, '댓글 내용이 필요해요.');
  const db = getPool();
  const result = await db.query(
    `insert into story_comments (story_id, author_name, author_key, body)
     values ($1,$2,$3,$4) returning id, created_at`,
    [storyId, str(body.authorName) || '여행자', deviceKey || null, text],
  );
  const row = result.rows[0];
  res.status(200).json({
    ok: true,
    comment: {
      id: Number(row.id),
      author: str(body.authorName) || '여행자',
      body: text,
      time: relativeTime(row.created_at),
      edited: false,
      isMine: true,
    },
  });
};

const handleCommentDelete = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const commentId = str(body.commentId);
  if (!commentId) return sendError(res, 400, '댓글 id가 필요해요.');
  const db = getPool();
  const result = await db.query('delete from story_comments where id = $1 and author_key = $2', [commentId, deviceKey]);
  res.status(200).json({ ok: true, deleted: result.rowCount ?? 0 });
};

const handleLike = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>, liked: boolean) => {
  const storyId = str(body.storyId);
  if (!storyId || !deviceKey) return sendError(res, 400, '잘못된 요청이에요.');
  const db = getPool();
  if (liked) {
    await db.query(
      'insert into story_likes (story_id, liker_key) values ($1,$2) on conflict do nothing',
      [storyId, deviceKey],
    );
  } else {
    await db.query('delete from story_likes where story_id = $1 and liker_key = $2', [storyId, deviceKey]);
  }
  res.status(200).json({ ok: true });
};

// ---- image upload (photo) ----
const dataUrlToBuffer = (dataUrl: string): { buffer: Buffer; contentType: string } | null => {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], 'base64'), contentType: match[1] };
};

const inferContentType = (pathname: string) => {
  if (/\.png$/i.test(pathname)) return 'image/png';
  if (/\.jpe?g$/i.test(pathname)) return 'image/jpeg';
  if (/\.webp$/i.test(pathname)) return 'image/webp';
  if (/\.gif$/i.test(pathname)) return 'image/gif';
  return 'application/octet-stream';
};

const handleImage = async (res: VercelResponse, pathname: string) => {
  const token = getBlobToken();
  if (!token || !pathname) {
    res.status(404).json({ ok: false, error: '이미지를 찾을 수 없어요.' });
    return;
  }
  const blob = await get(pathname, { access: 'private', token, useCache: false });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    res.status(404).json({ ok: false, error: '이미지를 찾을 수 없어요.' });
    return;
  }
  const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
  res.setHeader('Content-Type', blob.blob.contentType || inferContentType(pathname));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(buffer);
};

const handleUpload = async (res: VercelResponse, body: Record<string, unknown>) => {
  const token = getBlobToken();
  if (!token) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');
  const dataUrl = str(body.dataUrl);
  const decoded = dataUrlToBuffer(dataUrl);
  if (!decoded) return sendError(res, 400, '이미지 형식이 올바르지 않아요.');
  const ext = decoded.contentType.split('/')[1] || 'png';
  const blob = await put(`stories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, decoded.buffer, {
    access: 'private',
    contentType: decoded.contentType,
    token,
  });
  res.status(200).json({ ok: true, url: blobProxyUrl(blob.pathname), pathname: blob.pathname });
};

type AIFrameDecoration = {
  name: string;
  position: string;
  size: 'tiny' | 'small';
  rotation: number;
};

type AIFramePlan = {
  decorationLevel: number;
  theme: string;
  style: string;
  palette: string[];
  assetPrompt: string;
  decorations: AIFrameDecoration[];
};

const parseJsonObject = <T,>(text: string): T => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON response not found');
    return JSON.parse(match[0]) as T;
  }
};

const postOpenAIJson = async <T,>(
  apiKey: string,
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<T> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error('OpenAI JSON call failed:', response.status, text.slice(0, 1000));
    throw new Error(fallbackError);
  }

  const payload = parseJsonObject<{ choices?: Array<{ message?: { content?: string } }> }>(text);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(fallbackError);
  return parseJsonObject<T>(content);
};

const normalizeAIFramePlan = (plan: Partial<AIFramePlan>, fallbackPrompt: string): AIFramePlan => {
  const decorations = Array.isArray(plan.decorations)
    ? plan.decorations
        .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : null))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .slice(0, 5)
        .map((item, index) => ({
          name: str(item.name) || ['pixel_sparkle', 'pixel_leaf', 'pixel_star'][index % 3],
          position: str(item.position) || ['photo_top_left', 'photo_top_right', 'photo_bottom_left', 'photo_bottom_right'][index % 4],
          size: str(item.size) === 'tiny' ? 'tiny' as const : 'small' as const,
          rotation: Number(item.rotation) || 0,
        }))
    : [
        { name: 'pixel_tiny_sparkle', position: 'photo_top_left', size: 'tiny' as const, rotation: -4 },
        { name: 'pixel_small_leaf', position: 'photo_bottom_left', size: 'small' as const, rotation: 3 },
        { name: 'pixel_small_star', position: 'photo_top_right', size: 'tiny' as const, rotation: 0 },
      ];
  const theme = str(plan.theme) || 'minimal_travel_memory';

  return {
    decorationLevel: 1,
    theme,
    style: str(plan.style) || 'cute_16bit_pixel_sticker',
    palette: Array.isArray(plan.palette) ? plan.palette.map(str).filter(Boolean).slice(0, 4) : ['cream', 'soft_blue', 'sage'],
    assetPrompt: hardenAssetPrompt(
      str(plan.assetPrompt) || fallbackPrompt,
      theme,
      decorations.map((item) => item.name),
    ),
    decorations,
  };
};

const buildAssetPrompt = (theme: string, decorations: string[]) => (
  `Create a transparent PNG sticker overlay asset.\n\n` +
  `Style: cute 16-bit pixel art, retro game sticker, soft pastel Korean travel mood.\n` +
  `Theme: ${theme} travel memory.\n\n` +
  `Generate only small decorative pixel stickers: ${decorations.join(', ')}.\n` +
  `Arrange the stickers near the four corners and edges of the transparent canvas, leaving the center mostly empty.\n\n` +
  `Rules:\n` +
  `- transparent background\n` +
  `- no text\n` +
  `- no Korean text\n` +
  `- no English text\n` +
  `- no letters\n` +
  `- no numbers\n` +
  `- no logo\n` +
  `- no card layout\n` +
  `- no photo\n` +
  `- no people\n` +
  `- no full frame\n` +
  `- no black background\n` +
  `- no large border\n` +
  `- no UI\n` +
  `- no mockup\n` +
  `- no poster\n` +
  `- no title\n` +
  `- no date\n` +
  `- no location label\n\n` +
  `Each sticker should be isolated with transparent spacing. The result must be usable as a small overlay layer on top of an existing travel card photo area.`
);

const hardenAssetPrompt = (draftPrompt: string, theme: string, decorations: string[]) => (
  `${buildAssetPrompt(theme, decorations)}\n\n` +
  `Creative direction from the planning step:\n${draftPrompt}\n\n` +
  `Final hard constraints: generate decoration pixels only. Do not generate any card, photo, person, title, label, Hangul, English letters, numbers, date, UI, mockup, frame border, or background.`
);

const buildAIFramePlan = async (apiKey: string, body: Record<string, unknown>) => {
  const fallback = pickLocalAIFrameTheme(body);
  const fallbackPrompt = buildAssetPrompt(fallback.theme, fallback.decorations);
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
  const metadata = {
    region: str(body.region),
    place: str(body.place) || str(body.location),
    activityTitle: str(body.activityTitle) || str(body.title),
    activityType: str(body.activityType) || str(body.category),
    date: str(body.date),
    visualMood: str(body.visualMood),
    decorationLevel: 1,
  };

  const plan = await postOpenAIJson<Partial<AIFramePlan>>(
    apiKey,
    {
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You create JSON-only transparent sticker asset directions for a Korean travel card app. Return valid JSON only. Never ask for card layout or text. The image model will generate decoration assets only.',
        },
        {
          role: 'user',
          content:
            `입력 메타데이터: ${JSON.stringify(metadata)}\n\n` +
            `투명 배경 픽셀아트 장식 세트 계획을 JSON으로만 작성하세요. 판단 우선순위는 activityTitle, place, region, activityType/category, visualMood, date/season입니다. ` +
            `꾸밈 강도는 1단계입니다. 장식은 사진 영역의 가장자리/모서리에 얹을 작은 스티커 3~5개입니다. ` +
            `이미지 모델은 카드 전체가 아니라 투명 PNG 장식 세트만 생성해야 합니다. 텍스트, 글자, 숫자, 카드 레이아웃, 사진, 사람, 로고, 검정 배경은 절대 생성하지 않습니다. ` +
            `스타일은 cute 16-bit pixel art sticker, retro game decoration입니다. ` +
            `필수 키: theme, style, decorationLevel, palette, assetPrompt, decorations. decorations는 name, position, size, rotation을 가진 객체 배열입니다.`,
        },
      ],
    },
    'AI 프레임 지시서를 만들지 못했어요.',
  );

  return normalizeAIFramePlan(plan, fallbackPrompt);
};

const pickLocalAIFrameTheme = (body: Record<string, unknown>) => {
  const text = [
    str(body.activityTitle),
    str(body.activityType),
    str(body.place),
    str(body.location),
    str(body.region),
    str(body.visualMood),
  ].join(' ').toLowerCase();

  if (/플로깅|정화|쓰레기|해변|바다|광안리|해운대|애월|안목|항구/.test(text)) {
    return {
      theme: /플로깅|정화|쓰레기/.test(text) ? 'beach_cleanup' : 'beach',
      palette: ['soft_blue', 'mint', 'cream'],
      decorations: ['pixel seashell', 'pixel wave', 'pixel sparkle', 'pixel seagull', 'pixel recycle icon'],
    };
  }
  if (/숲|공원|산책|오름|비자림|나무|생태|둘레길/.test(text)) {
    return {
      theme: 'forest',
      palette: ['sage', 'cream', 'soft_green'],
      decorations: ['pixel leaf', 'pixel tiny flower', 'pixel acorn', 'pixel mushroom', 'pixel green sparkle'],
    };
  }
  if (/농촌|마을|텃밭|일손|작물|밭/.test(text)) {
    return {
      theme: 'village',
      palette: ['warm_cream', 'soil_brown', 'soft_green'],
      decorations: ['pixel sprout', 'pixel small basket', 'pixel glove', 'pixel tiny sun', 'pixel soil dot'],
    };
  }
  if (/도서관|전시|문화|안내|책|교육/.test(text)) {
    return {
      theme: 'culture',
      palette: ['cream', 'lavender', 'soft_yellow'],
      decorations: ['pixel bookmark', 'pixel book', 'pixel pencil', 'pixel small ticket', 'pixel tiny star'],
    };
  }
  if (/축제|행사|캠페인|시장|마켓|도시|거리/.test(text)) {
    return {
      theme: 'city_event',
      palette: ['cream', 'soft_purple', 'mint'],
      decorations: ['pixel mini banner', 'pixel ribbon', 'pixel map pin', 'pixel tiny building', 'pixel sparkle'],
    };
  }

  return {
    theme: 'minimal_travel_memory',
    palette: ['cream', 'soft_blue', 'sage'],
    decorations: ['pixel tiny sparkle', 'pixel small leaf', 'pixel small star', 'pixel postcard'],
  };
};

const buildLocalAIFramePlan = (body: Record<string, unknown>): AIFramePlan => {
  const theme = pickLocalAIFrameTheme(body);
  const fallbackPrompt = buildAssetPrompt(theme.theme, theme.decorations);

  return {
    decorationLevel: 1,
    theme: theme.theme,
    style: 'cute_16_bit_pixel_art_sticker',
    palette: theme.palette,
    assetPrompt: fallbackPrompt,
    decorations: theme.decorations.slice(0, 5).map((name, index) => ({
      name: name.replace(/\s+/g, '_'),
      position: ['photo_top_left', 'photo_top_right', 'photo_bottom_left', 'photo_bottom_right', 'photo_edge_right'][index],
      size: index === 0 ? 'small' : 'tiny',
      rotation: [-4, 0, 3, 5, -2][index] ?? 0,
    })),
  };
};

const generateDecorationAsset = async (apiKey: string, prompt: string) => {
  const model = process.env.OPENAI_DECORATION_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size: process.env.OPENAI_DECORATION_IMAGE_SIZE || '1024x1024',
      quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
      background: 'transparent',
      output_format: 'png',
      n: 1,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error('OpenAI decoration generation failed:', response.status, text.slice(0, 1000));
    throw new Error('AI 장식 이미지를 만들지 못했어요.');
  }

  const payload = parseJsonObject<{ data?: Array<{ b64_json?: string; url?: string }> }>(text);
  const imageBase64 = payload.data?.[0]?.b64_json;
  if (imageBase64) return imageBase64;

  const imageUrl = payload.data?.[0]?.url;
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error('AI 장식 이미지를 받지 못했어요.');
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return buffer.toString('base64');
  }

  throw new Error('AI 장식 이미지를 받지 못했어요.');
};

const handleCardGenerate = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return sendError(res, 503, 'AI 프레임 기능이 아직 준비 중이에요. (OPENAI_API_KEY 미설정)');
  const blobToken = getBlobToken();
  if (!blobToken) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');

  const start = Date.now();
  const useChatPlan = process.env.OPENAI_AI_FRAME_USE_CHAT_PLAN !== '0';
  console.log('[card-generate] decoration asset start', { useChatPlan });

  const planStart = Date.now();
  const plan = useChatPlan ? await buildAIFramePlan(apiKey, body) : buildLocalAIFramePlan(body);
  console.log('[card-generate] plan ready', { elapsedMs: Date.now() - planStart, theme: plan.theme });

  const editStart = Date.now();
  const imageBase64 = await generateDecorationAsset(apiKey, plan.assetPrompt);
  console.log('[card-generate] decoration image done', { elapsedMs: Date.now() - editStart });

  const blob = await put(`story-card-decorations/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, Buffer.from(imageBase64, 'base64'), {
    access: 'private',
    contentType: 'image/png',
    token: blobToken,
  });

  const elapsedMs = Date.now() - start;
  if (getConnectionString()) {
    try {
      await getPool().query(
        `insert into story_cards (id, story_id, author_key, template_type, title, subtitle, generated_image_url)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          String(Date.now()),
          str(body.storyId) || String(Date.now()),
          deviceKey || null,
          'ai_decoration_overlay_v1',
          str(body.title) || null,
          `${plan.theme} · level 1`,
          blobProxyUrl(blob.pathname),
        ],
      );
    } catch (error) {
      console.error('story_cards insert failed:', error instanceof Error ? error.message : String(error));
    }
  }

  res.status(200).json({
    ok: true,
    url: blobProxyUrl(blob.pathname),
    elapsedMs,
    plan: {
      decorationLevel: plan.decorationLevel,
      theme: plan.theme,
      decorations: plan.decorations,
    },
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const action = getSingle(req.query.action);
  const method = req.method || 'GET';

  try {
    if (method === 'GET') {
      if (action === 'list') return await handleList(res, getSingle(req.query.key));
      if (action === 'image') return await handleImage(res, getSingle(req.query.path));
      return sendError(res, 400, '알 수 없는 요청이에요.');
    }

    if (method === 'POST') {
      const body = asBody(req);
      const deviceKey = str(body.key);
      switch (action) {
        case 'create':
          return await handleCreate(res, deviceKey, body);
        case 'delete':
          return await handleDeleteStory(res, deviceKey, body);
        case 'comment':
          return await handleComment(res, deviceKey, body);
        case 'comment-delete':
          return await handleCommentDelete(res, deviceKey, body);
        case 'like':
          return await handleLike(res, deviceKey, body, true);
        case 'unlike':
          return await handleLike(res, deviceKey, body, false);
        case 'upload':
          return await handleUpload(res, body);
        case 'card-generate':
          return await handleCardGenerate(res, deviceKey, body);
        default:
          return sendError(res, 400, '알 수 없는 요청이에요.');
      }
    }

    return sendError(res, 405, '지원하지 않는 요청이에요.');
  } catch (error) {
    console.error('api/story error:', { action, message: error instanceof Error ? error.message : String(error) });
    return sendError(res, 500, '요청 처리 중 문제가 생겼어요.');
  }
}
