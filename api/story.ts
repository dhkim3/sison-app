import { put } from '@vercel/blob';
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
  setHeader: (name: string, value: string) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

// ---- DB pool (module-scoped, reused across invocations) ----
let pool: pg.Pool | null = null;
const getPool = () => {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error('POSTGRES_URL이 설정되지 않았어요.');
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
};

const getBlobToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim();

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
  const db = getPool();
  const [storiesResult, commentsResult, likesResult] = await Promise.all([
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
    isMine: Boolean(deviceKey) && row.author_key === deviceKey,
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

  res.status(200).json({ ok: true, stories, comments, likeCounts, likedStoryIds });
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
  const result = await db.query('delete from stories where id = $1 and author_key = $2', [id, deviceKey]);
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

const handleUpload = async (res: VercelResponse, body: Record<string, unknown>) => {
  const token = getBlobToken();
  if (!token) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');
  const dataUrl = str(body.dataUrl);
  const decoded = dataUrlToBuffer(dataUrl);
  if (!decoded) return sendError(res, 400, '이미지 형식이 올바르지 않아요.');
  const ext = decoded.contentType.split('/')[1] || 'png';
  const blob = await put(`stories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, decoded.buffer, {
    access: 'public',
    contentType: decoded.contentType,
    token,
  });
  res.status(200).json({ ok: true, url: blob.url });
};

// ---- AI card generation (OpenAI Responses API, image_generation tool) ----
const buildCardPrompt = (activity: string, region: string) =>
  `Soft editorial Korean travel keepsake card. Keep the uploaded photo as the focal framed image. ` +
  `If people are clearly present in the photo, add cute 16-bit pixel-art characters of them doing ${activity || 'a volunteer activity'} ` +
  `at ${region || 'the location'}; otherwise add ${activity || 'volunteer'}-themed pixel-art decorations around the photo. ` +
  `Calm seaside/landmark motifs, pastel palette, gentle, no text, no logos.`;

const handleCardGenerate = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendError(res, 503, 'AI 카드 기능이 아직 준비 중이에요. (OPENAI_API_KEY 미설정)');
  const blobToken = getBlobToken();
  if (!blobToken) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');

  const photoUrl = str(body.photoUrl);
  if (!photoUrl) return sendError(res, 400, '카드로 만들 사진이 필요해요.');
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-5-mini';
  const prompt = buildCardPrompt(str(body.activity), str(body.region));

  const start = Date.now();
  let openaiResponse: Response;
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: photoUrl },
            ],
          },
        ],
        tools: [{ type: 'image_generation' }],
      }),
    });
  } catch (error) {
    console.error('OpenAI request failed:', error instanceof Error ? error.message : String(error));
    return sendError(res, 502, 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  const payloadText = await openaiResponse.text();
  if (!openaiResponse.ok) {
    console.error('OpenAI error:', openaiResponse.status, payloadText.slice(0, 500));
    return sendError(res, 502, 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  let imageBase64 = '';
  try {
    const payload = JSON.parse(payloadText) as { output?: Array<{ type?: string; result?: string }> };
    const imageCall = (payload.output || []).find((item) => item.type === 'image_generation_call' && item.result);
    imageBase64 = imageCall?.result ?? '';
  } catch {
    imageBase64 = '';
  }
  if (!imageBase64) {
    console.error('OpenAI returned no image. body:', payloadText.slice(0, 500));
    return sendError(res, 502, 'AI 카드 이미지를 받지 못했어요.');
  }

  const blob = await put(`story-cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, Buffer.from(imageBase64, 'base64'), {
    access: 'public',
    contentType: 'image/png',
    token: blobToken,
  });

  const elapsedMs = Date.now() - start;
  try {
    await getPool().query(
      `insert into story_cards (id, story_id, author_key, template_type, title, subtitle, generated_image_url)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        String(Date.now()),
        str(body.storyId) || null,
        deviceKey || null,
        str(body.templateType) || 'ai',
        str(body.title) || null,
        str(body.subtitle) || null,
        blob.url,
      ],
    );
  } catch (error) {
    console.error('story_cards insert failed:', error instanceof Error ? error.message : String(error));
  }

  console.log(`[card-generate] done in ${elapsedMs}ms`);
  res.status(200).json({ ok: true, url: blob.url, elapsedMs });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const action = getSingle(req.query.action);
  const method = req.method || 'GET';

  try {
    if (method === 'GET') {
      if (action === 'list') return await handleList(res, getSingle(req.query.key));
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
