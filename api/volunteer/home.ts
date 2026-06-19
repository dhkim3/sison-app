import { get, list } from '@vercel/blob';
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

type CacheErrorStage =
  | 'env'
  | 'blob_list'
  | 'blob_not_found'
  | 'blob_read_pathname'
  | 'blob_read_url'
  | 'json_parse'
  | 'cache_shape'
  | 'cache_policy';

type CacheErrorSummary = {
  stage: CacheErrorStage;
  name: string;
  message: string;
  blobTokenExists: boolean;
  blobTokenLength: number;
  pathname: string;
  blobFound?: boolean;
  listedCount?: number;
};

class HomeCacheReadError extends Error {
  summary: CacheErrorSummary;

  constructor(summary: CacheErrorSummary) {
    super(summary.message);
    this.name = summary.name;
    this.summary = summary;
  }
}

const HOME_CACHE_PATH = 'volunteers-home.json';

const getBlobReadWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim();

const getBlobTokenSummary = () => {
  const blobToken = getBlobReadWriteToken();

  return {
    blobToken,
    blobTokenExists: Boolean(blobToken),
    blobTokenLength: blobToken?.length ?? 0,
  };
};

const sanitizeCacheErrorMessage = (error: unknown, blobToken?: string) => {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return rawMessage
    .replace(blobToken || '__NO_BLOB_TOKEN__', '[REDACTED_BLOB_TOKEN]')
    .replace(/https:\/\/[^\s"']+\.blob\.vercel-storage\.com\/[^\s"']+/g, '[BLOB_URL]')
    .slice(0, 500);
};

const createCacheError = (
  stage: CacheErrorStage,
  error: unknown,
  options: {
    blobToken?: string;
    blobTokenExists: boolean;
    blobTokenLength: number;
    blobFound?: boolean;
    listedCount?: number;
  },
) => new HomeCacheReadError({
  stage,
  name: error instanceof Error ? error.name : 'Error',
  message: sanitizeCacheErrorMessage(error, options.blobToken),
  blobTokenExists: options.blobTokenExists,
  blobTokenLength: options.blobTokenLength,
  pathname: HOME_CACHE_PATH,
  blobFound: options.blobFound,
  listedCount: options.listedCount,
});

const EMPTY_HOME_SECTIONS: HomeVolunteerSections = {
  lightweight: [],
  monthly: [],
  festival: [],
};

const toHomeVolunteerSections = (value: unknown): HomeVolunteerSections => {
  if (!value || typeof value !== 'object') return EMPTY_HOME_SECTIONS;

  const sections = value as Record<string, unknown>;
  return {
    lightweight: Array.isArray(sections.lightweight) ? sections.lightweight : [],
    monthly: Array.isArray(sections.monthly) ? sections.monthly : [],
    festival: Array.isArray(sections.festival) ? sections.festival : [],
  } as HomeVolunteerSections;
};

const getHomeSectionCounts = (sections: HomeVolunteerSections) => ({
  lightweight: sections.lightweight.length,
  monthly: sections.monthly.length,
  festival: sections.festival.length,
});

const getTodayApiDate = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return Number(`${year}${month}${day}`);
};

const toSortableDate = (value?: string | null) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 8) return 0;

  return Number(digits.slice(0, 8));
};

const hasFutureRecruitmentDeadline = (activity: { recruitmentEndDate?: string | null }) => {
  const recruitmentEndDate = toSortableDate(activity.recruitmentEndDate);
  return recruitmentEndDate > 0 && recruitmentEndDate > getTodayApiDate();
};

const hasOnlyFutureRecruitmentDeadlines = (sections: HomeVolunteerSections) =>
  [...sections.lightweight, ...sections.monthly, ...sections.festival]
    .every(hasFutureRecruitmentDeadline);

const hasUsableMonthlySection = (sections: HomeVolunteerSections) =>
  sections.monthly.length > 0;

const normalizeHomeCachePayload = (value: unknown): HomeCachePayload | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<HomeCachePayload>;
  const rawSections = candidate.sections as Record<string, unknown> | undefined;
  const sections = toHomeVolunteerSections(candidate.sections);
  const hasExpectedSections = (
    Boolean(rawSections) &&
    Array.isArray(rawSections?.lightweight) &&
    Array.isArray(rawSections?.monthly) &&
    Array.isArray(rawSections?.festival)
  );

  if (
    candidate.cacheVersion !== 1 ||
    typeof candidate.generatedAt !== 'string' ||
    candidate.source !== '1365' ||
    !hasExpectedSections
  ) {
    return null;
  }

  return {
    cacheVersion: 1,
    generatedAt: candidate.generatedAt,
    source: '1365',
    counts: getHomeSectionCounts(sections),
    sections,
  };
};

const isHomeCachePayload = (value: unknown): value is HomeCachePayload => {
  return normalizeHomeCachePayload(value) !== null;
};

const readTextFromBlob = async (urlOrPathname: string, blobToken: string) => {
  const cachedBlob = await get(urlOrPathname, { access: 'private', token: blobToken, useCache: false });
  if (!cachedBlob || cachedBlob.statusCode !== 200 || !cachedBlob.stream) {
    return null;
  }

  return new Response(cachedBlob.stream).text();
};

const readHomeCache = async () => {
  const { blobToken, blobTokenExists, blobTokenLength } = getBlobTokenSummary();
  if (!blobToken) {
    throw createCacheError('env', new Error('BLOB_READ_WRITE_TOKEN이 설정되지 않았어요.'), {
      blobToken,
      blobTokenExists,
      blobTokenLength,
    });
  }

  let listedCount = 0;
  let matchedBlobUrl = '';

  try {
    const listed = await list({
      prefix: HOME_CACHE_PATH,
      limit: 1,
      token: blobToken,
    });
    const matchedBlob = listed.blobs.find((blob) => blob.pathname === HOME_CACHE_PATH);
    listedCount = listed.blobs.length;
    matchedBlobUrl = matchedBlob?.url ?? '';

    if (!matchedBlobUrl) {
      throw createCacheError('blob_not_found', new Error('volunteers-home.json Blob을 찾지 못했어요.'), {
        blobToken,
        blobTokenExists,
        blobTokenLength,
        blobFound: false,
        listedCount,
      });
    }
  } catch (error) {
    if (error instanceof HomeCacheReadError) throw error;
    throw createCacheError('blob_list', error, {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      listedCount,
    });
  }

  let payloadText: string | null = null;
  let pathnameReadError: HomeCacheReadError | null = null;

  try {
    payloadText = await readTextFromBlob(HOME_CACHE_PATH, blobToken);
  } catch (error) {
    pathnameReadError = createCacheError('blob_read_pathname', error, {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  if (!payloadText) {
    try {
      payloadText = await readTextFromBlob(matchedBlobUrl, blobToken);
    } catch (error) {
      throw createCacheError('blob_read_url', error, {
        blobToken,
        blobTokenExists,
        blobTokenLength,
        blobFound: true,
        listedCount,
      });
    }
  }

  if (!payloadText) {
    throw pathnameReadError ?? createCacheError('blob_read_pathname', new Error('Blob 응답 본문이 비어 있어요.'), {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    throw createCacheError('json_parse', error, {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  const normalizedPayload = normalizeHomeCachePayload(payload);

  if (!normalizedPayload || !isHomeCachePayload(normalizedPayload)) {
    throw createCacheError('cache_shape', new Error('volunteers-home.json 캐시 형식이 올바르지 않아요.'), {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  if (!hasOnlyFutureRecruitmentDeadlines(normalizedPayload.sections)) {
    throw createCacheError('cache_policy', new Error('홈 캐시에 오늘 마감 또는 지난 모집 활동이 포함되어 있어요.'), {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  if (!hasUsableMonthlySection(normalizedPayload.sections)) {
    throw createCacheError('cache_policy', new Error('홈 캐시의 이달의 활동 섹션이 비어 있어요.'), {
      blobToken,
      blobTokenExists,
      blobTokenLength,
      blobFound: true,
      listedCount,
    });
  }

  return normalizedPayload;
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
    const cacheErrorSummary = cacheError instanceof HomeCacheReadError
      ? cacheError.summary
      : createCacheError('blob_read_pathname', cacheError, getBlobTokenSummary()).summary;

    console.warn('volunteer home cache read failed, falling back to live data:', {
      stage: cacheErrorSummary.stage,
      errorName: cacheErrorSummary.name,
      errorMessage: cacheErrorSummary.message,
      blobTokenExists: cacheErrorSummary.blobTokenExists,
      blobTokenLength: cacheErrorSummary.blobTokenLength,
      pathname: cacheErrorSummary.pathname,
    });

    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) {
      res.status(500).json({
        ok: false,
        cacheStatus: 'error',
        cacheError: cacheErrorSummary,
        generatedAt: null,
        sections: EMPTY_HOME_SECTIONS,
        error: '1365 API 인증키가 설정되지 않았어요.',
      });
      return;
    }

    try {
      const sections = await buildHomeVolunteerSections(serviceKey);
      const normalizedSections = toHomeVolunteerSections(sections);
      const counts = getHomeSectionCounts(normalizedSections);

      res.status(200).json({
        ok: true,
        cacheStatus: 'fallback',
        cacheError: cacheErrorSummary,
        generatedAt: null,
        counts,
        sections: normalizedSections,
      });
    } catch (error) {
      console.error('volunteer home live fallback failed:', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        ok: false,
        cacheStatus: 'error',
        cacheError: cacheErrorSummary,
        generatedAt: null,
        sections: EMPTY_HOME_SECTIONS,
        error: '홈 활동을 불러오지 못했어요.',
      });
    }
  }
}
