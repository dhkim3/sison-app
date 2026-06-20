import { geocodeAddress, findNearbyPlaces } from './travel/_service';

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

function parseNum(value: string): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

function qs(query: Record<string, string | string[]>, key: string): string {
  const v = query[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

async function handleGeocode(req: VercelRequest, res: VercelResponse): Promise<void> {
  let address = '';
  let region = '';
  const q = req.query ?? {};

  if (req.method === 'GET') {
    address = qs(q, 'address').trim();
    region = qs(q, 'region').trim();
  } else {
    const body = req.body as Record<string, unknown> | null | undefined;
    address = typeof body?.address === 'string' ? body.address.trim() : '';
    region = typeof body?.region === 'string' ? body.region.trim() : '';
  }

  if (!address) {
    res.status(400).json({ ok: false, error: '주소를 입력해주세요.' });
    return;
  }

  try {
    const result = await geocodeAddress(address, region);
    res.status(200).json({ ok: true, address, ...result, source: 'vworld' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    res.status(message.includes('찾지 못했어요') ? 200 : 500).json({ ok: false, error: message });
  }
}

async function handleNearbyPlaces(req: VercelRequest, res: VercelResponse): Promise<void> {
  let lat: number | null = null;
  let lng: number | null = null;
  const q = req.query ?? {};

  if (req.method === 'GET') {
    lat = parseNum(qs(q, 'lat'));
    lng = parseNum(qs(q, 'lng'));
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET 또는 POST 요청만 허용됩니다.' });
    return;
  }

  const action = qs(req.query ?? {}, 'action');

  if (action === 'geocode') return handleGeocode(req, res);
  if (action === 'nearby-places') return handleNearbyPlaces(req, res);

  res.status(400).json({ ok: false, error: '?action=geocode 또는 ?action=nearby-places가 필요합니다.' });
}
