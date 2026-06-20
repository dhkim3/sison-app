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

  const apiKey = process.env.VWORLD_API_KEY?.trim();

  const keyInfo = {
    exists: Boolean(apiKey),
    length: apiKey?.length ?? 0,
  };

  if (!apiKey) {
    res.status(500).json({ ok: false, key: keyInfo, error: 'VWORLD_API_KEY is not set' });
    return;
  }

  const query = '서울특별시 강남구 테헤란로 521';

  try {
    const params = new URLSearchParams({
      service: 'search',
      request: 'search',
      version: '2.0',
      format: 'json',
      type: 'address',
      category: 'ROAD',
      query,
      key: apiKey,
    });

    const url = `https://api.vworld.kr/req/search?${params.toString()}`;
    const maskedUrl = url.replace(encodeURIComponent(apiKey), '***').replace(apiKey, '***');
    const response = await fetch(url);

    const responseText = await response.text();

    if (!response.ok) {
      res.status(500).json({
        ok: false,
        url: maskedUrl,
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return;
    }

    let data: {
      response: {
        status: string;
        result?: {
          total: string;
          items: unknown[];
        };
        error?: { code: string; text: string };
      };
    };

    try {
      data = JSON.parse(responseText);
    } catch {
      res.status(500).json({
        ok: false,
        url: maskedUrl,
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        error: 'Failed to parse response as JSON',
      });
      return;
    }

    const vworldStatus = data.response.status;

    if (vworldStatus !== 'OK') {
      res.status(500).json({
        ok: false,
        url: maskedUrl,
        status: response.status,
        statusText: response.statusText,
        error: data.response.error ?? vworldStatus,
        body: responseText,
      });
      return;
    }

    const result = data.response.result;

    res.status(200).json({
      ok: true,
      url,
      status: response.status,
      statusText: response.statusText,
      count: result ? parseInt(result.total, 10) : 0,
      first: result?.items[0] ?? null,
      body: responseText,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      key: keyInfo,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
