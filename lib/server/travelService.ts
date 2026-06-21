declare const process: {
  env: Record<string, string | undefined>;
};

// ─── Public Types ────────────────────────────────────────────────────────────

export type TravelPlace = {
  id: string;
  title: string;
  address: string;
  image: string | null;
  lat: number;
  lng: number;
  distance: number;
  contentTypeId: string;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  roadAddress: string | null;
  parcelAddress: string | null;
};

export type TravelRegionKey = '서울' | '부산' | '제주' | '강릉';

export type ActivityNearbyResult = {
  lat: number;
  lng: number;
  places: TravelPlace[];
};

// ─── Internal Types ──────────────────────────────────────────────────────────

type VWorldItem = {
  address?: { road?: string; parcel?: string };
  point?: { x?: string; y?: string };
};

type VWorldResponse = {
  response?: {
    status?: string;
    result?: { total?: string; items?: VWorldItem[] };
    error?: { code?: string; text?: string };
  };
};

type TourApiItem = {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  firstimage?: string;
  firstimage2?: string;
  mapy?: string;
  mapx?: string;
  dist?: string;
  contenttypeid?: string;
};

type TourApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { totalCount?: number; items?: { item?: TourApiItem[] } | '' };
  };
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function parseNum(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

const TRAVEL_REGION_RULES: Record<TravelRegionKey, {
  aliases: RegExp[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}> = {
  서울: {
    aliases: [/서울|서울특별시|마포구|종로구|중구|성동구|강남구|서초구|송파구|용산구/],
    bounds: { minLat: 37.40, maxLat: 37.72, minLng: 126.75, maxLng: 127.20 },
  },
  부산: {
    aliases: [/부산|부산광역시|수영구|해운대구|광안리|광안|동래구|남구|중구/],
    bounds: { minLat: 35.00, maxLat: 35.40, minLng: 128.75, maxLng: 129.35 },
  },
  제주: {
    aliases: [/제주|제주시|서귀포|서귀포시|제주특별자치도|제주동문|동문시장|이호테우/],
    bounds: { minLat: 33.05, maxLat: 33.65, minLng: 126.10, maxLng: 127.05 },
  },
  강릉: {
    aliases: [/강릉|강릉시|강원\s*강릉|강원특별자치도\s*강릉|경포|주문진/],
    bounds: { minLat: 37.55, maxLat: 37.95, minLng: 128.65, maxLng: 129.15 },
  },
};

export function inferTravelRegion(...values: Array<string | null | undefined>): TravelRegionKey | null {
  const source = values.filter(Boolean).join(' ');
  if (!source.trim()) return null;

  for (const [region, rule] of Object.entries(TRAVEL_REGION_RULES) as Array<[TravelRegionKey, typeof TRAVEL_REGION_RULES[TravelRegionKey]]>) {
    if (rule.aliases.some((alias) => alias.test(source))) return region;
  }

  return null;
}

export function isCoordinateInTravelRegion(lat: number, lng: number, region: TravelRegionKey): boolean {
  const { bounds } = TRAVEL_REGION_RULES[region];
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

export function isPlaceInTravelRegion(place: Pick<TravelPlace, 'title' | 'address' | 'lat' | 'lng'>, region: TravelRegionKey): boolean {
  const text = `${place.title} ${place.address}`;
  const textRegion = inferTravelRegion(text);
  if (textRegion) return textRegion === region;
  return isCoordinateInTravelRegion(place.lat, place.lng, region);
}

function prioritizeRegionCandidates(candidates: string[], region: TravelRegionKey | null): string[] {
  if (!region) return candidates;

  const rule = TRAVEL_REGION_RULES[region];
  return [...candidates].sort((a, b) => {
    const aMatches = rule.aliases.some((alias) => alias.test(a));
    const bMatches = rule.aliases.some((alias) => alias.test(b));
    if (aMatches === bMatches) return 0;
    return aMatches ? -1 : 1;
  });
}

// ─── VWorld ──────────────────────────────────────────────────────────────────

const VWORLD_BASE = 'https://api.vworld.kr/req/search';
const VWORLD_BASE_PARAMS = {
  service: 'search',
  request: 'search',
  version: '2.0',
  format: 'json',
  crs: 'EPSG:4326',
  size: '5',
} as const;

async function vworldFetch(apiKey: string, extra: Record<string, string>): Promise<VWorldItem | null> {
  const params = new URLSearchParams({ ...VWORLD_BASE_PARAMS, ...extra, key: apiKey });
  let response: Response;
  try {
    response = await fetch(`${VWORLD_BASE}?${params.toString()}`);
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let data: VWorldResponse;
  try {
    data = (await response.json()) as VWorldResponse;
  } catch {
    return null;
  }
  if (data?.response?.status !== 'OK') return null;
  const items = data.response?.result?.items;
  return items && items.length > 0 ? items[0] : null;
}

function searchVWorld(apiKey: string, query: string, category: 'ROAD' | 'PARCEL'): Promise<VWorldItem | null> {
  return vworldFetch(apiKey, { type: 'address', category, query });
}

function searchVWorldPlace(apiKey: string, query: string): Promise<VWorldItem | null> {
  return vworldFetch(apiKey, { type: 'place', query });
}

function searchVWorldDistrict(apiKey: string, query: string, category: 'L4' | 'L2'): Promise<VWorldItem | null> {
  return vworldFetch(apiKey, { type: 'district', category, query });
}

// ─── 1365 집결지 주소 정규화 엔진 ────────────────────────────────────────────

// 접두어: "집결지 :", "모임장소 -" 등
const ADDRESS_PREFIX_RE =
  /^(집결지|집합장소|모임장소|장소명?|집결|출발지|집합)\s*[:：\-·\s]\s*/;

// 노이즈 토큰: 공백 기준으로 끝에서부터 제거
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

// 행정구역 토큰(시/군/구/동/읍/면/리)이 있는지 확인
function hasAdminDivision(address: string): boolean {
  return /[시군구](\s|$)|[동읍면리](\s|$)/.test(address);
}

// 동/읍/면/리까지 추출
function extractUpToDong(address: string): string | null {
  const tokens = address.trim().split(/\s+/);
  let lastIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/동$|읍$|면$|리$/.test(tokens[i])) lastIdx = i;
  }
  return lastIdx >= 0 ? tokens.slice(0, lastIdx + 1).join(' ') : null;
}

// 시/군/구까지 추출
function extractSigungu(address: string): string | null {
  const tokens = address.trim().split(/\s+/);
  let lastIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/시$|군$|구$/.test(tokens[i])) lastIdx = i;
  }
  return lastIdx >= 0 ? tokens.slice(0, lastIdx + 1).join(' ') : null;
}

// 도/광역시 등 최상위 행정단위 제거 (VWorld 검색 폭 확장용)
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

// 끝에서부터 노이즈 토큰 제거
function trimNoiseTokens(address: string): string {
  const tokens = address.trim().split(/\s+/);
  let end = tokens.length;
  while (end > 0 && NOISE_TOKEN_SET.has(tokens[end - 1])) end--;
  return tokens.slice(0, end).join(' ');
}

// 끝에 붙은 실내 위치 표현 제거 (3층, B101호, 강당, 내 등)
// "모두의책뜰 3층" → "모두의책뜰", "플러스그룹홈 내" → "플러스그룹홈"
const INDOOR_SUFFIX_RE = /\s+(?:[A-Z]?\d+[층호실]|\d+번[호지]|강당|홀|로비|내)$/;
function stripIndoorSuffix(text: string): string {
  return text.replace(INDOOR_SUFFIX_RE, '').trim();
}

// 뒤에서 한 토큰씩 제거 (행정단위에서 멈춤)
function buildShrinkCandidates(address: string): string[] {
  const tokens = address.trim().split(/\s+/);
  const results: string[] = [];
  for (let end = tokens.length - 1; end >= 1; end--) {
    results.push(tokens.slice(0, end).join(' '));
    if (/시$|군$|구$|동$|읍$|면$|리$/.test(tokens[end - 1])) break;
  }
  return results;
}

/**
 * 1365 자유형 집결지 주소를 VWorld 검색 후보 배열로 정규화.
 * 구체적인 것부터 추상적인 것 순서로 반환하며, 중복은 제거된다.
 *
 * 예) "집결지 : 경남 남해군 미조면 송정솔바람해변 캠핑장 입구 캐노피"
 *   → ["경남 남해군 미조면 송정솔바람해변 캠핑장",
 *       "경남 남해군 미조면 송정솔바람해변",
 *       "남해군 미조면 송정솔바람해변",
 *       "경남 남해군 미조면", "남해군 미조면",
 *       "경남 남해군", "남해군"]
 */
export function normalizeVolunteerAddress(rawAddress: string, region = ''): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (addr: string) => {
    const q = addr.replace(/\s{2,}/g, ' ').trim();
    if (q.length > 1 && !seen.has(q)) {
      seen.add(q);
      result.push(q);
    }
  };

  // 1. 접두어 제거
  let base = rawAddress.trim().replace(ADDRESS_PREFIX_RE, '');

  // 1-b. 괄호 안 주소 우선 추출 — 숫자+길/로 또는 행정구역+숫자 패턴이면 최우선 후보로 등록
  // 예) "여수시육아종합지원센터(웅천6길47)" → "웅천6길47" 최우선 시도
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

  // 2. 괄호·따옴표·줄바꿈 제거
  base = base
    .replace(/\([^)]*\)/g, ' ')
    .replace(/【[^】]*】/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/['"'"]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 2-b. 실내 위치 표현 제거 (끝에 붙은 층/호/강당/내 등)
  base = stripIndoorSuffix(base);

  // 3. 정제된 원본 추가
  push(base);

  // 4. '-' 뒤 실제 주소 추출 (장소명 - 경기도 시흥시 정왕동)
  const dashIdx = base.indexOf('-');
  let addrBase = base;
  if (dashIdx > 0) {
    const afterDash = base.slice(dashIdx + 1).trim();
    if (afterDash.length > 0) {
      push(afterDash);
      addrBase = afterDash;
    }
  }

  // 5. 노이즈 접미 토큰 제거 (입구/캐노피/주차장 등)
  const denoised = trimNoiseTokens(addrBase);
  if (denoised !== addrBase && denoised.length > 0) {
    push(denoised);
    addrBase = denoised;
  }

  // 6. 행정구역 없는 관광지명 → 지역명 + 관광지명 조합으로 보강
  if (!hasAdminDivision(addrBase) && region.trim()) {
    const regionPart =
      extractSigungu(region) ??
      region.trim().split(/\s+/).slice(0, 2).join(' ');
    if (regionPart) push(`${regionPart} ${addrBase}`);
    push(addrBase);
  }

  // 7. 단계적 축약 (구체 → 추상) + 도 단위 제거 버전 병행
  for (const candidate of buildShrinkCandidates(addrBase)) {
    push(candidate);
    const stripped = stripProvince(candidate);
    if (stripped) push(stripped);
  }

  // 8. 동/읍/면 단위
  const dong = extractUpToDong(addrBase);
  if (dong) {
    push(dong);
    const stripped = stripProvince(dong);
    if (stripped) push(stripped);
  }

  // 9. 시/군/구 단위 (최후 폴백)
  const sigungu = extractSigungu(addrBase);
  if (sigungu) {
    push(sigungu);
    const stripped = stripProvince(sigungu);
    if (stripped) push(stripped);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

function toGeocodeResult(item: VWorldItem): GeocodeResult | null {
  const lng = parseNum(item.point?.x);
  const lat = parseNum(item.point?.y);
  if (lat === null || lng === null) return null;
  return {
    lat,
    lng,
    roadAddress: item.address?.road ?? null,
    parcelAddress: item.address?.parcel ?? null,
  };
}

export async function geocodeAddress(address: string, region = ''): Promise<GeocodeResult> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey) throw new Error('VWORLD_API_KEY가 설정되지 않았습니다.');

  const expectedRegion = inferTravelRegion(region, address);
  const candidates = prioritizeRegionCandidates(normalizeVolunteerAddress(address, region), expectedRegion);
  const regionStr = region.trim();
  const isAllowedResult = (result: GeocodeResult) => {
    if (!expectedRegion) return true;
    const addressRegion = inferTravelRegion(result.roadAddress, result.parcelAddress);
    if (addressRegion) return addressRegion === expectedRegion;
    return isCoordinateInTravelRegion(result.lat, result.lng, expectedRegion);
  };

  // 각 후보마다: ADDRESS(ROAD) → ADDRESS(PARCEL) → PLACE → REGION+PLACE
  for (const query of candidates) {
    const road = await searchVWorld(apiKey, query, 'ROAD');
    if (road) { const r = toGeocodeResult(road); if (r && isAllowedResult(r)) return r; }

    const parcel = await searchVWorld(apiKey, query, 'PARCEL');
    if (parcel) { const r = toGeocodeResult(parcel); if (r && isAllowedResult(r)) return r; }

    const place = await searchVWorldPlace(apiKey, query);
    if (place) { const r = toGeocodeResult(place); if (r && isAllowedResult(r)) return r; }

    if (regionStr) {
      const rq = `${regionStr} ${query}`.replace(/\s{2,}/g, ' ').trim();
      if (rq !== query) {
        const regionPlace = await searchVWorldPlace(apiKey, rq);
        if (regionPlace) { const r = toGeocodeResult(regionPlace); if (r && isAllowedResult(r)) return r; }
      }
    }
  }

  // DISTRICT fallback — 행정구역 단위 후보(동/읍/면/리/시/군/구로 끝나는 것) + region
  const lastTok = (s: string) => s.trim().split(/\s+/).pop() ?? '';
  const districtCandidates = candidates.filter(c => /[동읍면리시군구]$/.test(lastTok(c)));
  if (regionStr && !districtCandidates.includes(regionStr)) districtCandidates.push(regionStr);

  for (const query of districtCandidates) {
    for (const cat of ['L4', 'L2'] as const) {
      const district = await searchVWorldDistrict(apiKey, query, cat);
      if (district) { const r = toGeocodeResult(district); if (r && isAllowedResult(r)) return r; }
    }
  }

  throw new Error('주소 좌표를 찾지 못했어요.');
}

// ─── TourAPI ─────────────────────────────────────────────────────────────────

function normalizeTourItems(items: TourApiItem[]): TravelPlace[] {
  const seen = new Set<string>();
  const result: TravelPlace[] = [];

  for (const item of items) {
    const id = item.contentid?.trim();
    const title = item.title?.trim();
    if (!id || !title) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const lat = parseNum(item.mapy);
    const lng = parseNum(item.mapx);
    if (lat === null || lng === null) continue;

    const addr1 = item.addr1?.trim() ?? '';
    const addr2 = item.addr2?.trim() ?? '';

    result.push({
      id,
      title,
      address: addr2 ? `${addr1} ${addr2}`.trim() : addr1,
      image: item.firstimage?.trim() || item.firstimage2?.trim() || null,
      lat,
      lng,
      distance: parseInt(item.dist ?? '0', 10),
      contentTypeId: item.contenttypeid ?? '12',
    });
  }

  return result;
}

export async function findNearbyPlaces(lat: number, lng: number): Promise<TravelPlace[]> {
  const serviceKey = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!serviceKey) throw new Error('TOUR_API_SERVICE_KEY가 설정되지 않았습니다.');

  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'sison',
    _type: 'json',
    mapX: String(lng),
    mapY: String(lat),
    radius: '10000',
    contentTypeId: '12',
    numOfRows: '20',
    pageNo: '1',
    arrange: 'E',
  });

  const base = 'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';
  const url = `${base}?serviceKey=${serviceKey}&${params.toString()}`;

  const response = await fetch(url);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`TourAPI HTTP ${response.status}: ${responseText.slice(0, 200)}`);
  }

  let data: TourApiResponse;
  try {
    data = JSON.parse(responseText) as TourApiResponse;
  } catch {
    throw new Error(`TourAPI 응답 파싱 실패: ${responseText.slice(0, 200)}`);
  }

  const resultCode = data.response?.header?.resultCode;
  if (resultCode && resultCode !== '0000') {
    throw new Error(data.response?.header?.resultMsg ?? `TourAPI 오류 (${resultCode})`);
  }

  const rawItems = data.response?.body?.items;
  const itemList: TourApiItem[] =
    rawItems && Array.isArray(rawItems.item) ? rawItems.item : [];

  return normalizeTourItems(itemList);
}

// ─── Combined ────────────────────────────────────────────────────────────────

export async function getActivityNearbyPlaces(address: string): Promise<ActivityNearbyResult> {
  const { lat, lng } = await geocodeAddress(address);
  const places = await findNearbyPlaces(lat, lng);
  return { lat, lng, places };
}
