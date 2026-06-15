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

const summarizeEnvValue = (name: string) => {
  const value = process.env[name];

  return {
    exists: Boolean(value),
    length: value?.length ?? 0,
  };
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
    return;
  }

  res.status(200).json({
    ok: true,
    env: {
      BLOB_READ_WRITE_TOKEN: summarizeEnvValue('BLOB_READ_WRITE_TOKEN'),
      DATA_GO_KR_SERVICE_KEY: summarizeEnvValue('DATA_GO_KR_SERVICE_KEY'),
    },
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? null,
    },
  });
}
