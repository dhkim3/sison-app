import { put } from '@vercel/blob';
import {
  POPULAR_REGION_CACHE_PATH,
  SEARCH_REGION_CACHE_PATH,
  buildPopularRegionCache,
  buildHomeVolunteerSections,
  buildSearchRegionCache,
  enrichHomeVolunteerSectionsWithCapacity,
  getPopularRegionCacheTargetRegions,
  getSearchRegionCacheTargetRegions,
} from '../volunteer/search.js';

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

const getBlobReadWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim();

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

  const blobToken = getBlobReadWriteToken();
  if (!blobToken) {
    res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN이 설정되지 않았어요.' });
    return;
  }

  try {
    const generatedAt = new Date().toISOString();
    const sections = await buildHomeVolunteerSections(serviceKey);
    const homeCapacityEnrichment = await enrichHomeVolunteerSectionsWithCapacity(serviceKey, sections);
    const normalizedSections = {
      lightweight: Array.isArray(homeCapacityEnrichment.sections.lightweight) ? homeCapacityEnrichment.sections.lightweight : [],
      upcoming: Array.isArray(homeCapacityEnrichment.sections.upcoming) ? homeCapacityEnrichment.sections.upcoming : [],
      festival: Array.isArray(homeCapacityEnrichment.sections.festival) ? homeCapacityEnrichment.sections.festival : [],
    };
    const counts = {
      lightweight: normalizedSections.lightweight.length,
      upcoming: normalizedSections.upcoming.length,
      festival: normalizedSections.festival.length,
    };
    const cachePayload = {
      cacheVersion: 1,
      generatedAt,
      source: '1365',
      counts,
      sections: normalizedSections,
      capacityEnrichment: homeCapacityEnrichment.stats,
    };
    const blob = await put(HOME_CACHE_PATH, JSON.stringify(cachePayload), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      token: blobToken,
    });

    let searchRegionCache:
      | {
        ok: true;
        generatedAt: string;
        targetRegions: string[];
        counts: Record<string, number>;
        capacityEnrichment: {
          attempted: number;
          alreadyHadCapacity: number;
          enriched: number;
          detailCapacityFound: number;
          missingAfterEnrichment: number;
          skipped: number;
        };
        regionCapacityEnrichment: Record<string, unknown>;
        blobUrl: string;
        pathname: string;
      }
      | {
        ok: false;
        targetRegions: string[];
        error: string;
      };
    let popularRegionCache:
      | {
        ok: true;
        generatedAt: string;
        targetRegions: string[];
        counts: Record<string, number>;
        capacityEnrichment: {
          attempted: number;
          alreadyHadCapacity: number;
          enriched: number;
          detailCapacityFound: number;
          missingAfterEnrichment: number;
          skipped: number;
        };
        regionCapacityEnrichment: Record<string, unknown>;
        blobUrl: string;
        pathname: string;
      }
      | {
        ok: false;
        targetRegions: string[];
        error: string;
      };

    try {
      const searchCachePayload = await buildSearchRegionCache(serviceKey);
      const searchBlob = await put(SEARCH_REGION_CACHE_PATH, JSON.stringify(searchCachePayload), {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        token: blobToken,
      });
      searchRegionCache = {
        ok: true,
        generatedAt: searchCachePayload.generatedAt,
        targetRegions: getSearchRegionCacheTargetRegions(),
        counts: Object.fromEntries(
          Object.entries(searchCachePayload.regions).map(([region, entry]) => [region, entry?.count ?? 0])
        ),
        capacityEnrichment: searchCachePayload.capacityEnrichment ?? {
          attempted: 0,
          alreadyHadCapacity: 0,
          enriched: 0,
          detailCapacityFound: 0,
          missingAfterEnrichment: 0,
          skipped: 0,
        },
        regionCapacityEnrichment: Object.fromEntries(
          Object.entries(searchCachePayload.regions).map(([region, entry]) => [
            region,
            entry?.capacityEnrichment ?? null,
          ])
        ),
        blobUrl: searchBlob.url,
        pathname: searchBlob.pathname,
      };
    } catch (error) {
      console.error('volunteer search region cache sync failed:', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      searchRegionCache = {
        ok: false,
        targetRegions: getSearchRegionCacheTargetRegions(),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      const popularCachePayload = await buildPopularRegionCache(serviceKey);
      const popularBlob = await put(POPULAR_REGION_CACHE_PATH, JSON.stringify(popularCachePayload), {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        token: blobToken,
      });
      popularRegionCache = {
        ok: true,
        generatedAt: popularCachePayload.generatedAt,
        targetRegions: getPopularRegionCacheTargetRegions(),
        counts: Object.fromEntries(
          Object.entries(popularCachePayload.regions).map(([region, entry]) => [region, entry?.count ?? 0])
        ),
        capacityEnrichment: popularCachePayload.capacityEnrichment ?? {
          attempted: 0,
          alreadyHadCapacity: 0,
          enriched: 0,
          detailCapacityFound: 0,
          missingAfterEnrichment: 0,
          skipped: 0,
        },
        regionCapacityEnrichment: Object.fromEntries(
          Object.entries(popularCachePayload.regions).map(([region, entry]) => [
            region,
            entry?.capacityEnrichment ?? null,
          ])
        ),
        blobUrl: popularBlob.url,
        pathname: popularBlob.pathname,
      };
    } catch (error) {
      console.error('volunteer popular region cache sync failed:', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      popularRegionCache = {
        ok: false,
        targetRegions: getPopularRegionCacheTargetRegions(),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    res.status(200).json({
      ok: true,
      generatedAt,
      counts,
      capacityEnrichment: homeCapacityEnrichment.stats,
      blobUrl: blob.url,
      pathname: blob.pathname,
      searchRegionCache,
      popularRegionCache,
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
