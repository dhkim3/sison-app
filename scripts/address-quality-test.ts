/**
 * 1365 봉사활동 주소 정규화 품질 검증 스크립트
 *
 * 실행: npm run address:test
 * 환경변수: DATA_GO_KR_SERVICE_KEY, VWORLD_API_KEY
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── .env.local 자동 로드 ─────────────────────────────────────────────────────

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

// ─── 환경변수 ─────────────────────────────────────────────────────────────────

const DATA_GO_KR_KEY = process.env.DATA_GO_KR_SERVICE_KEY?.trim() ?? '';
const VWORLD_KEY = process.env.VWORLD_API_KEY?.trim() ?? '';
const SAMPLE_COUNT = Number(process.env.SAMPLE_COUNT ?? '200');

if (!DATA_GO_KR_KEY) {
  console.error('❌ DATA_GO_KR_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!VWORLD_KEY) {
  console.error('❌ VWORLD_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// ─── 1365 API ─────────────────────────────────────────────────────────────────

const SEARCH_URL =
  'http://openapi.1365.go.kr/openapi/service/rest/VolunteerPartcptnService/getVltrSearchWordList';

interface RawVolunteerItem {
  progrmSj: string;       // 봉사활동명
  actPlace: string;       // 활동장소 (주소 원본)
  sidoNm?: string;        // 시/도 이름 (XML에 없으면 검색 지역 라벨 사용)
  gugunNm?: string;       // 시/군/구 이름
  progrmRegistNo: string;
}

// ─── 검색 조합 ──────────────────────────────────────────────────────────────────

interface SearchCombo {
  keyword: string;
  sidoCd?: string;
  regionLabel: string;
}

// api/volunteer/search.ts의 실제 검색 파라미터 패턴과 동일하게 맞춤
// keyword 필수, adultPosblAt: 'Y' 포함, progrmSttusSe 미사용
const SEARCH_COMBOS: SearchCombo[] = [
  { keyword: '환경', regionLabel: '전국' },
  { keyword: '플로깅', regionLabel: '전국' },
  { keyword: '정화', regionLabel: '전국' },
  { keyword: '축제', regionLabel: '전국' },
  { keyword: '행사', regionLabel: '전국' },
  { keyword: '해변', regionLabel: '전국' },
  { keyword: '공원', regionLabel: '전국' },
  { keyword: '숲', regionLabel: '전국' },
  { keyword: '문화', regionLabel: '전국' },
  { keyword: '봉사', sidoCd: '11', regionLabel: '서울' },
  { keyword: '봉사', sidoCd: '26', regionLabel: '부산' },
  { keyword: '봉사', sidoCd: '41', regionLabel: '경기' },
  { keyword: '봉사', sidoCd: '42', regionLabel: '강원' },
  { keyword: '봉사', sidoCd: '48', regionLabel: '경남' },
  { keyword: '봉사', sidoCd: '47', regionLabel: '경북' },
  { keyword: '봉사', sidoCd: '46', regionLabel: '전남' },
  { keyword: '봉사', sidoCd: '45', regionLabel: '전북' },
  { keyword: '봉사', sidoCd: '50', regionLabel: '제주' },
  { keyword: '봉사', sidoCd: '44', regionLabel: '충남' },
  { keyword: '봉사', sidoCd: '43', regionLabel: '충북' },
];

// ─── XML 파서 ─────────────────────────────────────────────────────────────────

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function getXmlTagValue(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeXmlEntities(match[1]) : '';
}

function parseTotalCount(xml: string): number {
  return parseInt(getXmlTagValue(xml, 'totalCount'), 10) || 0;
}

function parseXml(xml: string): RawVolunteerItem[] {
  const withoutScripts = xml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const itemsMatch = withoutScripts.match(/<items\b[^>]*>([\s\S]*?)<\/items>/i);
  const itemsXml = itemsMatch?.[1] ?? withoutScripts;
  const itemMatches = itemsXml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];

  const result: RawVolunteerItem[] = [];
  for (const itemXml of itemMatches) {
    const actPlace = getXmlTagValue(itemXml, 'actPlace');
    if (!actPlace) continue;
    result.push({
      progrmSj: getXmlTagValue(itemXml, 'progrmSj'),
      actPlace,
      sidoNm: getXmlTagValue(itemXml, 'sidoNm') || undefined,
      gugunNm: getXmlTagValue(itemXml, 'gugunNm') || undefined,
      progrmRegistNo: getXmlTagValue(itemXml, 'progrmRegistNo'),
    });
  }
  return result;
}

// ─── 1365 API 호출 ────────────────────────────────────────────────────────────

async function fetch1365Activities(params: {
  keyword: string;
  sidoCd?: string;
  pageNo: number;
  numOfRows: number;
}): Promise<{ items: RawVolunteerItem[]; totalCount: number }> {
  const rawKey = DATA_GO_KR_KEY;
  const serviceKey = rawKey.includes('%') ? rawKey : encodeURIComponent(rawKey);

  const query = new URLSearchParams({
    pageNo: String(params.pageNo),
    numOfRows: String(params.numOfRows),
    keyword: params.keyword,
    adultPosblAt: 'Y',
  });
  if (params.sidoCd) query.set('sidoCd', params.sidoCd);

  const url = `${SEARCH_URL}?serviceKey=${serviceKey}&${query.toString()}`;
  const maskedKey = serviceKey.slice(0, 8) + '...' + serviceKey.slice(-4);
  const debugUrl = `${SEARCH_URL}?serviceKey=${maskedKey}&${query.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(`\n  [실패] ${debugUrl}`);
    throw new Error(`네트워크 오류: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bodyText = await res.text();

  if (!res.ok) {
    console.error(`\n  [실패] HTTP ${res.status} ${res.statusText}`);
    console.error(`  URL: ${debugUrl}`);
    console.error(`  본문 (첫 1000자):\n${bodyText.slice(0, 1000)}`);
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  if (
    bodyText.includes('SERVICE_ACCESS_DENIED') ||
    bodyText.includes('INVALID_REQUEST_PARAMETER') ||
    bodyText.includes('returnAuthMsg')
  ) {
    console.error(`\n  [실패] API 오류 응답`);
    console.error(`  URL: ${debugUrl}`);
    console.error(`  본문 (첫 1000자):\n${bodyText.slice(0, 1000)}`);
    throw new Error('API 오류 응답');
  }

  const totalCount = parseTotalCount(bodyText);
  const items = parseXml(bodyText);

  if (totalCount > 0 && items.length === 0) {
    console.error(`\n  [경고] totalCount=${totalCount}인데 파싱된 item 없음`);
    console.error(`  URL: ${debugUrl}`);
    console.error(`  본문 (첫 1000자):\n${bodyText.slice(0, 1000)}`);
  }

  return { items, totalCount };
}

async function collectActivities(target: number): Promise<RawVolunteerItem[]> {
  const seen = new Set<string>();
  const result: RawVolunteerItem[] = [];

  for (const combo of SEARCH_COMBOS) {
    if (result.length >= target) break;

    process.stdout.write(
      `\r  수집 중... ${result.length}/${target}  [${combo.regionLabel} · ${combo.keyword}]   `,
    );

    let fetched: { items: RawVolunteerItem[]; totalCount: number };
    try {
      fetched = await fetch1365Activities({
        keyword: combo.keyword,
        sidoCd: combo.sidoCd,
        pageNo: 1,
        numOfRows: Math.min(target - result.length, 20),
      });
    } catch (err) {
      process.stdout.write('\n');
      console.warn(
        `  건너뜀: ${combo.regionLabel}/${combo.keyword} — ${err instanceof Error ? err.message : String(err)}`,
      );
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    // totalCount=0은 결과 없음, 오류 아님 — 다음 조합으로
    if (fetched.totalCount === 0) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    for (const item of fetched.items) {
      if (!item.progrmRegistNo || seen.has(item.progrmRegistNo)) continue;
      seen.add(item.progrmRegistNo);
      // sidoNm이 없으면 검색에 사용한 지역 라벨로 보완
      result.push({
        ...item,
        sidoNm: item.sidoNm || (combo.sidoCd ? combo.regionLabel : undefined),
      });
      if (result.length >= target) break;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  process.stdout.write('\n');
  return result;
}

// ─── 주소 정규화 (서비스 코드 복사) ──────────────────────────────────────────
// api/travel/_service.ts의 normalizeVolunteerAddress를 여기서 직접 사용.
// 빌드 없이 스크립트 단독 실행을 위해 함수를 인라인 복사함.

const ADDRESS_PREFIX_RE =
  /^(집결지|집합장소|모임장소|장소명?|집결|출발지|집합)\s*[:：\-·\s]\s*/;

const NOISE_TOKEN_SET = new Set([
  '입구', '출구', '앞', '뒤', '옆', '안쪽', '바깥쪽',
  '정문', '후문', '측문',
  '주차장', '주차', '광장', '공터', '화장실', '쉼터',
  '캐노피', '텐트', '부스', '컨테이너', '막구조물', '안내판', '현수막',
  '인근', '일원', '일대', '주변', '부근', '근처',
  '집결지', '집합장소', '만남의광장',
  '선착장', '중간선착장', '공원입구', '해변입구',
  '내', '홀', '로비',
]);

function hasAdminDivision(address: string): boolean {
  return /[시군구](\s|$)|[동읍면리](\s|$)/.test(address);
}

function extractUpToDong(address: string): string | null {
  const tokens = address.trim().split(/\s+/);
  let lastIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/동$|읍$|면$|리$/.test(tokens[i])) lastIdx = i;
  }
  return lastIdx >= 0 ? tokens.slice(0, lastIdx + 1).join(' ') : null;
}

function extractSigungu(address: string): string | null {
  const tokens = address.trim().split(/\s+/);
  let lastIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/시$|군$|구$/.test(tokens[i])) lastIdx = i;
  }
  return lastIdx >= 0 ? tokens.slice(0, lastIdx + 1).join(' ') : null;
}

function stripProvince(address: string): string | null {
  const tokens = address.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const first = tokens[0];
  if (
    /도$|광역시$|특별시$|특별자치시$|특별자치도$/.test(first) ||
    /^(경남|경북|전남|전북|충남|충북|강원|경기|제주|인천|대전|대구|부산|울산|광주|세종)$/.test(first)
  ) {
    const rest = tokens.slice(1).join(' ');
    return rest.length > 0 ? rest : null;
  }
  return null;
}

function trimNoiseTokens(address: string): string {
  const tokens = address.trim().split(/\s+/);
  let end = tokens.length;
  while (end > 0 && NOISE_TOKEN_SET.has(tokens[end - 1])) end--;
  return tokens.slice(0, end).join(' ');
}

const INDOOR_SUFFIX_RE = /\s+(?:[A-Z]?\d+[층호실]|\d+번[호지]|강당|홀|로비|내)$/;
function stripIndoorSuffix(text: string): string {
  return text.replace(INDOOR_SUFFIX_RE, '').trim();
}

function buildShrinkCandidates(address: string): string[] {
  const tokens = address.trim().split(/\s+/);
  const results: string[] = [];
  for (let end = tokens.length - 1; end >= 1; end--) {
    results.push(tokens.slice(0, end).join(' '));
    if (/시$|군$|구$|동$|읍$|면$|리$/.test(tokens[end - 1])) break;
  }
  return results;
}

function normalizeVolunteerAddress(rawAddress: string, region = ''): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (addr: string) => {
    const q = addr.replace(/\s{2,}/g, ' ').trim();
    if (q.length > 1 && !seen.has(q)) {
      seen.add(q);
      result.push(q);
    }
  };

  let base = rawAddress.trim().replace(ADDRESS_PREFIX_RE, '');

  // 1-b. 괄호 안 주소 우선 추출
  {
    const bracketMatch = base.match(/\(([^)]{2,60})\)/);
    if (bracketMatch) {
      const inner = bracketMatch[1].replace(/[\r\n\t]+/g, ' ').trim();
      if (/\d+(?:길|로|번길|번지)|[시군구동읍면리]\s/.test(inner)) {
        push(inner);
        const r =
          extractSigungu(region) ??
          (region.trim() ? region.trim().split(/\s+/).slice(0, 2).join(' ') : '');
        if (r && !inner.startsWith(r)) push(`${r} ${inner}`);
      }
    }
  }

  base = base
    .replace(/\([^)]*\)/g, ' ')
    .replace(/【[^】]*】/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/['"'"]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 2-b. 실내 위치 표현 제거 (3층, B101호, 강당, 내 등)
  base = stripIndoorSuffix(base);

  push(base);

  const dashIdx = base.indexOf('-');
  let addrBase = base;
  if (dashIdx > 0) {
    const afterDash = base.slice(dashIdx + 1).trim();
    if (afterDash.length > 0) {
      push(afterDash);
      addrBase = afterDash;
    }
  }

  const denoised = trimNoiseTokens(addrBase);
  if (denoised !== addrBase && denoised.length > 0) {
    push(denoised);
    addrBase = denoised;
  }

  if (!hasAdminDivision(addrBase) && region.trim()) {
    const regionPart =
      extractSigungu(region) ??
      region.trim().split(/\s+/).slice(0, 2).join(' ');
    if (regionPart) push(`${regionPart} ${addrBase}`);
    push(addrBase);
  }

  for (const candidate of buildShrinkCandidates(addrBase)) {
    push(candidate);
    const stripped = stripProvince(candidate);
    if (stripped) push(stripped);
  }

  const dong = extractUpToDong(addrBase);
  if (dong) {
    push(dong);
    const stripped = stripProvince(dong);
    if (stripped) push(stripped);
  }

  const sigungu = extractSigungu(addrBase);
  if (sigungu) {
    push(sigungu);
    const stripped = stripProvince(sigungu);
    if (stripped) push(stripped);
  }

  return result;
}

// ─── VWorld 지오코딩 ──────────────────────────────────────────────────────────

interface VWorldPoint { x?: string; y?: string }
interface VWorldItem {
  address?: { road?: string; parcel?: string };
  point?: VWorldPoint;
}
interface VWorldResponse {
  response?: {
    status?: string;
    result?: { items?: VWorldItem[] };
  };
}

const VWORLD_BASE = 'https://api.vworld.kr/req/search';
const VWORLD_BASE_PARAMS = {
  service: 'search', request: 'search', version: '2.0',
  format: 'json', crs: 'EPSG:4326', size: '5',
} as const;

async function vworldFetch(extra: Record<string, string>): Promise<VWorldItem | null> {
  const params = new URLSearchParams({ ...VWORLD_BASE_PARAMS, ...extra, key: VWORLD_KEY });
  let res: Response;
  try {
    res = await fetch(`${VWORLD_BASE}?${params.toString()}`);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let data: VWorldResponse;
  try {
    data = (await res.json()) as VWorldResponse;
  } catch {
    return null;
  }
  if (data?.response?.status !== 'OK') return null;
  const items = data.response?.result?.items;
  return items && items.length > 0 ? items[0] : null;
}

function searchVWorld(query: string, category: 'ROAD' | 'PARCEL'): Promise<VWorldItem | null> {
  return vworldFetch({ type: 'address', category, query });
}

function searchVWorldPlace(query: string): Promise<VWorldItem | null> {
  return vworldFetch({ type: 'place', query });
}

function searchVWorldDistrict(query: string, category: 'L4' | 'L2'): Promise<VWorldItem | null> {
  return vworldFetch({ type: 'district', category, query });
}

type MatchedType = 'ROAD' | 'PARCEL' | 'PLACE' | 'REGION_PLACE' | 'DISTRICT';

type GeocodeSuccess = { found: true; lat: number; lng: number; resolvedQuery: string; matchedType: MatchedType; triedQueries: string[] };
type GeocodeFailure = { found: false; triedQueries: string[] };

function toLatLng(item: VWorldItem): { lat: number; lng: number } | null {
  const lng = item.point?.x ? parseFloat(item.point.x) : NaN;
  const lat = item.point?.y ? parseFloat(item.point.y) : NaN;
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
}

async function geocode(rawAddress: string, region: string): Promise<GeocodeSuccess | GeocodeFailure> {
  const candidates = normalizeVolunteerAddress(rawAddress, region);
  const triedQueries: string[] = [];
  const regionStr = region.trim();

  // 각 후보마다: ADDRESS(ROAD) → ADDRESS(PARCEL) → PLACE → REGION+PLACE
  for (const query of candidates) {
    triedQueries.push(query);

    const road = await searchVWorld(query, 'ROAD');
    if (road) { const ll = toLatLng(road); if (ll) return { found: true, ...ll, resolvedQuery: query, matchedType: 'ROAD', triedQueries }; }

    const parcel = await searchVWorld(query, 'PARCEL');
    if (parcel) { const ll = toLatLng(parcel); if (ll) return { found: true, ...ll, resolvedQuery: query, matchedType: 'PARCEL', triedQueries }; }

    const place = await searchVWorldPlace(query);
    if (place) { const ll = toLatLng(place); if (ll) return { found: true, ...ll, resolvedQuery: query, matchedType: 'PLACE', triedQueries }; }

    if (regionStr) {
      const rq = `${regionStr} ${query}`.replace(/\s{2,}/g, ' ').trim();
      if (rq !== query) {
        triedQueries.push(rq);
        const regionPlace = await searchVWorldPlace(rq);
        if (regionPlace) { const ll = toLatLng(regionPlace); if (ll) return { found: true, ...ll, resolvedQuery: rq, matchedType: 'REGION_PLACE', triedQueries }; }
      }
    }
  }

  // DISTRICT fallback — 끝 토큰이 행정구역인 후보 + region 자체
  const lastTok = (s: string) => s.trim().split(/\s+/).pop() ?? '';
  const districtCandidates = candidates.filter(c => /[동읍면리시군구]$/.test(lastTok(c)));
  if (regionStr && !districtCandidates.includes(regionStr)) districtCandidates.push(regionStr);

  const seenDistrict = new Set<string>();
  for (const query of districtCandidates) {
    for (const cat of ['L4', 'L2'] as const) {
      const dq = `[DISTRICT-${cat}] ${query}`;
      if (!seenDistrict.has(dq)) { seenDistrict.add(dq); triedQueries.push(dq); }
      const district = await searchVWorldDistrict(query, cat);
      if (district) { const ll = toLatLng(district); if (ll) return { found: true, ...ll, resolvedQuery: query, matchedType: 'DISTRICT', triedQueries }; }
    }
  }

  return { found: false, triedQueries };
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

interface SuccessRecord {
  title: string;
  rawAddress: string;
  normalizedCandidates: string[];
  resolvedQuery: string;
  matchedType: MatchedType;
  confidence: 'exact' | 'fallback';
  lat: number;
  lng: number;
}

interface FailureRecord {
  title: string;
  rawAddress: string;
  region: string;
  normalizedCandidates: string[];
  triedQueries: string[];
  failedStage: string;
}

const CONCURRENCY = 3;

async function runBatch(items: RawVolunteerItem[]): Promise<{ success: SuccessRecord[]; failure: FailureRecord[] }> {
  const success: SuccessRecord[] = [];
  const failure: FailureRecord[] = [];
  let done = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (item) => {
        const region = [item.sidoNm, item.gugunNm].filter(Boolean).join(' ');
        const candidates = normalizeVolunteerAddress(item.actPlace, region);
        const result = await geocode(item.actPlace, region);

        done++;
        const pct = ((done / items.length) * 100).toFixed(1);
        process.stdout.write(`\r  지오코딩 중... ${done}/${items.length} (${pct}%)`);

        if (result.found) {
          success.push({
            title: item.progrmSj,
            rawAddress: item.actPlace,
            normalizedCandidates: candidates,
            resolvedQuery: result.resolvedQuery,
            matchedType: result.matchedType,
            confidence: result.resolvedQuery === candidates[0] ? 'exact' : 'fallback',
            lat: result.lat,
            lng: result.lng,
          });
        } else {
          failure.push({
            title: item.progrmSj,
            rawAddress: item.actPlace,
            region,
            normalizedCandidates: candidates,
            triedQueries: result.triedQueries,
            failedStage: 'address+place+district',
          });
        }
      }),
    );

    // VWorld API 부하 방지
    if (i + CONCURRENCY < items.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  process.stdout.write('\n');
  return { success, failure };
}

function writeJson(filepath: string, data: unknown): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  console.log('=== 1365 주소 정규화 품질 검증 ===\n');

  console.log(`[1/3] 1365 봉사활동 수집 (목표: ${SAMPLE_COUNT}건)`);
  let activities: RawVolunteerItem[];
  try {
    activities = await collectActivities(SAMPLE_COUNT);
  } catch (err) {
    console.error('1365 API 수집 실패:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  console.log(`  수집 완료: ${activities.length}건\n`);

  // 0건이면 지오코딩·파일 덮어쓰기 없이 종료
  if (activities.length === 0) {
    console.error('1365 활동을 수집하지 못했습니다. 위 API 응답을 확인하세요.');
    writeJson('logs/address-report.json', {
      testedAt: new Date().toISOString(),
      total: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      fetchError: '1365 API에서 활동을 수집하지 못했습니다.',
    });
    console.log('  logs/address-report.json 저장 완료 (fetchError 포함)');
    process.exit(1);
  }

  console.log('[2/3] 주소 정규화 및 지오코딩');
  const { success, failure } = await runBatch(activities);
  console.log('  완료\n');

  const total = activities.length;
  const successCount = success.length;
  const failureCount = failure.length;
  const successRate = ((successCount / total) * 100).toFixed(1);

  console.log('[3/3] 결과');
  console.log(`  총 테스트: ${total}건`);
  console.log(`  성공: ${successCount}건`);
  console.log(`  실패: ${failureCount}건`);
  console.log(`  성공률: ${successRate}%\n`);

  // 실패 샘플 10건 출력
  if (failure.length > 0) {
    console.log('── 실패 샘플 (최대 10건) ──');
    failure.slice(0, 10).forEach((f, i) => {
      console.log(`  [${i + 1}] ${f.title}`);
      console.log(`      원본: ${f.rawAddress}`);
      console.log(`      후보: [${f.normalizedCandidates.slice(0, 3).join(', ')}...]`);
    });
    console.log();
  }

  const report = {
    testedAt: new Date().toISOString(),
    total,
    successCount,
    failureCount,
    successRate: parseFloat(successRate),
    failedSamples: failure.slice(0, 30),
  };

  writeJson('data/address-success.json', success);
  writeJson('data/address-failures.json', failure);
  writeJson('logs/address-report.json', report);

  console.log('파일 저장 완료:');
  console.log('  data/address-success.json');
  console.log('  data/address-failures.json');
  console.log('  logs/address-report.json');

  if (parseFloat(successRate) < 80) {
    console.log('\n⚠️  성공률 80% 미만 — logs/address-report.json의 failedSamples를 분석하세요.');
  } else if (parseFloat(successRate) < 90) {
    console.log('\n📊 성공률 1차 목표 달성 (80%+). 90% 목표까지 개선 가능합니다.');
  } else if (parseFloat(successRate) < 95) {
    console.log('\n✅ 성공률 2차 목표 달성 (90%+). 95% 목표까지 개선 가능합니다.');
  } else {
    console.log('\n🎉 성공률 최종 목표 달성 (95%+).');
  }
}

main().catch((err) => {
  console.error('스크립트 오류:', err);
  process.exit(1);
});
