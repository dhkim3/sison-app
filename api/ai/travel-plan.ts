// Self-contained Serverless Function — no external imports outside Node built-ins / fetch / process.env

declare const process: {
  env: Record<string, string | undefined>;
};

// ─── Vercel Types ─────────────────────────────────────────────────────────────

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

// ─── VWorld / TourAPI Internal Types ─────────────────────────────────────────

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

// ─── Public Service Types ─────────────────────────────────────────────────────

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

// ─── VWorld Geocoding ─────────────────────────────────────────────────────────

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

// ─── Address Normalization Engine ─────────────────────────────────────────────

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

async function geocodeAddress(address: string, region = ''): Promise<GeocodeResult> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey) throw new Error('VWORLD_API_KEY가 설정되지 않았습니다.');

  const candidates = normalizeVolunteerAddress(address, region);
  const regionStr = region.trim();

  for (const query of candidates) {
    const road = await searchVWorld(apiKey, query, 'ROAD');
    if (road) { const r = toGeocodeResult(road); if (r) return r; }

    const parcel = await searchVWorld(apiKey, query, 'PARCEL');
    if (parcel) { const r = toGeocodeResult(parcel); if (r) return r; }

    const place = await searchVWorldPlace(apiKey, query);
    if (place) { const r = toGeocodeResult(place); if (r) return r; }

    if (regionStr) {
      const rq = `${regionStr} ${query}`.replace(/\s{2,}/g, ' ').trim();
      if (rq !== query) {
        const regionPlace = await searchVWorldPlace(apiKey, rq);
        if (regionPlace) { const r = toGeocodeResult(regionPlace); if (r) return r; }
      }
    }
  }

  const lastTok = (s: string) => s.trim().split(/\s+/).pop() ?? '';
  const districtCandidates = candidates.filter(c => /[동읍면리시군구]$/.test(lastTok(c)));
  if (regionStr && !districtCandidates.includes(regionStr)) districtCandidates.push(regionStr);

  for (const query of districtCandidates) {
    for (const cat of ['L4', 'L2'] as const) {
      const district = await searchVWorldDistrict(apiKey, query, cat);
      if (district) { const r = toGeocodeResult(district); if (r) return r; }
    }
  }

  throw new Error('주소 좌표를 찾지 못했어요.');
}

// ─── TourAPI ──────────────────────────────────────────────────────────────────

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

async function findNearbyPlaces(lat: number, lng: number): Promise<TravelPlace[]> {
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
    rawItems && rawItems !== '' && Array.isArray(rawItems.item) ? rawItems.item : [];

  return normalizeTourItems(itemList);
}

// ─── Travel Plan Input Types ──────────────────────────────────────────────────

type InputPlace = {
  id: string;
  title: string;
  address?: string;
  distance?: number;
  contentTypeId?: string;
  image?: string | null;
};

type ActivityInfo = {
  title: string;
  address?: string;
};

// ─── GPT Raw Output Types ─────────────────────────────────────────────────────

type RawStop = {
  id: string;
};

type RawPlan = {
  duration: string;
  stops: RawStop[];
};

type RawResponse = {
  plans: RawPlan[];
};

// ─── Public Output Types ──────────────────────────────────────────────────────

type PlaceStop = {
  type: 'place';
  id: string;
  title: string;
  address: string;
  distance: number;
  contentTypeId: string;
  image: string | null;
  overview: string | null;
};
type Stop = PlaceStop;

type TravelPlan = {
  title: string;
  summary: string;
  duration: string;
  maxDistanceM: number;
  stops: Stop[];
};

// ─── JSON Schema ──────────────────────────────────────────────────────────────

const travelPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plans'],
  properties: {
    plans: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['duration', 'stops'],
        properties: {
          duration: { type: 'string' },
          stops: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id'],
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// ─── Category Classification ──────────────────────────────────────────────────

type PlaceMeta = { title: string; address: string; contentTypeId: string; distance: number; image: string | null };

function classifyCategory(placeStops: PlaceStop[], metaMap: Map<string, PlaceMeta>): string {
  const counts: Record<string, number> = {
    food: 0, sea: 0, view: 0, history: 0, sport: 0, nature: 0,
  };

  for (const stop of placeStops) {
    const meta = metaMap.get(stop.id);
    if (!meta) continue;
    const { contentTypeId, title } = meta;

    if (contentTypeId === '39' || contentTypeId === '38') { counts.food++; continue; }
    if (contentTypeId === '28') { counts.sport++; continue; }
    if (/해수욕장|해변|해안|바다|항구|포구|섬|선착장|갯벌|방파제/.test(title)) { counts.sea++; continue; }
    if (/전망대|타워|정상|전망/.test(title)) { counts.view++; continue; }
    if (
      contentTypeId === '14' ||
      /사찰|절|향교|성[^공]|궁|유적|박물관|고택|전통|역사/.test(title)
    ) { counts.history++; continue; }
    if (/산|계곡|폭포|공원|숲|자연|호수|저수지|캠핑|둘레길/.test(title)) { counts.nature++; continue; }
    counts.nature++;
  }

  return (
    ['food', 'sea', 'view', 'history', 'sport', 'nature']
      .find((k) => counts[k] > 0) ?? 'nature'
  );
}

const PLAN_META: Record<string, { title: string; summary: string }> = {
  history: {
    title: '역사 탐방 코스',
    summary: '봉사 후 지역의 역사·문화 명소를 둘러보는 일정이에요.',
  },
  nature: {
    title: '자연 산책 코스',
    summary: '봉사 후 가까운 자연 명소를 가볍게 둘러보는 일정이에요.',
  },
  food: {
    title: '먹거리 여행 코스',
    summary: '봉사 후 지역 먹거리와 관광지를 함께 즐기는 일정이에요.',
  },
  sea: {
    title: '바다 풍경 코스',
    summary: '봉사 후 바닷가 명소를 따라 걷는 일정이에요.',
  },
  view: {
    title: '전망 명소 코스',
    summary: '봉사 후 지역 전망 명소를 찾아보는 일정이에요.',
  },
  sport: {
    title: '액티비티 코스',
    summary: '봉사 후 가볍게 즐길 수 있는 레포츠 코스예요.',
  },
};

const FALLBACK_LABELS = ['탐방 코스', '여행 코스', '관광 코스'];

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePlans(rawPlans: RawPlan[], metaMap: Map<string, PlaceMeta>): TravelPlan[] {
  console.log('[travel-plan] response validation start', { rawPlansCount: rawPlans.length });
  const usedCategories: string[] = [];
  const result: TravelPlan[] = [];

  for (let i = 0; i < rawPlans.length; i++) {
    const plan = rawPlans[i];
    const duration = plan.duration?.trim();
    if (!duration || !Array.isArray(plan.stops)) {
      console.warn('[travel-plan] plan validation fail', {
        planIndex: i,
        reason: !duration ? 'missing duration' : 'stops is not array',
      });
      continue;
    }

    const placeStops: PlaceStop[] = [];
    let valid = true;
    let failedStopId: string | undefined;
    let failedReason: string | undefined;

    for (const stop of plan.stops) {
      const id = typeof stop.id === 'string' ? stop.id.trim() : '';
      if (!id) {
        valid = false;
        failedReason = 'empty stop id';
        break;
      }
      const meta = metaMap.get(id);
      if (!meta) {
        valid = false;
        failedStopId = id;
        failedReason = 'id not in metaMap';
        break;
      }
      placeStops.push({
        type: 'place',
        id,
        title: meta.title,
        address: meta.address,
        distance: meta.distance,
        contentTypeId: meta.contentTypeId,
        image: meta.image,
        overview: null,
      });
    }

    if (!valid || placeStops.length < 2) {
      console.warn('[travel-plan] plan validation fail', {
        planIndex: i,
        duration,
        reason: !valid ? failedReason : 'placeStops < 2',
        failedStopId,
        placeStopsCount: placeStops.length,
        rawStopsCount: plan.stops.length,
      });
      continue;
    }

    const category = classifyCategory(placeStops, metaMap);
    const planMeta = PLAN_META[category] ?? PLAN_META.nature;
    let { title, summary } = planMeta;

    if (usedCategories.includes(category)) {
      const fallback = FALLBACK_LABELS[usedCategories.filter((c) => c === category).length - 1]
        ?? FALLBACK_LABELS[FALLBACK_LABELS.length - 1];
      title = `${title.replace(/\s+코스$/, '')} · ${fallback}`;
    }
    usedCategories.push(category);

    const maxDistanceM = Math.max(0, ...placeStops.map((s) => s.distance));

    result.push({ title, summary, duration, maxDistanceM, stops: placeStops });
  }

  console.log('[travel-plan] response validation complete', { validPlanCount: result.length });
  return result;
}

// ─── OpenAI Call ──────────────────────────────────────────────────────────────

type OpenAIPayload = {
  error?: { message?: string };
  choices?: Array<{ message?: { content?: string } }>;
};

async function callOpenAI(
  apiKey: string,
  destination: string,
  date: string,
  timePreference: string,
  activity: ActivityInfo,
  places: InputPlace[],
): Promise<RawResponse | null> {
  const placesForPrompt = places.map((p) => ({
    id: p.id,
    title: p.title,
    contentTypeId: p.contentTypeId ?? '12',
    distanceM: p.distance ?? 0,
  }));

  console.log('[travel-plan] openai request start', {
    model: 'gpt-4.1-mini',
    destination,
    placesCount: places.length,
    placeIds: places.map((p) => p.id).slice(0, 5),
  });

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.8,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: [
              '당신은 여행 동선 전문가입니다.',
              '',
              '절대적 규칙:',
              '- stops의 id는 반드시 아래 places 배열의 id 값만 사용하세요.',
              '- places에 없는 id는 사용 금지입니다.',
              '',
              '일정 구성:',
              '- 관광지만 stops에 포함하세요 (봉사활동 제외).',
              '- 각 일정은 2~5개 관광지로 구성하세요.',
              '- distanceM이 가까운 장소를 우선 고려하세요.',
              '- 총 예상 소요 시간이 timePreference 범위 안에 들어와야 합니다.',
              '',
              '차별화 (필수):',
              '- 3개 일정은 서로 다른 성격의 장소 조합을 만드세요.',
              '- 예) 역사·문화 중심 / 자연·산책 중심 / 먹거리·시장 중심.',
              '- 한 장소가 여러 일정에 중복되면 안 됩니다.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              destination,
              date,
              timePreference,
              activity: { title: activity.title, address: activity.address ?? '' },
              places: placesForPrompt,
              request: '성격이 서로 다른 여행 일정 3개를 만들어주세요. 각 일정은 다른 장소 조합이어야 합니다.',
            }),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'travel_plan',
            strict: true,
            schema: travelPlanSchema,
          },
        },
      }),
    });
  } catch (err) {
    console.error('[travel-plan] openai fetch fail', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }

  console.log('[travel-plan] openai response received', { status: response.status, ok: response.ok });

  let payload: OpenAIPayload;
  try {
    payload = (await response.json()) as OpenAIPayload;
  } catch (err) {
    console.error('[travel-plan] openai response json parse fail', {
      status: response.status,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  if (!response.ok) {
    console.error('[travel-plan] openai error', {
      status: response.status,
      error: payload.error?.message,
    });
    return null;
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    console.error('[travel-plan] openai content empty', {
      choicesCount: payload.choices?.length ?? 0,
      firstChoice: payload.choices?.[0],
    });
    return null;
  }

  try {
    const parsed = JSON.parse(content) as RawResponse;
    console.log('[travel-plan] openai success', { rawPlansCount: parsed.plans?.length ?? 0 });
    return parsed;
  } catch (err) {
    console.error('[travel-plan] openai content json parse fail', {
      message: err instanceof Error ? err.message : String(err),
      contentPreview: content.slice(0, 300),
    });
    return null;
  }
}

// ─── Request Body Parser ──────────────────────────────────────────────────────

function parseBody(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function getString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// ─── TourAPI Detail Common (overview 조회) ────────────────────────────────────

type DetailCommonResponse = {
  response?: {
    header?: { resultCode?: string };
    body?: { items?: { item?: Array<{ overview?: string }> } | '' };
  };
};

async function fetchPlaceOverview(contentId: string, serviceKey: string): Promise<string | null> {
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'sison',
    _type: 'json',
    defaultYN: 'N',
    addrinfoYN: 'N',
    overviewYN: 'Y',
    contentId,
  });
  try {
    const res = await fetch(
      `https://apis.data.go.kr/B551011/KorService2/detailCommon2?serviceKey=${serviceKey}&${params.toString()}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DetailCommonResponse;
    if (data.response?.header?.resultCode !== '0000') return null;
    const items = data.response?.body?.items;
    if (!items || items === '') return null;
    const raw = items.item?.[0]?.overview?.trim() ?? null;
    if (!raw) return null;
    const clean = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > 100 ? clean.slice(0, 97) + '...' : clean;
  } catch {
    return null;
  }
}

async function enrichPlansWithOverviews(plans: TravelPlan[], serviceKey: string): Promise<TravelPlan[]> {
  const uniqueIds = new Set<string>();
  for (const plan of plans) {
    for (const stop of plan.stops) uniqueIds.add(stop.id);
  }

  const overviewMap = new Map<string, string | null>();
  await Promise.all(
    Array.from(uniqueIds).map(async (id) => {
      overviewMap.set(id, await fetchPlaceOverview(id, serviceKey));
    }),
  );

  return plans.map((plan) => ({
    ...plan,
    stops: plan.stops.map((stop) => ({
      ...stop,
      overview: overviewMap.get(stop.id) ?? null,
    })),
  }));
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error('[travel-plan] OPENAI_API_KEY 미설정');
    res.status(500).json({ ok: false, error: '일정을 만들지 못했어요.' });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ ok: false, error: '요청 형식이 올바르지 않아요.' });
    return;
  }

  const address = getString(body.address);
  const region = getString(body.region);
  const destination = getString(body.destination) || region;
  const date = getString(body.date);
  const timePreference = getString(body.timePreference);

  if (!address) {
    res.status(400).json({ ok: false, error: '봉사활동 주소가 없어요.' });
    return;
  }

  const activityRaw =
    body.activity && typeof body.activity === 'object' && !Array.isArray(body.activity)
      ? (body.activity as Record<string, unknown>)
      : null;

  if (!activityRaw) {
    res.status(400).json({ ok: false, error: '봉사활동 정보가 없어요.' });
    return;
  }

  const activity: ActivityInfo = {
    title: getString(activityRaw.title),
    address,
  };

  if (!activity.title) {
    res.status(400).json({ ok: false, error: '봉사활동 제목이 없어요.' });
    return;
  }

  const normalizedCandidates = normalizeVolunteerAddress(address, region);

  console.log('[travel-plan] start', {
    address,
    region,
    destination,
    date,
    timePreference,
    activityTitle: activity.title,
    normalizedCandidates,
  });

  try {
    // Step 1: 주소 → 좌표 (VWorld)
    console.log('[travel-plan] address normalize start', { candidatesCount: normalizedCandidates.length, candidates: normalizedCandidates });
    let geoLat: number;
    let geoLng: number;
    try {
      const geo = await geocodeAddress(address, region);
      geoLat = geo.lat;
      geoLng = geo.lng;
      console.log('[travel-plan] geocode success', { lat: geoLat, lng: geoLng });
    } catch (err) {
      console.error('[travel-plan:error] geocode fail', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        activity,
        address,
        normalizedCandidates,
      });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 2: 좌표 → 주변 관광지 (TourAPI)
    let nearby: TravelPlace[] = [];
    try {
      nearby = await findNearbyPlaces(geoLat, geoLng);
      console.log('[travel-plan] nearby places success', { count: nearby.length, titles: nearby.map((p) => p.title).slice(0, 5) });
    } catch (err) {
      console.error('[travel-plan:error] nearby places fail', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        lat: geoLat,
        lng: geoLng,
      });
    }

    if (nearby.length === 0) {
      console.error('[travel-plan:error] nearby places empty — 종료', { lat: geoLat, lng: geoLng });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 3: 메타맵 + InputPlace 구성
    const metaMap = new Map<string, PlaceMeta>(
      nearby.map((p) => [p.id, {
        title: p.title,
        address: p.address,
        contentTypeId: p.contentTypeId,
        distance: p.distance,
        image: p.image,
      }]),
    );

    const inputPlaces: InputPlace[] = nearby.map((p) => ({
      id: p.id,
      title: p.title,
      address: p.address,
      distance: p.distance,
      contentTypeId: p.contentTypeId,
      image: p.image,
    }));

    // Step 4: OpenAI 일정 생성 (실패 시 1회 재시도)
    let raw = await callOpenAI(apiKey, destination, date, timePreference, activity, inputPlaces);
    let plans = raw ? validatePlans(raw.plans ?? [], metaMap) : [];

    if (plans.length === 0) {
      console.log('[travel-plan] openai first attempt failed — retry', { rawNull: raw === null });
      raw = await callOpenAI(apiKey, destination, date, timePreference, activity, inputPlaces);
      plans = raw ? validatePlans(raw.plans ?? [], metaMap) : [];
    }

    if (plans.length === 0) {
      console.error('[travel-plan:error] itinerary generation failed — 0건 after retry', {
        rawNull: raw === null,
        activity,
        address,
        normalizedCandidates,
      });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    console.log('[travel-plan] itinerary generated', { planCount: plans.length });

    // Step 5: overview 조회 (실패해도 기본 설명으로 대체)
    const tourKey = process.env.TOUR_API_SERVICE_KEY?.trim() ?? '';
    if (tourKey) {
      plans = await enrichPlansWithOverviews(plans, tourKey);
    }

    console.log('[travel-plan] complete', { planCount: plans.length });
    res.status(200).json({ ok: true, plans });
  } catch (err) {
    console.error('[travel-plan:error]', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      activity,
      address,
      normalizedCandidates,
    });
    res.status(500).json({ ok: false, error: '일정을 만들지 못했어요.' });
  }
}
