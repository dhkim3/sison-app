import { get } from '@vercel/blob';
import { buildHomeVolunteerSections, type HomeVolunteerSections } from './search.js';

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

type HomeCachePayload = {
  cacheVersion: number;
  generatedAt: string;
  source: '1365';
  counts: {
    lightweight: number;
    monthly: number;
    festival: number;
  };
  sections: HomeVolunteerSections;
};

const HOME_CACHE_PATH = 'volunteers-home.json';

const isHomeCachePayload = (value: unknown): value is HomeCachePayload => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<HomeCachePayload>;
  return (
    candidate.cacheVersion === 1 &&
    typeof candidate.generatedAt === 'string' &&
    candidate.source === '1365' &&
    Boolean(candidate.sections) &&
    Array.isArray(candidate.sections?.lightweight) &&
    Array.isArray(candidate.sections?.monthly) &&
    Array.isArray(candidate.sections?.festival)
  );
};

const readHomeCache = async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN이 설정되지 않았어요.');
  }

  const cachedBlob = await get(HOME_CACHE_PATH, { access: 'private' });
  if (!cachedBlob || cachedBlob.statusCode !== 200 || !cachedBlob.stream) {
    throw new Error('volunteers-home.json 캐시가 없어요.');
  }

  const payload = await new Response(cachedBlob.stream).json();
  if (!isHomeCachePayload(payload)) {
    throw new Error('volunteers-home.json 캐시 형식이 올바르지 않아요.');
  }

  return payload;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, cacheStatus: 'error', error: '지원하지 않는 요청이에요.' });
    return;
  }

  try {
    const cachePayload = await readHomeCache();
    res.status(200).json({
      ok: true,
      cacheStatus: 'hit',
      generatedAt: cachePayload.generatedAt,
      counts: cachePayload.counts,
      sections: cachePayload.sections,
    });
    return;
  } catch (cacheError) {
    console.warn('volunteer home cache read failed, falling back to live data:', {
      errorMessage: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({
      ok: false,
      cacheStatus: 'error',
      generatedAt: null,
      sections: {
        lightweight: [],
        monthly: [],
        festival: [],
      },
      error: '1365 API 인증키가 설정되지 않았어요.',
    });
    return;
  }

  try {
    const sections = await buildHomeVolunteerSections(serviceKey);
    const counts = {
      lightweight: sections.lightweight.length,
      monthly: sections.monthly.length,
      festival: sections.festival.length,
    };

    res.status(200).json({
      ok: true,
      cacheStatus: 'fallback',
      generatedAt: null,
      counts,
      sections,
    });
  } catch (error) {
    console.error('volunteer home live fallback failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      ok: false,
      cacheStatus: 'error',
      generatedAt: null,
      sections: {
        lightweight: [],
        monthly: [],
        festival: [],
      },
      error: '홈 활동을 불러오지 못했어요.',
    });
  }
}
