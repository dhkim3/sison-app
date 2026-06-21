type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: unknown) => void;
  json: (body: unknown) => void;
};

declare const Buffer: {
  from: (input: ArrayBuffer) => unknown;
};

const ALLOWED_IMAGE_HOSTS = [
  'visitkorea.or.kr',
  'cdn.visitkorea.or.kr',
  'tong.visitkorea.or.kr',
  'korean.visitkorea.or.kr',
];

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isAllowedImageHost(hostname: string) {
  return ALLOWED_IMAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function normalizeImageUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported image protocol');
  }

  if (!isAllowedImageHost(url.hostname)) {
    throw new Error('Unsupported image host');
  }

  if (url.protocol === 'http:') {
    url.protocol = 'https:';
  }

  url.searchParams.delete('sison_capture_cache_bust');
  return url.toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rawUrl = getQueryValue(req.query.url);
  if (!rawUrl) {
    return res.status(400).json({ ok: false, error: 'Missing image url' });
  }

  let imageUrl: string;
  try {
    imageUrl = normalizeImageUrl(rawUrl);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid image url' });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'SisonAppImageProxy/1.0',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ ok: false, error: 'Image request failed' });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ ok: false, error: 'Unsupported content type' });
    }

    const body = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'HEAD') {
      return res.status(200).send('');
    }
    return res.status(200).send(body);
  } catch (error) {
    console.error('[image-proxy] request failed', { imageUrl, error });
    return res.status(502).json({ ok: false, error: 'Image proxy failed' });
  }
}
