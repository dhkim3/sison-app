import { findNearbyPlaces } from './_service.js';

type VercelRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function parseNum(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET 또는 POST 요청만 허용됩니다.' });
    return;
  }

  let lat: number | null = null;
  let lng: number | null = null;

  if (req.method === 'GET') {
    const q = req.query ?? {};
    lat = parseNum(Array.isArray(q.lat) ? q.lat[0] : q.lat);
    lng = parseNum(Array.isArray(q.lng) ? q.lng[0] : q.lng);
  } else {
    const body = req.body as Record<string, unknown> | null | undefined;
    lat = typeof body?.lat === 'number' ? body.lat : parseNum(String(body?.lat ?? ''));
    lng = typeof body?.lng === 'number' ? body.lng : parseNum(String(body?.lng ?? ''));
  }

  if (lat === null || lng === null) {
    res.status(400).json({ ok: false, error: 'lat, lng를 입력해주세요.' });
    return;
  }

  try {
    const places = await findNearbyPlaces(lat, lng);
    res.status(200).json({ ok: true, center: { lat, lng }, places });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : '서버 오류가 발생했습니다.',
    });
  }
}
