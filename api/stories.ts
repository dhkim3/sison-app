import storyHandler from './story';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    req.query = { ...req.query, action: 'list' };
    await storyHandler(req, res);
    return;
  }

  if (req.method === 'POST') {
    req.query = { ...req.query, action: 'create' };
    await storyHandler(req, res);
    return;
  }

  res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
}
