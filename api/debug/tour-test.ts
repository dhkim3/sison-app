type VercelRequest = {
  method?: string;
};

declare const process: {
  env: Record<string, string | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const serviceKey = process.env.TOUR_API_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({ ok: false, error: 'TOUR_API_SERVICE_KEY is not set' });
    return;
  }

  try {
    // serviceKey는 포털에서 발급 시 이미 URL 인코딩된 형태로 제공된다.
    // URLSearchParams에 넣으면 이중 인코딩되므로 URL에 직접 삽입한다.
    const params = new URLSearchParams({
      MobileOS: 'ETC',
      MobileApp: 'sison',
      _type: 'json',
      areaCode: '6',
      contentTypeId: '12',
      numOfRows: '5',
      pageNo: '1',
    });

    const base = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';
    const url = `${base}?serviceKey=${serviceKey}&${params.toString()}`;
    const response = await fetch(url);

    const responseText = await response.text();

    let first: unknown = null;
    try {
      const data = JSON.parse(responseText) as {
        response: {
          body: {
            items: { item: unknown[] } | '';
          };
        };
      };
      const items = data.response.body.items;
      first = items !== '' ? items.item[0] ?? null : null;
    } catch {
      // JSON 파싱 실패 시 first는 null 유지
    }

    res.status(response.ok ? 200 : 500).json({
      ok: response.ok,
      url,
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      first,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
