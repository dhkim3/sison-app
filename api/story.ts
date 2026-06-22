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

// ---- AI card generation (OpenAI Images Edits API, gpt-image-1) ----
const getCardTheme = (activity: string, region: string) => {
  const text = `${activity} ${region}`.toLowerCase();
  if (/바다|해변|해수욕장|플로깅|해양|갯벌|항구|등대/.test(text)) {
    return {
      bg: 'sky-blue and ocean-gradient pastel background',
      decorations: 'pixel-art sun with face (top-left), crabs, seashells, starfish, small waves, palm tree (bottom-left corner), coral, pebbles',
      character: 'a cute pixel-art character in summer clothes holding a trash bag and tongs, standing on a small patch of sand',
    };
  }
  if (/숲|산|공원|산책|오름|비자림|나무|생태/.test(text)) {
    return {
      bg: 'soft green forest-gradient pastel background',
      decorations: 'pixel-art vines along the border, flowers in corners, mushrooms, butterflies, acorns, small birds',
      character: 'a cute pixel-art character in a beige hat holding garden gloves, standing on a patch of grass',
    };
  }
  if (/축제|행사|공연|페스티벌|마켓/.test(text)) {
    return {
      bg: 'warm golden-yellow festive pastel background',
      decorations: 'pixel-art pennant flags along the top, confetti, lanterns, small stage spotlights, sparkle stars',
      character: 'a cute pixel-art character in a colorful outfit waving, surrounded by small confetti',
    };
  }
  if (/도시|골목|마을|시장|거리|문화|관광/.test(text)) {
    return {
      bg: 'soft lavender city-gradient pastel background',
      decorations: 'pixel-art small buildings silhouette along the bottom, lanterns, mini cafe cups, star sparkles',
      character: 'a cute pixel-art character in casual clothes holding a small map, standing in front of a tiny building',
    };
  }
  if (/환경|정화|쓰레기|분리수거|재활용/.test(text)) {
    return {
      bg: 'mint-green eco pastel background',
      decorations: 'pixel-art recycling symbol badges, sprouting seedlings in corners, small leaves, sparkle stars',
      character: 'a cute pixel-art character wearing gloves, holding a trash bag with a recycling mark, standing on green ground',
    };
  }
  return {
    bg: 'warm cream travel pastel background',
    decorations: 'pixel-art vintage stamps in corners, small map pins, compass rose, postmark circles, sparkle stars',
    character: 'a cute pixel-art traveler character with a small backpack, standing and smiling',
  };
};

// Fully composited prompt: the user's source photo is sent as the base image to
// /v1/images/edits and the model must return ONE finished PNG (1024×1536) that
// already contains frame, character, and rendered title/region/date text.
const buildFramePrompt = (
  title: string,
  date: string,
  volunteerActivity: string,
  region: string,
) => {
  const theme = getCardTheme(volunteerActivity, region);
  const safeTitle = title || '시선 여행 카드';
  const safeRegion = region || '한국';
  const safeDate = date || '';
  const safeActivity = volunteerActivity || '봉사 활동';
  return (
    `You are editing the supplied source.png into a collectible TRAVEL CARD (output: 1024×1536 PNG, portrait 2:3).\n` +
    `Treat the source photo as a real photograph and KEEP IT PHOTOGRAPHIC. Only the frame, decorations, character, and text are pixel art.\n` +
    `Return ONE finished image — photo, frame, character, and all readable text baked in.\n` +
    `\n` +
    `=== INPUT PARAMETERS (use the literal strings inside the tags) ===\n` +
    `<TITLE>${safeTitle}</TITLE>\n` +
    `<REGION>${safeRegion}</REGION>\n` +
    `<DATE>${safeDate}</DATE>\n` +
    `<ACTIVITY>${safeActivity}</ACTIVITY>\n` +
    `\n` +
    `=== ZONE LAYOUT (top to bottom; coordinates assume the 1024×1536 canvas) ===\n` +
    `\n` +
    `ZONE A — PHOTO WINDOW (y: 60–1040px, x: 70–954px)\n` +
    `  • Place the source.png photograph here. KEEP IT AS A PHOTOGRAPH — do NOT pixelate, posterize, or re-stylize the people, faces, clothing, or background. Original resolution and colors must be preserved as much as possible.\n` +
    `  • Cover/letterbox the photo to fill the window; the people and the main subject stay clearly visible and uncovered.\n` +
    `  • Allowed: a thin pixel-art double border (outer 3px, inner 1px) hugging the photo window edge.\n` +
    `\n` +
    `ZONE B — DECORATIVE FRAME (the strip surrounding Zone A on all four sides)\n` +
    `  • Background: ${theme.bg}, solid fill.\n` +
    `  • Pixel-art motifs appropriate to <ACTIVITY>: ${theme.decorations}. Scatter them along the four sides and into the corners.\n` +
    `  • OVERLAP IS ENCOURAGED: a few motifs (leaves, waves, sparkles, small props, etc.) may extend a short distance INTO the photo edges — roughly the outer 60px on each side. Use them sparingly to blend frame and photo organically.\n` +
    `  • DO NOT cover the central subject(s) — keep faces, hands, and the main action of the photo completely unobstructed.\n` +
    `\n` +
    `ZONE C — CHARACTER STRIP (y: 1040–1220px, full width)\n` +
    `  • Background: solid warm-cream (#f5ecd9).\n` +
    `  • Add ONE cute pixel-art character on the LEFT half. Max height 150px.\n` +
    `  • CHARACTER PERSONALIZATION (priority rule): If source.png contains one or more visible people, model the pixel-art character after ONE of them — pick the most prominent person and mirror their visible traits: hair length & color, skin tone, hat/cap if any, top color, bottom color, and the prop they are holding (e.g. a trash bag, gloves, tongs). Keep the chibi-style cute pixel-art look (large head, friendly smile) — do NOT attempt photographic likeness, just clear visual cues that say "this is the person from the photo".\n` +
    `  • If source.png has no clearly visible person, fall back to this default for <ACTIVITY>: ${theme.character}.\n` +
    `  • The character or a small prop it holds MAY peek slightly above y=1040 into the lower edge of the photo (up to ~40px), as long as it does not cover faces or the central action.\n` +
    `  • Sprinkle 2–3 tiny motifs from ${theme.decorations} on the right side of the strip.\n` +
    `\n` +
    `ZONE D — TEXT PANEL (y: 1220–1460px, full width)\n` +
    `  • Background: solid cream-white (#faf5ee).\n` +
    `  • Render EXACTLY the following three lines as CRISP PIXEL-FONT TEXT, left-aligned with 60px left padding, dark slate color (#2a2a2a). Use the EXACT strings from the tags above — do not translate, paraphrase, shorten, or skip any of them.\n` +
    `      Line 1 (y≈1245, ~44px tall, bold): <TITLE> contents.\n` +
    `      Line 2 (y≈1330, ~28px tall, regular): a small pin glyph "📍" then <REGION> contents.\n` +
    `      Line 3 (y≈1395, ~28px tall, regular): a small calendar glyph "🗓" then <DATE> contents. THIS LINE IS MANDATORY — the date MUST always appear, even if it is short. Never omit it.\n` +
    `  • All three lines must appear. Text must be perfectly readable — no overlapping decorations behind the letters.\n` +
    `\n` +
    `ZONE E — BOTTOM SIGNATURE (y: 1460–1536px, full width)\n` +
    `  • At y≈1470 draw ONE thin horizontal pixel-art guideline (1–2px tall, full width minus 80px margin on each side, color #cfc6b8).\n` +
    `  • Below that line, centered horizontally at roughly y≈1500, render the Korean word "시선" in a small pixel font (~26px tall, color #6f6f6f).\n` +
    `\n` +
    `CRITICAL RULES (violating any = failure):\n` +
    `  1. The photo inside Zone A remains a real photograph — NEVER pixelated, posterized, painted, or re-rendered. People's faces and the scene must look exactly like the source.\n` +
    `  2. Pixel-art elements (frame motifs, character props) may intrude into the outer edges of the photo, but must NEVER cover faces, hands, or the central subject of the photo.\n` +
    `  3. Render <TITLE>, <REGION>, <DATE>, and the word "시선" as actual readable text in the final PNG. All four must appear. <DATE> in particular must never be skipped or replaced with a blank line.\n` +
    `  4. The only text in the entire image is: <TITLE>, <REGION>, <DATE>, and "시선". No other words, numbers, watermarks, or logos.\n` +
    `  5. When the source photo shows a person, the pixel character in Zone C is a chibi-style portrait of them (matching hair/clothing colors and held prop) — not a generic mascot.\n` +
    `  6. Output is a single fully-opaque PNG at 1024×1536 — no transparent regions, no separate layers.\n` +
    `\n` +
    `STYLE: Photographic central subject + 16-bit pixel-art frame/character/text (Animal Crossing / Stardew Valley aesthetic). Soft pastel palette around the photo. Calm Korean travel-app mood.`
  );
};

const handleCardGenerate = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendError(res, 503, 'AI 카드 기능이 아직 준비 중이에요. (OPENAI_API_KEY 미설정)');
  const blobToken = getBlobToken();
  if (!blobToken) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');

  // 원본 사진을 OpenAI Images Edits API(/v1/images/edits)에 그대로 전달해
  // 프레임·캐릭터·제목/지역/날짜 텍스트가 모두 합성된 단일 PNG를 받아 온다.
  const dataUrl = str(body.dataUrl) || str(body.imageDataUrl) || str(body.sourceDataUrl);
  const decoded = dataUrlToBuffer(dataUrl);
  if (!decoded) return sendError(res, 400, '원본 사진을 보내주세요. (dataUrl 누락)');

  const title = str(body.title);
  const date = str(body.date);
  const region = str(body.region);
  const volunteerActivity = str(body.volunteerActivity) || str(body.activity);

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const prompt = buildFramePrompt(title, date, volunteerActivity, region);

  // multipart/form-data: image + prompt + model + size + quality + n.
  // Node 18+ / Vercel 런타임이 FormData/Blob을 글로벌로 제공한다.
  const form = new FormData();
  const ext = decoded.contentType.split('/')[1] || 'png';
  form.append('image', new Blob([new Uint8Array(decoded.buffer)], { type: decoded.contentType }), `source.${ext}`);
  form.append('prompt', prompt);
  form.append('model', model);
  form.append('size', '1024x1536');
  form.append('quality', 'high');
  form.append('n', '1');

  const start = Date.now();
  let openaiResponse: Response;
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (error) {
    console.error('OpenAI request failed:', error instanceof Error ? error.message : String(error));
    return sendError(res, 502, 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  const payloadText = await openaiResponse.text();
  if (!openaiResponse.ok) {
    console.error('OpenAI error:', openaiResponse.status, payloadText.slice(0, 1000));
    let openaiMsg = '';
    try { openaiMsg = (JSON.parse(payloadText) as { error?: { message?: string } }).error?.message ?? ''; } catch { /* ignore */ }
    return sendError(res, 502, openaiMsg || 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  let imageBase64 = '';
  try {
    const payload = JSON.parse(payloadText) as { data?: Array<{ b64_json?: string }> };
    imageBase64 = payload.data?.[0]?.b64_json ?? '';
  } catch {
    imageBase64 = '';
  }
  if (!imageBase64) {
    console.error('OpenAI returned no image. body:', payloadText.slice(0, 500));
    return sendError(res, 502, 'AI 카드 이미지를 받지 못했어요.');
  }

  const blob = await put(`story-cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, Buffer.from(imageBase64, 'base64'), {
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
          str(body.templateType) || 'ai',
          str(body.title) || null,
          str(body.subtitle) || null,
          blobProxyUrl(blob.pathname),
        ],
      );
    } catch (error) {
      console.error('story_cards insert failed:', error instanceof Error ? error.message : String(error));
    }
  } else {
    console.warn('story_cards insert skipped: POSTGRES_URL/DATABASE_URL is not configured');
  }

  console.log(`[card-generate] done in ${elapsedMs}ms`);
  res.status(200).json({ ok: true, url: blobProxyUrl(blob.pathname), elapsedMs });
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
