import { get, put } from '@vercel/blob';
import { Buffer } from 'node:buffer';
import { deflateSync, inflateSync } from 'node:zlib';
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
      `select id, story_id, template_type, title, subtitle, generated_image_url, created_at
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
    frameType: str(row.template_type) === 'ai' ? 'AI' : str(row.template_type),
    cardPreviewDataUrl: str(row.generated_image_url),
    finalCardImageUrl: str(row.generated_image_url),
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
  res.status(200).json({
    ok: true,
    story: {
      id: Number(id),
      title,
      region: str(story.region) || '',
      city: str(story.city) || undefined,
      location: str(story.location) || undefined,
      author: str(story.authorName) || str(story.author) || '여행자',
      authorName: str(story.authorName) || str(story.author) || '여행자',
      body: str(story.body) || str(story.content) || '',
      content: str(story.body) || str(story.content) || '',
      imageUrl: str(story.imageUrl) || '',
      activityTitle: str(story.activityTitle) || undefined,
      activityDate: str(story.activityDate) || undefined,
      createdAt: '방금 전',
      likes: 0,
      comments: 0,
      isMine: true,
    },
  });
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

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const makePngChunk = (type: string, data: Buffer) => {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
};

const paethPredictor = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

const normalizeOverlayPngTransparency = (png: Buffer) => {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return png;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > png.length) return png;
    const data = png.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      const interlace = data[12];
      if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0 || ![2, 6].includes(colorType)) {
        return png;
      }
    } else if (type === 'IDAT') {
      idatChunks.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || !idatChunks.length) return png;

  const channels = colorType === 6 ? 4 : 3;
  const bytesPerPixel = channels;
  const scanlineLength = width * channels;
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(idatChunks));
  } catch {
    return png;
  }
  if (inflated.length < (scanlineLength + 1) * height) return png;

  const rgba = Buffer.alloc(width * height * 4);
  const previous = Buffer.alloc(scanlineLength);
  const current = Buffer.alloc(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (scanlineLength + 1);
    const filterType = inflated[rowOffset];
    const raw = inflated.subarray(rowOffset + 1, rowOffset + 1 + scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      const value = raw[x];
      switch (filterType) {
        case 0:
          current[x] = value;
          break;
        case 1:
          current[x] = (value + left) & 0xff;
          break;
        case 2:
          current[x] = (value + up) & 0xff;
          break;
        case 3:
          current[x] = (value + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          current[x] = (value + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          return png;
      }
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      const r = current[source];
      const g = current[source + 1];
      const b = current[source + 2];
      const a = colorType === 6 ? current[source + 3] : 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const looksLikeCheckerboard = min >= 210 && max - min <= 24;
      const looksLikeWhiteMatte = min >= 238 && max - min <= 36;

      rgba[target] = r;
      rgba[target + 1] = g;
      rgba[target + 2] = b;
      rgba[target + 3] = a < 16 || looksLikeCheckerboard || looksLikeWhiteMatte ? 0 : a;
    }

    previous.set(current);
  }

  const rawRgba = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    rawRgba[rowOffset] = 0;
    rgba.copy(rawRgba, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', deflateSync(rawRgba)),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
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

const handleCardSave = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const blobToken = getBlobToken();
  if (!blobToken) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');
  if (!getConnectionString()) return sendError(res, 500, '카드 저장 DB가 설정되지 않았어요.');

  const dataUrl = str(body.cardPreviewDataUrl) || str(body.finalCardImageUrl) || str(body.dataUrl);
  const decoded = dataUrlToBuffer(dataUrl);
  if (!decoded) return sendError(res, 400, '저장할 카드 이미지를 보내주세요.');

  const frameType = str(body.frameType) || '기본';
  const storyId = str(body.storyId);
  const cardId = str(body.id) || String(Date.now());
  const title = str(body.title) || '여행 카드';
  const subtitle = str(body.subtitle) || str(body.region) || '';
  const ext = decoded.contentType.split('/')[1] || 'png';
  const blob = await put(
    `story-cards/final-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
    decoded.buffer,
    {
      access: 'private',
      contentType: decoded.contentType,
      token: blobToken,
    },
  );
  const finalCardUrl = blobProxyUrl(blob.pathname);

  const db = getPool();
  if (storyId) {
    await db.query('delete from story_cards where story_id = $1', [storyId]);
  }
  await db.query(
    `insert into story_cards (id, story_id, author_key, template_type, title, subtitle, generated_image_url)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      cardId,
      storyId || null,
      deviceKey || null,
      frameType === 'AI' ? 'ai' : frameType,
      title,
      subtitle,
      finalCardUrl,
    ],
  );

  res.status(200).json({
    ok: true,
    card: {
      id: Number(cardId),
      storyId: storyId ? Number(storyId) : null,
      title,
      subtitle,
      imageUrl: finalCardUrl,
      frameType,
      cardPreviewDataUrl: finalCardUrl,
      finalCardImageUrl: finalCardUrl,
      createdAt: new Date().toISOString(),
    },
  });
};

// ---- AI card generation (OpenAI Images Edits API, gpt-image-1) ----
const getCardTheme = (activity: string, region: string) => {
  const text = `${activity} ${region}`.toLowerCase();
  if (/바다|해변|해수욕장|플로깅|해양|갯벌|항구|등대/.test(text)) {
    return {
      bg: 'sky-blue and ocean-gradient pastel background',
      decorations: 'pixel-art sun with face (top-left), crabs, seashells, starfish, small waves, palm leaves on right-side corners, coral, pebbles',
      character: 'a small complete pixel-art character in summer clothes holding a trash bag and tongs, placed near the right card edge without being cropped',
    };
  }
  if (/숲|산|공원|산책|오름|비자림|나무|생태/.test(text)) {
    return {
      bg: 'soft green forest-gradient pastel background',
      decorations: 'pixel-art vines along the border, flowers in corners, mushrooms, butterflies, acorns, small birds',
      character: 'a small complete pixel-art character in a beige hat holding garden gloves, placed near the right card edge without being cropped',
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
      character: 'a small complete pixel-art character wearing gloves and holding a trash bag with a recycling mark, placed near the right card edge without being cropped',
    };
  }
  return {
    bg: 'warm cream travel pastel background',
    decorations: 'pixel-art vintage stamps in corners, small map pins, compass rose, postmark circles, sparkle stars',
    character: 'a cute pixel-art traveler character with a small backpack, standing and smiling',
  };
};

const buildFrameBasePrompt = (
  volunteerActivity: string,
  region: string,
  layer: 'background' | 'overlay',
) => {
  const theme = getCardTheme(volunteerActivity, region);
  const safeActivity = volunteerActivity || '봉사 활동';
  const layerInstructions = layer === 'background'
    ? (
      `=== BACKGROUND FRAME LAYER ===\n` +
      `Create the full-card background frame that will sit BELOW the original photo.\n` +
      `This layer owns only the card outer frame, subtle card color, light texture, and small decorative border motifs.\n` +
      `Do not create foreground objects, second photo frames, or visual elements that need to cover the photo.\n` +
      `Do not create a separate illustrated scene, landscape, environment, beach, forest, city, or decorative world beneath the photo.\n` +
      `Keep the lower card area visually calm. Use subtle texture and sparse small accents only, not a storytelling scene.\n` +
      `Keep the PHOTO AREA visually ready for the client-rendered original photo: no smaller photo window, no inner placeholder, no matte, no fake photo.\n`
    )
    : (
      `=== DECORATION OVERLAY LAYER ===\n` +
      `Create a transparent PNG decoration layer only. This layer is composited at card level with an edge-only mask above the original photo.\n` +
      `Transparent means real alpha transparency. Do not draw a checkerboard transparency preview, gray-and-white squares, matte, canvas background, or any visible placeholder for transparent areas.\n` +
      `Only discrete corner and edge-contact areas of this overlay may appear above the photo; the center and broad interior of the photo will remain untouched.\n` +
      `The overlay must create visible pop-out moments over the photo edge. Do not keep the overlay safely outside the photo.\n` +
      `Therefore this layer must use independent edge ornaments, not full frames, borders, or surfaces over the photo.\n` +
      `Do not create a separate illustrated scene, landscape, environment, beach, forest, city, or decorative world beneath the photo.\n` +
      `Do not create foreground/background storytelling elements. The overlay is not a scene; it is small boundary decoration.\n` +
      `Do not recreate, repaint, extend, mask, crop, cover, or replace any part of the source photo.\n` +
      `The overlay must be mostly transparent and contain ONLY small edge ornaments that connect the photo to the frame.\n` +
      `Use only small edge ornaments such as tiny flowers, leaves, grass tips, clouds, waves, sand grains, stars, small objects, or small parts of a character. Do not create background surfaces.\n` +
      `Good overlap candidates include a cute crab claw or shell touching the lower photo edge, palm leaves entering from the upper-right or right photo edge, sun rays or small clouds peeking across the top photo edge, and a tiny partially hidden character hat/hand/tool crossing the lower-right or side edge.\n` +
      `Include at least 3 clearly visible edge-crossing accents: one near the top photo edge, one near the right or upper-right photo edge, and one near the lower photo edge.\n` +
      `Keep at least 88% of the entire canvas transparent.\n` +
      `The center and broad interior of the PHOTO AREA must remain fully transparent and unobstructed.\n` +
      `Lower-right and lower-edge contact zones may contain sparse pop-out accents. Do not cover any broad or rectangular portion of the photo.\n` +
      `Do not create any large filled area, panel, fog, haze, gradient block, sand block, water block, white block, or mask over the photo.\n` +
      `Selected decorative accents must visibly overlap the photo boundary.\n` +
      `Decorative elements are encouraged to cross the photo edge naturally.\n` +
      `Some foreground decorative elements may extend 10–18% into the photo area.\n` +
      `This overlap should be clearly visible, intentional, and playful, as if the frame and photo are part of the same world.\n` +
      `Do not keep all decorations outside the photo. Small decorative elements may partially enter the photo boundary.\n` +
      `Any overlap into the photo must be limited to discrete edge contacts, approximately 10–18% into the photo area, while keeping the center clean.\n` +
      `Do not generate any frame, border, outline, rectangle, box, guide line, decorative line, vertical line, horizontal line, corner line, or photo outline inside the photo area.\n` +
      `Do not generate horizontal or vertical white lines over the photo. Do not generate frame lines inside the photo. Do not create a new photo frame border on top of the photo.\n` +
      `Do not create a second frame around the photo. The photo must remain visually borderless.\n` +
      `Decorative elements may touch the photo boundary, but must never form a line or frame.\n` +
      `Any decoration crossing into the photo must appear as independent objects, never as borders or outlines.\n` +
      `Do not place decoration in a continuous path along the photo edge. Avoid edge-following strokes, connected corner marks, line-like ornament chains, or anything that reads as a complete border.\n` +
      `Do not place dense ornaments on the left or right edges of the photo.\n` +
      `Do not use side ornaments that visually squeeze or shrink the photo.\n` +
      `Keep the left and right photo boundary clean and calm.\n` +
      `Any overlap into the photo must be visible but sparse, and must not reduce the perceived photo size.\n` +
      `Do not place large decorative objects inside the photo. Only small foreground decorative elements may cross the boundary.\n` +
      `Large elements such as a full palm tree, full character body, large sun, or large crab must stay outside the photo, but small parts of them may cross the photo boundary.\n` +
      `Every decorative element must be fully completed. Do not generate unfinished, cropped, half-generated, faded, blurry, or artifact-like objects.\n` +
      `Prefer fewer high-quality decorative accents over many decorations. If an object cannot fit naturally, remove it completely.\n` +
      `Do not cover faces, hands, main subjects, or the lower-left text area.\n` +
      `Do not include any background fill, full-card color wash, text panel, logo, captions, letters, numbers, dates, straight border lines, or white panel lines.\n` +
      `Transparent empty space must be alpha=0 pixels, not visible white, gray, or checkerboard pixels.\n` +
      `The overlay should never look like a cover layer placed on the photo.\n`
    );
  const frameContentInstructions = layer === 'background'
    ? (
      `=== FRAME CONTENT FOR BACKGROUND LAYER ===\n` +
      `  • Background mood: ${theme.bg}.\n` +
      `  • Use only subtle card color, soft texture, and tiny low-contrast motifs near the card outer edge.\n` +
      `  • Do not draw characters, people, animals, crabs, large shells, large plants, large palm trees, suns, clouds, waves, coral, or other foreground objects.\n` +
      `  • Do not draw any object that should appear on top of the photo. Those belong only in the overlay layer.\n` +
      `  • Do not place objects behind the photo that would be cut off by the client-rendered photo layer.\n` +
      `  • Keep the lower text area calm and readable with subtle themed color, soft texture, and sparse tiny motifs only.\n` +
      `  • Do not create ground, water, grassland, skyline, beach, forest, city, or any other scene beneath the photo.\n` +
      `  • Do not create a character stage, illustrated environment, decorative landscape, or second image below the photo.\n` +
      `  • Do not create white vertical lines, white horizontal lines, rectangular guide lines, or straight frame strokes on top of the photo.\n` +
      `  • Do not generate horizontal lines, divider lines, dotted horizontal lines, underlines, border lines under the logo, text box lines, or UI separator lines.\n`
    )
    : (
      `=== FRAME CONTENT FOR OVERLAY LAYER ===\n` +
      `  • Pixel-art motifs appropriate to <ACTIVITY>: ${theme.decorations}.\n` +
      `  • Optional cute pixel-art character: ${theme.character}. Place it only in the lower-right/right-center overlay zone, fully complete and uncropped, with only a small part such as a hat, hand, tool, or shoulder crossing the photo edge.\n` +
      `  • Do not put a full character body inside the photo. Do not show only legs, half bodies, cropped heads, or cut-off props.\n` +
      `  • Keep the user's photo as the visual hero. The frame is a decorative border, not a new illustrated world.\n` +
      `  • The overlay must visibly pop over the photo boundary in a few places while staying sparse and high quality.\n` +
      `  • Small foreground decorative elements may partially enter the photo boundary by 10–18% in an intentional, playful way.\n` +
      `  • For beach frames, let cute elements such as crab claws, shells, starfish tips, wave foam, palm leaves, sun rays, or a small partially hidden character overlap the photo edge.\n` +
      `  • At least three accents should clearly pop over the photo edge while keeping the design uncluttered: top sun/cloud accent, right palm/leaf accent, and lower crab/shell/character accent.\n` +
      `  • Some motifs may appear to touch the photo edge and continue slightly outward into the frame, creating a light boundary connection only.\n` +
      `  • Do not create ground, water, grassland, skyline, beach, forest, city, or any other scene beneath the photo.\n` +
      `  • Do not place characters, large trees, large mushrooms, or large objects in the lower-left text protection area.\n` +
      `  • Do not place coral, crabs, shells, plants, characters, or other medium/large objects that touch or are clipped by the left card edge behind the text.\n` +
      `  • The lower-left text area may contain only tiny, pale accents, soft texture, or very low-contrast patterns such as small flowers, leaves, shells, stars, or dots, and only if they do not overlap text.\n` +
      `  • Keep the lower-left text area clean and readable. Do not place dark or busy background decoration behind title, location, date, or logo.\n` +
      `  • Do not create continuous horizontal bands, large opaque shapes, or panel-like overlays across the bottom of the photo. The original photo must remain clearly visible inside the photo area.\n` +
      `  • Do not create unfinished objects, cropped decorative fragments, half-generated objects, faded object remnants, blurry placeholder shapes, random artifacts, or visual clutter.\n` +
      `  • Prefer fewer high-quality decorative elements over many decorations. If an object cannot fit naturally, remove it completely.\n` +
      `  • Do not create white vertical lines, white horizontal lines, rectangular guide lines, or straight frame strokes on top of the photo. Connect the photo and frame with decorative objects only.\n` +
      `  • Do not generate horizontal lines, divider lines, dotted horizontal lines, underlines, border lines under the logo, text box lines, or UI separator lines.\n`
    );
  return (
    `You are creating a decorative AI frame PNG for a Korean travel memory card.\n` +
    `Use the supplied source.png ONLY as visual reference for mood, colors, season, and activity context.\n` +
    `Do not reproduce, redraw, crop, edit, stylize, or include the source photo in the output.\n` +
    `The client will composite the final card with the original untouched photo and React-rendered text.\n` +
    `\n` +
    `=== CONTEXT ===\n` +
    `<ACTIVITY>${safeActivity}</ACTIVITY>\n` +
    `\n` +
    `=== OUTPUT ===\n` +
    `Return ONE 1024×1536 portrait PNG for the requested layer only.\n` +
    `For overlay layer requests, transparent PNG is mandatory. For background layer requests, transparent or soft background PNG is acceptable.\n` +
    `The client will reveal the overlay above the photo only through sparse corner/edge mask zones. Do not put important decoration in the center of the photo area.\n` +
    `If transparency is unavailable, use a soft background PNG with the same safe empty regions.\n` +
    `The generated image must never replace the original photo. The original photo will always be rendered by the client as a separate layer above this frame/background.\n` +
    `Do not create a sticker sheet, repeated panels, nested frames, inner preview boxes, tiled frame strips, or multiple copies of the same frame.\n` +
    `\n` +
    `=== PRIMARY COMPOSITION RULES ===\n` +
    `The uploaded photo is the primary content.\n` +
    `The photo must remain visually dominant.\n` +
    `The frame exists only to enhance the photo.\n` +
    `Do not create a separate illustrated scene.\n` +
    `Do not create a second environment.\n` +
    `Do not create a decorative landscape.\n` +
    `Do not create a decorative beach scene.\n` +
    `Do not create a decorative forest scene.\n` +
    `Do not create a decorative city scene.\n` +
    `Do not create a decorative world beneath the photo.\n` +
    `Do not create foreground and background storytelling elements.\n` +
    `The frame is not a scene.\n` +
    `The frame is not an illustration.\n` +
    `The frame is not a landscape.\n` +
    `The frame is a decorative border.\n` +
    `Decorations should stay close to the photo boundary.\n` +
    `Decorations should stay close to the outer card edge.\n` +
    `The active decoration zone is limited to approximately 10–20% around the photo edges and card outer edges.\n` +
    `Decorative elements should cluster around photo boundaries rather than occupy large card areas.\n` +
    `The center of the card must remain visually clean.\n` +
    `The user should first notice the photo, then the title, then the decorative details.\n` +
    `If the decoration becomes a scene, a landscape, a large environment, or a second image beneath the photo, the result is invalid and must be regenerated.\n` +
    `\n` +
    layerInstructions +
    `\n` +
    `=== SAFE COMPOSITION LAYOUT (coordinates assume 1024×1536 canvas) ===\n` +
    `PHOTO AREA: x=55–969, y=55–1110. The client will place the original photo here at the normal card size. Do not create extra blank space for decoration.\n` +
    `Do not draw an inner photo placeholder, smaller photo window, matte, border box, or empty margin that makes the photo area look reduced.\n` +
    `The source photo is the main content and must remain large.\n` +
    `Do not shrink, resize, crop, reposition, or reduce the visible photo area.\n` +
    `Do not create extra side decoration space by making the photo smaller.\n` +
    `The photo must keep the same layout size and placement as the original card preview.\n` +
    `PHOTO EDGE OVERLAP: Small foreground decorative elements are allowed and encouraged to cross 10–18% into the photo boundary. This should connect the photo and frame naturally without covering important content.\n` +
    `Preferred edge interactions: sun rays or a small cloud at the top edge, palm leaves from the upper-right/right edge, a crab claw/shell/wave foam at the lower edge, and a partially hidden character hand/hat/tool peeking from the lower-right or side edge.\n` +
    `The pop-out effect should be noticeable like a premium travel sticker frame: decorative accents visibly sit on top of the photo edge, but remain sparse and high quality.\n` +
    `PHOTO BOTTOM EDGE: Allow selected small objects to overlap the bottom photo edge by about 10–18%. Do not cover the lower photo with a wide sand/water/ground band or any large opaque panel.\n` +
    `LOWER TEXT AREA: x=55–969, y=1120–1536. This area contains the title, location, date, and Sison logo. Keep it clean and decorative, not a separate illustrated scene.\n` +
    `LOWER-LEFT TEXT PROTECTION AREA: x=55–620, y=1120–1536. Keep the actual text clean and readable with low-contrast texture only behind it.\n` +
    `Do not create a separate white box, white card, white panel, or large white overlay behind the text.\n` +
    `Text will be placed directly on top of the frame background. Only a very subtle transparent glass effect of 10–20% opacity is acceptable if absolutely needed.\n` +
    `LOWER-LEFT EDGE SAFETY: do not place cropped or partially cut-off objects along the left or bottom edge inside the lower-left text protection area.\n` +
    `LEFT/RIGHT PHOTO SIDES: keep both side boundaries visually calm. Do not place dense decorative objects along the left or right sides of the photo.\n` +
    `Side areas may use only subtle background color, soft texture, or gentle atmosphere.\n` +
    `DECORATION FOCUS AREAS: concentrate sparse decorative accents near the photo boundary, photo corners, and card outer margins. Do not use side decoration to squeeze the photo.\n` +
    `SIGNATURE AREA: x=55–969, y=1465–1536. Keep this area free of logos and text-like marks.\n` +
    `DECORATION AREA: card outer edges, photo corners, photo border, and right side of the card.\n` +
    `\n` +
    frameContentInstructions +
    `\n` +
    `IMPORTANT:\n` +
    `Do not generate any text.\n` +
    `Do not generate letters.\n` +
    `Do not generate numbers.\n` +
    `Do not generate dates.\n` +
    `Do not generate captions.\n` +
    `Do not generate logos.\n` +
    `Do not generate title areas.\n` +
    `Do not generate inner photo frames, duplicate frame boxes, repeated frame tiles, or a sticker-sheet layout.\n` +
    `Do not make the photo area look smaller than the client-rendered original photo.\n` +
    `Do not shrink, resize, crop, reposition, or reduce the visible photo area.\n` +
    `Do not create extra side decoration space by making the photo smaller.\n` +
    `Do not create a separate illustrated scene.\n` +
    `Do not create a second environment.\n` +
    `Do not create a decorative landscape, beach scene, forest scene, city scene, or decorative world beneath the photo.\n` +
    `Do not create foreground and background storytelling elements.\n` +
    `The frame is a decorative border, not a scene, illustration, landscape, or second image.\n` +
    `The active decoration zone is limited to approximately 10–20% around the photo edges and card outer edges.\n` +
    `Decorative elements should cluster around photo boundaries rather than occupy large card areas.\n` +
    `The center of the card must remain visually clean.\n` +
    `Do not place dense decorative objects along the left or right sides of the photo.\n` +
    `Left and right sides of the photo should remain visually calm with only subtle background color, soft texture, or gentle atmosphere.\n` +
    `Decorations should stay close to the photo boundary and card outer edge instead of filling the lower text/background area.\n` +
    `Do not generate horizontal lines, divider lines, dotted lines, underlines, or separator lines around the text area or under the logo.\n` +
    `Do not generate white vertical lines, white horizontal lines, straight border strokes, or panel guide lines inside the photo area.\n` +
    `Do not generate a broad overlay band across the lower part of the photo. Photo-edge decoration must stay sparse and light so the original photo remains visible.\n` +
    `Do not replace, cover, redraw, or hide the original photo.\n` +
    `Do not make the photo and frame look like two separated boxes.\n` +
    `Do not create a plain white lower text panel.\n` +
    `Do not create any separate white box, card, panel, or overlay behind the text.\n` +
    `If readability support is needed, use only a very weak transparent glass effect at 10–20% opacity, never a large opaque white layer.\n` +
    `Make the lower text area a calm decorative card area while keeping all React-rendered text readable. Do not turn it into a new illustrated scene.\n` +
    `Do not place all decorations only in the outer frame area.\n` +
    `The frame should lightly connect to the photo boundary without becoming a separate world.\n` +
    `The frame should feel alive and interact with the photo.\n` +
    `The photo and frame should not feel completely separated.\n` +
    `Selected decorative accents must visibly overlap the photo boundary.\n` +
    `Decorative elements are encouraged to cross the photo edge naturally.\n` +
    `Place large decorative elements mainly on the right side of the card.\n` +
    `Keep the lower-left text area clean and readable.\n` +
    `Do not place characters or large objects behind or over the title, location, date, or logo.\n` +
    `Do not place clipped or edge-cut decorative objects in the lower-left text area.\n` +
    `Small decorative elements may appear near the lower-left area only if they do not overlap the text.\n` +
    `Decorative elements may overlap the photo edge by 10–18%, but must not cover faces, people, or main subjects.\n` +
    `Any overlap into the photo must be visible but sparse and must not reduce the perceived photo size.\n` +
    `Do not cover important photo content.\n` +
    `Do not cover faces.\n` +
    `Do not cover people.\n` +
    `Do not cover the main activity.\n` +
    `Do not cover large areas of the photo.\n` +
    `Do not place large decorative objects inside the photo.\n` +
    `Only small foreground decorative elements may cross the boundary.\n` +
    `Let small parts of cute elements cross the boundary: crab claw, shell edge, palm leaf tips, sun rays, cloud edge, wave foam, small partially hidden character hand/hat/tool.\n` +
    `Every decorative element must be fully completed.\n` +
    `Do not generate unfinished objects, cropped decorative fragments, half-generated objects, faded object remnants, blurry placeholder shapes, random artifacts, or visual clutter.\n` +
    `Prefer fewer high-quality decorative elements over many decorations. If an object cannot fit naturally, remove it completely.\n` +
    `At the bottom photo edge, allow selected small accents to overlap by 10–18% and avoid continuous strips or opaque panels.\n` +
    `Do not resize, crop, or shrink the original photo.\n` +
    `\n` +
    `=== PHOTO FRAME QUALITY GATE ===\n` +
    `The uploaded photo is already the final photo frame.\n` +
    `Never create a second frame around the photo.\n` +
    `Never create an inner frame.\n` +
    `Never create a photo border.\n` +
    `Never create a photo outline.\n` +
    `Never create a photo container.\n` +
    `Never create a photo window.\n` +
    `Never create a photo card.\n` +
    `Never create a photo panel.\n` +
    `Never create a photo mask.\n` +
    `Never create a rounded rectangle around the photo.\n` +
    `Never create an arch frame around the photo.\n` +
    `Never create a glass frame around the photo.\n` +
    `Never create a decorative frame inside the card.\n` +
    `There must be exactly one photo area.\n` +
    `The AI frame decorates the card around the photo.\n` +
    `The AI frame does not decorate the photo itself.\n` +
    `The photo edges must remain visually open and uninterrupted.\n` +
    `Decorations may touch the photo boundary but must never surround it.\n` +
    `If a decoration starts forming a border shape around the photo, remove the decoration.\n` +
    `The photo area is only one image inside the card. AI has no permission to create a new holder, frame, mask, panel, or container for the photo.\n` +
    `AI decorates the card. AI does not decorate the photo. AI does not surround, wrap, or re-frame the photo.\n` +
    `Validation rule before returning result: Check the generated image. If any line, border, frame, outline, rounded rectangle, window shape, card shape, mask shape, or enclosing structure appears around the photo, REJECT the result and regenerate.\n` +
    `Only return images where the photo appears directly embedded into the card without a second frame.\n` +
    `\n` +
    `Keep the original photo aspect ratio.\n` +
    `Never crop the image.\n` +
    `Never convert the image into square format.\n` +
    `\n` +
    `Generate decorative frame elements only.\n` +
    `\n` +
    `STYLE: 16-bit pixel-art decorative frame, soft pastel palette, calm Korean travel-app mood.`
  );
};

const buildFramePrompt = (volunteerActivity: string, region: string) =>
  buildFrameBasePrompt(volunteerActivity, region, 'background');

const buildFrameOverlayPrompt = (volunteerActivity: string, region: string) =>
  buildFrameBasePrompt(volunteerActivity, region, 'overlay');

const IMAGE_GENERATION_SIZE = '1024x1536';
const IMAGE_GENERATION_QUALITY = 'medium';

const getEstimatedImageCostUsd = (model: string, quality: string, size: string) => {
  const key = `${model}:${quality}:${size}`;
  const knownCosts: Record<string, number> = {
    'gpt-image-2:medium:1024x1536': 0.041,
    'gpt-image-2:high:1024x1536': 0.165,
    'gpt-image-1-mini:medium:1024x1536': 0.015,
    'gpt-image-1-mini:high:1024x1536': 0.052,
  };

  return knownCosts[key] ?? null;
};

const formatCost = (value: number | null) => (value == null ? 'unknown' : `$${value.toFixed(3)}`);

const requestOpenAIImageEdit = async (
  apiKey: string,
  model: string,
  decoded: NonNullable<ReturnType<typeof dataUrlToBuffer>>,
  prompt: string,
  background: 'transparent' | 'opaque' | 'auto' = 'auto',
) => {
  const startedAt = Date.now();
  const form = new FormData();
  const ext = decoded.contentType.split('/')[1] || 'png';
  form.append('image', new Blob([new Uint8Array(decoded.buffer)], { type: decoded.contentType }), `source.${ext}`);
  form.append('prompt', prompt);
  form.append('model', model);
  form.append('size', IMAGE_GENERATION_SIZE);
  form.append('quality', IMAGE_GENERATION_QUALITY);
  form.append('output_format', 'png');
  form.append('background', background);
  form.append('n', '1');

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (error) {
    console.error('OpenAI request failed:', error instanceof Error ? error.message : String(error));
    throw new Error('AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  const payloadText = await openaiResponse.text();
  if (!openaiResponse.ok) {
    console.error('OpenAI error:', openaiResponse.status, payloadText.slice(0, 1000));
    let openaiMsg = '';
    try { openaiMsg = (JSON.parse(payloadText) as { error?: { message?: string } }).error?.message ?? ''; } catch { /* ignore */ }
    throw new Error(openaiMsg || 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  try {
    const payload = JSON.parse(payloadText) as { data?: Array<{ b64_json?: string }> };
    const imageBase64 = payload.data?.[0]?.b64_json ?? '';
    if (imageBase64) return { imageBase64, elapsedMs: Date.now() - startedAt };
  } catch {
    // handled below
  }

  console.error('OpenAI returned no image. body:', payloadText.slice(0, 500));
  throw new Error('AI 카드 이미지를 받지 못했어요.');
};

const handleCardGenerate = async (res: VercelResponse, deviceKey: string, body: Record<string, unknown>) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendError(res, 503, 'AI 카드 기능이 아직 준비 중이에요. (OPENAI_API_KEY 미설정)');
  const blobToken = getBlobToken();
  if (!blobToken) return sendError(res, 500, '이미지 저장소가 설정되지 않았어요.');

  // 원본 사진만 OpenAI Images Edits API(/v1/images/edits)에 전달한다.
  // 응답 이미지는 카드가 아니라 장식 프레임/배경 PNG로만 사용한다.
  const dataUrl = str(body.dataUrl) || str(body.imageDataUrl) || str(body.sourceDataUrl);
  const decoded = dataUrlToBuffer(dataUrl);
  if (!decoded) return sendError(res, 400, '원본 사진을 보내주세요. (dataUrl 누락)');

  const region = str(body.region);
  const volunteerActivity = str(body.volunteerActivity) || str(body.activity);

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const backgroundPrompt = buildFramePrompt(volunteerActivity, region);
  const overlayPrompt = buildFrameOverlayPrompt(volunteerActivity, region);
  const estimatedCostPerImageUsd = getEstimatedImageCostUsd(model, IMAGE_GENERATION_QUALITY, IMAGE_GENERATION_SIZE);

  const start = Date.now();
  let backgroundBase64 = '';
  let backgroundElapsedMs = 0;
  try {
    const backgroundResult = await requestOpenAIImageEdit(apiKey, model, decoded, backgroundPrompt, 'opaque');
    backgroundBase64 = backgroundResult.imageBase64;
    backgroundElapsedMs = backgroundResult.elapsedMs;
  } catch (error) {
    return sendError(res, 502, error instanceof Error ? error.message : 'AI 카드 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
  }

  let overlayBase64 = '';
  let overlayElapsedMs = 0;
  try {
    const overlayResult = await requestOpenAIImageEdit(apiKey, model, decoded, overlayPrompt, 'transparent');
    overlayBase64 = overlayResult.imageBase64;
    overlayElapsedMs = overlayResult.elapsedMs;
  } catch (error) {
    console.warn('AI frame overlay generation skipped:', error instanceof Error ? error.message : String(error));
  }

  const blob = await put(`story-cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-background.png`, Buffer.from(backgroundBase64, 'base64'), {
    access: 'private',
    contentType: 'image/png',
    token: blobToken,
  });
  const backgroundUrl = blobProxyUrl(blob.pathname);

  let overlayUrl = '';
  if (overlayBase64) {
    const overlayBuffer = normalizeOverlayPngTransparency(Buffer.from(overlayBase64, 'base64'));
    const overlayBlob = await put(`story-cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-overlay.png`, overlayBuffer, {
      access: 'private',
      contentType: 'image/png',
      token: blobToken,
    });
    overlayUrl = blobProxyUrl(overlayBlob.pathname);
  }

  const elapsedMs = Date.now() - start;
  const generatedLayers = 1 + (overlayBase64 ? 1 : 0);
  const estimatedTotalCostUsd = estimatedCostPerImageUsd == null ? null : estimatedCostPerImageUsd * generatedLayers;

  console.log(
    `[AI frame] model=${model} quality=${IMAGE_GENERATION_QUALITY} size=${IMAGE_GENERATION_SIZE} ` +
    `layers=${generatedLayers}${overlayBase64 ? ' (background+overlay)' : ' (background only)'} ` +
    `cost≈${formatCost(estimatedTotalCostUsd)} ` +
    `time=${(elapsedMs / 1000).toFixed(1)}s ` +
    `background=${(backgroundElapsedMs / 1000).toFixed(1)}s ` +
    `overlay=${overlayBase64 ? `${(overlayElapsedMs / 1000).toFixed(1)}s` : 'skipped'}`
  );
  res.status(200).json({
    ok: true,
    url: backgroundUrl,
    backgroundUrl,
    overlayUrl: overlayUrl || null,
    elapsedMs,
    imageModel: model,
    imageQuality: IMAGE_GENERATION_QUALITY,
    imageSize: IMAGE_GENERATION_SIZE,
    generatedLayers,
    estimatedCostUsd: estimatedTotalCostUsd,
    layerTimingsMs: {
      background: backgroundElapsedMs,
      overlay: overlayBase64 ? overlayElapsedMs : null,
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
        case 'card-save':
          return await handleCardSave(res, deviceKey, body);
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
