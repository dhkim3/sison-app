import { geocodeAddress } from './_service';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET 또는 POST 요청만 허용됩니다.' });
    return;
  }

  let address = '';
  let region = '';
  if (req.method === 'GET') {
    const q = req.query?.address;
    address = (Array.isArray(q) ? q[0] : q ?? '').trim();
    const r = req.query?.region;
    region = (Array.isArray(r) ? r[0] : r ?? '').trim();
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
    const isNotFound = message.includes('찾지 못했어요');
    res.status(isNotFound ? 200 : 500).json({ ok: false, error: message });
  }
}
