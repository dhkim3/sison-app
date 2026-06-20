// Self-contained Serverless Function — no external imports outside Node built-ins / fetch / process.env

declare const process: {
  env: Record<string, string | undefined>;
};

// ─── Vercel Types ─────────────────────────────────────────────────────────────

type VercelRequest = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

// ─── VWorld Types ─────────────────────────────────────────────────────────────

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

// ─── TourAPI Types ────────────────────────────────────────────────────────────

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

type TravelPlace = {
  id: string;
  title: string;
  address: string;
  image: string | null;
  lat: number;
  lng: number;
  distance: number;
  contentTypeId: string;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  roadAddress: string | null;
  parcelAddress: string | null;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseNum(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

function qs(query: Record<string, string | string[]>, key: string): string {
  const v = query[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

// ─── VWorld Geocoding ─────────────────────────────────────────────────────────

const VWORLD_BASE = 'https://api.vworld.kr/req/search';
const VWORLD_BASE_PARAMS = {
  service: 'search', request: 'search', version: '2.0',
  format: 'json', crs: 'EPSG:4326', size: '5',
} as const;

async function vworldFetch(apiKey: string, extra: Record<string, string>): Promise<VWorldItem | null> {
  const params = new URLSearchParams({ ...VWORLD_BASE_PARAMS, ...extra, key: apiKey });
  let response: Response;
  try { response = await fetch(`${VWORLD_BASE}?${params.toString()}`); } catch { return null; }
  if (!response.ok) return null;
  let data: VWorldResponse;
  try { data = (await response.json()) as VWorldResponse; } catch { return null; }
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

// ─── Address Normalization ────────────────────────────────────────────────────

const ADDRESS_PREFIX_RE = /^(집결지|집합장소|모임장소|장소명?|집결|출발지|집합)\s*[:：\-·\s]\s*/;
const NOISE_TOKEN_SET = new Set([
  '입구','출구','앞','뒤','옆','안쪽','바깥쪽','정문','후문','측문',
  '주차장','주차','광장','공터','화장실','쉼터','캐노피','텐트','부스',
  '컨테이너','막구조물','안내판','현수막','인근','일원','일대','주변','부근','근처',
  '집결지','집합장소','만남의광장','선착장','중간선착장','공원입구','해변입구',
  '내','홀','로비',
]);
const INDOOR_SUFFIX_RE = /\s+(?:[A-Z]?\d+[층호실]|\d+번[호지]|강당|홀|로비|내)$/;

function hasAdminDivision(a: string) { return /[시군구](\s|$)|[동읍면리](\s|$)/.test(a); }
function extractUpToDong(a: string): string | null {
  const t = a.trim().split(/\s+/); let i = -1;
  for (let k = 0; k < t.length; k++) if (/동$|읍$|면$|리$/.test(t[k])) i = k;
  return i >= 0 ? t.slice(0, i + 1).join(' ') : null;
}
function extractSigungu(a: string): string | null {
  const t = a.trim().split(/\s+/); let i = -1;
  for (let k = 0; k < t.length; k++) if (/시$|군$|구$/.test(t[k])) i = k;
  return i >= 0 ? t.slice(0, i + 1).join(' ') : null;
}
function stripProvince(a: string): string | null {
  const t = a.trim().split(/\s+/); if (t.length < 2) return null;
  if (/도$|광역시$|특별시$|특별자치시$|특별자치도$/.test(t[0]) ||
    /^(경남|경북|전남|전북|충남|충북|강원|경기|제주|인천|대전|대구|부산|울산|광주|세종)$/.test(t[0])) {
    const r = t.slice(1).join(' '); return r.length > 0 ? r : null;
  }
  return null;
}
function trimNoiseTokens(a: string): string {
  const t = a.trim().split(/\s+/); let e = t.length;
  while (e > 0 && NOISE_TOKEN_SET.has(t[e - 1])) e--;
  return t.slice(0, e).join(' ');
}
function buildShrinkCandidates(a: string): string[] {
  const t = a.trim().split(/\s+/); const r: string[] = [];
  for (let e = t.length - 1; e >= 1; e--) {
    r.push(t.slice(0, e).join(' '));
    if (/시$|군$|구$|동$|읍$|면$|리$/.test(t[e - 1])) break;
  }
  return r;
}
function normalizeVolunteerAddress(rawAddress: string, region = ''): string[] {
  const seen = new Set<string>(); const result: string[] = [];
  const push = (addr: string) => {
    const q = addr.replace(/\s{2,}/g, ' ').trim();
    if (q.length > 1 && !seen.has(q)) { seen.add(q); result.push(q); }
  };
  let base = rawAddress.trim().replace(ADDRESS_PREFIX_RE, '');
  const bracketMatch = base.match(/\(([^)]{2,60})\)/);
  if (bracketMatch) {
    const inner = bracketMatch[1].replace(/[\r\n\t]+/g, ' ').trim();
    if (/\d+(?:길|로|번길|번지)|[시군구동읍면리]\s/.test(inner)) {
      push(inner);
      const r = extractSigungu(region) ?? (region.trim() ? region.trim().split(/\s+/).slice(0, 2).join(' ') : '');
      if (r && !inner.startsWith(r)) push(`${r} ${inner}`);
    }
  }
  base = base.replace(/\([^)]*\)/g,' ').replace(/【[^】]*】/g,' ').replace(/\[[^\]]*\]/g,' ')
    .replace(/['"'"]/g,'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim();
  base = base.replace(INDOOR_SUFFIX_RE, '').trim();
  push(base);
  const dashIdx = base.indexOf('-'); let addrBase = base;
  if (dashIdx > 0) { const after = base.slice(dashIdx + 1).trim(); if (after.length > 0) { push(after); addrBase = after; } }
  const denoised = trimNoiseTokens(addrBase);
  if (denoised !== addrBase && denoised.length > 0) { push(denoised); addrBase = denoised; }
  if (!hasAdminDivision(addrBase) && region.trim()) {
    const rp = extractSigungu(region) ?? region.trim().split(/\s+/).slice(0, 2).join(' ');
    if (rp) push(`${rp} ${addrBase}`); push(addrBase);
  }
  for (const c of buildShrinkCandidates(addrBase)) { push(c); const s = stripProvince(c); if (s) push(s); }
  const dong = extractUpToDong(addrBase); if (dong) { push(dong); const s = stripProvince(dong); if (s) push(s); }
  const sg = extractSigungu(addrBase); if (sg) { push(sg); const s = stripProvince(sg); if (s) push(s); }
  return result;
}

function toGeocodeResult(item: VWorldItem): GeocodeResult | null {
  const lng = parseNum(item.point?.x); const lat = parseNum(item.point?.y);
  if (lat === null || lng === null) return null;
  return { lat, lng, roadAddress: item.address?.road ?? null, parcelAddress: item.address?.parcel ?? null };
}

async function geocodeAddress(address: string, region = ''): Promise<GeocodeResult> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey) throw new Error('VWORLD_API_KEY가 설정되지 않았습니다.');
  const candidates = normalizeVolunteerAddress(address, region);
  const regionStr = region.trim();
  for (const query of candidates) {
    const road = await searchVWorld(apiKey, query, 'ROAD'); if (road) { const r = toGeocodeResult(road); if (r) return r; }
    const parcel = await searchVWorld(apiKey, query, 'PARCEL'); if (parcel) { const r = toGeocodeResult(parcel); if (r) return r; }
    const place = await searchVWorldPlace(apiKey, query); if (place) { const r = toGeocodeResult(place); if (r) return r; }
    if (regionStr) {
      const rq = `${regionStr} ${query}`.replace(/\s{2,}/g, ' ').trim();
      if (rq !== query) { const rp = await searchVWorldPlace(apiKey, rq); if (rp) { const r = toGeocodeResult(rp); if (r) return r; } }
    }
  }
  const lastTok = (s: string) => s.trim().split(/\s+/).pop() ?? '';
  const dc = candidates.filter(c => /[동읍면리시군구]$/.test(lastTok(c)));
  if (regionStr && !dc.includes(regionStr)) dc.push(regionStr);
  for (const query of dc) {
    for (const cat of ['L4', 'L2'] as const) {
      const d = await searchVWorldDistrict(apiKey, query, cat); if (d) { const r = toGeocodeResult(d); if (r) return r; }
    }
  }
  throw new Error('주소 좌표를 찾지 못했어요.');
}

// ─── TourAPI Nearby Places ────────────────────────────────────────────────────

function normalizeTourItems(items: TourApiItem[]): TravelPlace[] {
  const seen = new Set<string>(); const result: TravelPlace[] = [];
  for (const item of items) {
    const id = item.contentid?.trim(); const title = item.title?.trim();
    if (!id || !title || seen.has(id)) continue; seen.add(id);
    const lat = parseNum(item.mapy); const lng = parseNum(item.mapx);
    if (lat === null || lng === null) continue;
    const addr1 = item.addr1?.trim() ?? ''; const addr2 = item.addr2?.trim() ?? '';
    result.push({ id, title, address: addr2 ? `${addr1} ${addr2}`.trim() : addr1,
      image: item.firstimage?.trim() || item.firstimage2?.trim() || null,
      lat, lng, distance: parseInt(item.dist ?? '0', 10), contentTypeId: item.contenttypeid ?? '12' });
  }
  return result;
}

async function findNearbyPlaces(lat: number, lng: number): Promise<TravelPlace[]> {
  const serviceKey = process.env.TOUR_API_SERVICE_KEY?.trim();
  if (!serviceKey) throw new Error('TOUR_API_SERVICE_KEY가 설정되지 않았습니다.');
  const params = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'sison', _type: 'json',
    mapX: String(lng), mapY: String(lat), radius: '10000', contentTypeId: '12',
    numOfRows: '20', pageNo: '1', arrange: 'E' });
  const url = `https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=${serviceKey}&${params.toString()}`;
  const response = await fetch(url);
  const responseText = await response.text();
  if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}: ${responseText.slice(0, 200)}`);
  let data: TourApiResponse;
  try { data = JSON.parse(responseText) as TourApiResponse; }
  catch { throw new Error(`TourAPI 응답 파싱 실패: ${responseText.slice(0, 200)}`); }
  const resultCode = data.response?.header?.resultCode;
  if (resultCode && resultCode !== '0000')
    throw new Error(data.response?.header?.resultMsg ?? `TourAPI 오류 (${resultCode})`);
  const rawItems = data.response?.body?.items;
  const itemList: TourApiItem[] = rawItems && rawItems !== '' && Array.isArray(rawItems.item) ? rawItems.item : [];
  return normalizeTourItems(itemList);
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleGeocode(req: VercelRequest, res: VercelResponse): Promise<void> {
  let address = ''; let region = '';
  const q = req.query ?? {};
  if (req.method === 'GET') {
    address = qs(q, 'address').trim(); region = qs(q, 'region').trim();
  } else {
    const body = req.body as Record<string, unknown> | null | undefined;
    address = typeof body?.address === 'string' ? body.address.trim() : '';
    region = typeof body?.region === 'string' ? body.region.trim() : '';
  }
  if (!address) { res.status(400).json({ ok: false, error: '주소를 입력해주세요.' }); return; }
  try {
    const result = await geocodeAddress(address, region);
    res.status(200).json({ ok: true, address, ...result, source: 'vworld' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    res.status(message.includes('찾지 못했어요') ? 200 : 500).json({ ok: false, error: message });
  }
}

async function handleNearbyPlaces(req: VercelRequest, res: VercelResponse): Promise<void> {
  let lat: number | null = null; let lng: number | null = null;
  const q = req.query ?? {};
  if (req.method === 'GET') {
    lat = parseNum(qs(q, 'lat')); lng = parseNum(qs(q, 'lng'));
  } else {
    const body = req.body as Record<string, unknown> | null | undefined;
    lat = typeof body?.lat === 'number' ? body.lat : parseNum(String(body?.lat ?? ''));
    lng = typeof body?.lng === 'number' ? body.lng : parseNum(String(body?.lng ?? ''));
  }
  if (lat === null || lng === null) { res.status(400).json({ ok: false, error: 'lat, lng를 입력해주세요.' }); return; }
  try {
    const places = await findNearbyPlaces(lat, lng);
    res.status(200).json({ ok: true, center: { lat, lng }, places });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : '서버 오류가 발생했습니다.' });
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET 또는 POST 요청만 허용됩니다.' }); return;
  }
  const action = qs(req.query ?? {}, 'action');
  if (action === 'geocode') return handleGeocode(req, res);
  if (action === 'nearby-places') return handleNearbyPlaces(req, res);
  res.status(400).json({ ok: false, error: '?action=geocode 또는 ?action=nearby-places가 필요합니다.' });
}
