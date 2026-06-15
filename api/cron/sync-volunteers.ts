import { put } from '@vercel/blob';
import { buildHomeVolunteerSections } from '../volunteer/search.js';

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

const HOME_CACHE_PATH = 'volunteers-home.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
    return;
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({ ok: false, error: '1365 API 인증키가 설정되지 않았어요.' });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN이 설정되지 않았어요.' });
    return;
  }

  try {
    const generatedAt = new Date().toISOString();
    const sections = await buildHomeVolunteerSections(serviceKey);
    const counts = {
      lightweight: sections.lightweight.length,
      monthly: sections.monthly.length,
      festival: sections.festival.length,
    };
    const cachePayload = {
      cacheVersion: 1,
      generatedAt,
      source: '1365',
      counts,
      sections,
    };
    const blob = await put(HOME_CACHE_PATH, JSON.stringify(cachePayload), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
    });

    res.status(200).json({
      ok: true,
      generatedAt,
      counts,
      blobUrl: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error('volunteer home cache sync failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      ok: false,
      error: '홈 활동 캐시 생성 중 문제가 생겼어요.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
