import {
  geocodeAddress,
  findNearbyPlaces,
  type GeocodeResult,
  type TravelPlace,
} from '../../lib/server/travelService.js';

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

// ─── Travel Plan Types ────────────────────────────────────────────────────────

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

type RawStop = { id: string };
type RawPlan = { duration: string; stops: RawStop[] };
type RawResponse = { plans: RawPlan[] };

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

type PlaceMeta = { title: string; address: string; contentTypeId: string; distance: number; image: string | null };

// ─── JSON Schema ──────────────────────────────────────────────────────────────

const travelPlanSchema = {
  type: 'object', additionalProperties: false, required: ['plans'],
  properties: {
    plans: {
      type: 'array', minItems: 1, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, required: ['duration', 'stops'],
        properties: {
          duration: { type: 'string' },
          stops: {
            type: 'array', minItems: 2, maxItems: 5,
            items: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } },
          },
        },
      },
    },
  },
};

// ─── Category Classification ──────────────────────────────────────────────────

function classifyCategory(stops: PlaceStop[], meta: Map<string, PlaceMeta>): string {
  const c = { food: 0, sea: 0, view: 0, history: 0, sport: 0, nature: 0 };
  for (const s of stops) {
    const m = meta.get(s.id); if (!m) continue;
    const { contentTypeId: ct, title: t } = m;
    if (ct === '39' || ct === '38') { c.food++; continue; }
    if (ct === '28') { c.sport++; continue; }
    if (/해수욕장|해변|해안|바다|항구|포구|섬|선착장|갯벌|방파제/.test(t)) { c.sea++; continue; }
    if (/전망대|타워|정상|전망/.test(t)) { c.view++; continue; }
    if (ct === '14' || /사찰|절|향교|성[^공]|궁|유적|박물관|고택|전통|역사/.test(t)) { c.history++; continue; }
    c.nature++;
  }
  return ['food','sea','view','history','sport','nature'].find(k => c[k as keyof typeof c] > 0) ?? 'nature';
}

const PLAN_META: Record<string, { title: string; summary: string }> = {
  history: { title: '역사 탐방 코스', summary: '봉사 후 지역의 역사·문화 명소를 둘러보는 일정이에요.' },
  nature:  { title: '자연 산책 코스', summary: '봉사 후 가까운 자연 명소를 가볍게 둘러보는 일정이에요.' },
  food:    { title: '먹거리 여행 코스', summary: '봉사 후 지역 먹거리와 관광지를 함께 즐기는 일정이에요.' },
  sea:     { title: '바다 풍경 코스', summary: '봉사 후 바닷가 명소를 따라 걷는 일정이에요.' },
  view:    { title: '전망 명소 코스', summary: '봉사 후 지역 전망 명소를 찾아보는 일정이에요.' },
  sport:   { title: '액티비티 코스', summary: '봉사 후 가볍게 즐길 수 있는 레포츠 코스예요.' },
};
const FALLBACK_LABELS = ['탐방 코스', '여행 코스', '관광 코스'];

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePlans(rawPlans: RawPlan[], metaMap: Map<string, PlaceMeta>): TravelPlan[] {
  const usedCategories: string[] = [];
  const result: TravelPlan[] = [];
  for (const plan of rawPlans) {
    const duration = plan.duration?.trim();
    if (!duration || !Array.isArray(plan.stops)) continue;
    const placeStops: PlaceStop[] = [];
    let valid = true;
    for (const stop of plan.stops) {
      const id = typeof stop.id === 'string' ? stop.id.trim() : '';
      if (!id) { valid = false; break; }
      const m = metaMap.get(id);
      if (!m) { valid = false; break; }
      placeStops.push({ type: 'place', id, title: m.title, address: m.address, distance: m.distance, contentTypeId: m.contentTypeId, image: m.image, overview: null });
    }
    if (!valid || placeStops.length < 2) continue;
    const cat = classifyCategory(placeStops, metaMap);
    const pm = PLAN_META[cat] ?? PLAN_META.nature;
    let { title, summary } = pm;
    if (usedCategories.includes(cat)) {
      const fb = FALLBACK_LABELS[usedCategories.filter(c => c === cat).length - 1] ?? FALLBACK_LABELS[FALLBACK_LABELS.length - 1];
      title = `${title.replace(/\s+코스$/, '')} · ${fb}`;
    }
    usedCategories.push(cat);
    result.push({ title, summary, duration, maxDistanceM: Math.max(0, ...placeStops.map(s => s.distance)), stops: placeStops });
  }
  return result;
}

// ─── OpenAI Call ──────────────────────────────────────────────────────────────

type OpenAIPayload = {
  error?: { message?: string };
  choices?: Array<{ message?: { content?: string } }>;
};

async function callOpenAI(
  apiKey: string, destination: string, date: string,
  timePreference: string, activity: ActivityInfo, places: InputPlace[],
): Promise<RawResponse | null> {
  const placesForPrompt = places.map(p => ({ id: p.id, title: p.title, contentTypeId: p.contentTypeId ?? '12', distanceM: p.distance ?? 0 }));
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini', temperature: 0.8, max_tokens: 600,
        messages: [
          { role: 'system', content: [
            '당신은 여행 동선 전문가입니다.','',
            '절대적 규칙:','- stops의 id는 반드시 아래 places 배열의 id 값만 사용하세요.','- places에 없는 id는 사용 금지입니다.','',
            '일정 구성:','- 관광지만 stops에 포함하세요 (봉사활동 제외).','- 각 일정은 2~5개 관광지로 구성하세요.','- distanceM이 가까운 장소를 우선 고려하세요.','- 총 예상 소요 시간이 timePreference 범위 안에 들어와야 합니다.','',
            '차별화 (필수):','- 3개 일정은 서로 다른 성격의 장소 조합을 만드세요.','- 예) 역사·문화 중심 / 자연·산책 중심 / 먹거리·시장 중심.','- 한 장소가 여러 일정에 중복되면 안 됩니다.',
          ].join('\n') },
          { role: 'user', content: JSON.stringify({ destination, date, timePreference, activity: { title: activity.title, address: activity.address ?? '' }, places: placesForPrompt, request: '성격이 서로 다른 여행 일정 3개를 만들어주세요. 각 일정은 다른 장소 조합이어야 합니다.' }) },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'travel_plan', strict: true, schema: travelPlanSchema } },
      }),
    });
  } catch (err) {
    console.error('[travel-plan:error] openai fetch fail', err instanceof Error ? err.message : String(err));
    return null;
  }
  let payload: OpenAIPayload;
  try { payload = (await response.json()) as OpenAIPayload; }
  catch (err) { console.error('[travel-plan:error] openai json parse fail', response.status, err instanceof Error ? err.message : String(err)); return null; }
  if (!response.ok) { console.error('[travel-plan:error] openai error', response.status, payload.error?.message); return null; }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) { console.error('[travel-plan:error] openai content empty'); return null; }
  try { return JSON.parse(content) as RawResponse; }
  catch (err) { console.error('[travel-plan:error] openai content parse fail', err instanceof Error ? err.message : String(err)); return null; }
}

// ─── TourAPI Overview ─────────────────────────────────────────────────────────

type DetailCommonResponse = {
  response?: { header?: { resultCode?: string }; body?: { items?: { item?: Array<{ overview?: string }> } | '' } };
};

async function fetchOverview(contentId: string, svcKey: string): Promise<string | null> {
  const params = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'sison', _type: 'json', defaultYN: 'N', addrinfoYN: 'N', overviewYN: 'Y', contentId });
  try {
    const res = await fetch(`https://apis.data.go.kr/B551011/KorService2/detailCommon2?serviceKey=${svcKey}&${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as DetailCommonResponse;
    if (data.response?.header?.resultCode !== '0000') return null;
    const items = data.response?.body?.items;
    if (!items) return null;
    const raw = items.item?.[0]?.overview?.trim() ?? null;
    if (!raw) return null;
    const clean = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > 100 ? clean.slice(0, 97) + '...' : clean;
  } catch { return null; }
}

async function enrichOverviews(plans: TravelPlan[], svcKey: string): Promise<TravelPlan[]> {
  const ids = new Set<string>();
  for (const p of plans) for (const s of p.stops) ids.add(s.id);
  const map = new Map<string, string | null>();
  await Promise.all(Array.from(ids).map(async id => { map.set(id, await fetchOverview(id, svcKey)); }));
  return plans.map(p => ({ ...p, stops: p.stops.map(s => ({ ...s, overview: map.get(s.id) ?? null })) }));
}

// ─── Request Body Parser ──────────────────────────────────────────────────────

function parseBody(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw) as unknown; return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null; }
    catch { return null; }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function str(v: unknown): string { return typeof v === 'string' ? v.trim() : ''; }

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
    console.error('[travel-plan:error] OPENAI_API_KEY 미설정');
    res.status(500).json({ ok: false, error: '일정을 만들지 못했어요.' });
    return;
  }

  const body = parseBody(req.body);
  if (!body) { res.status(400).json({ ok: false, error: '요청 형식이 올바르지 않아요.' }); return; }

  const address = str(body.address);
  const region  = str(body.region);
  const destination = str(body.destination) || region;
  const date = str(body.date);
  const timePreference = str(body.timePreference);

  if (!address) { res.status(400).json({ ok: false, error: '봉사활동 주소가 없어요.' }); return; }

  const actRaw = body.activity && typeof body.activity === 'object' && !Array.isArray(body.activity)
    ? (body.activity as Record<string, unknown>) : null;
  if (!actRaw) { res.status(400).json({ ok: false, error: '봉사활동 정보가 없어요.' }); return; }

  const activity: ActivityInfo = { title: str(actRaw.title), address };
  if (!activity.title) { res.status(400).json({ ok: false, error: '봉사활동 제목이 없어요.' }); return; }

  try {
    // Step 1: 주소 → 좌표
    let geo: GeocodeResult;
    try {
      geo = await geocodeAddress(address, region);
      console.log('[travel-plan] geocode success', { lat: geo.lat, lng: geo.lng });
    } catch (err) {
      console.error('[travel-plan:error] geocode fail', { message: err instanceof Error ? err.message : String(err), address, region });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 2: 좌표 → 주변 관광지
    let nearby: TravelPlace[] = [];
    try {
      nearby = await findNearbyPlaces(geo.lat, geo.lng);
      console.log('[travel-plan] nearby places', { count: nearby.length });
    } catch (err) {
      console.error('[travel-plan:error] nearby fail', { message: err instanceof Error ? err.message : String(err) });
    }
    if (nearby.length === 0) {
      console.error('[travel-plan:error] nearby empty', { lat: geo.lat, lng: geo.lng });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 3: OpenAI 일정 생성
    const metaMap = new Map<string, PlaceMeta>(
      nearby.map(p => [p.id, { title: p.title, address: p.address, contentTypeId: p.contentTypeId, distance: p.distance, image: p.image }])
    );
    const inputPlaces: InputPlace[] = nearby.map(p => ({ id: p.id, title: p.title, address: p.address, distance: p.distance, contentTypeId: p.contentTypeId, image: p.image }));

    let raw = await callOpenAI(apiKey, destination, date, timePreference, activity, inputPlaces);
    let plans = raw ? validatePlans(raw.plans ?? [], metaMap) : [];
    if (plans.length === 0) {
      raw = await callOpenAI(apiKey, destination, date, timePreference, activity, inputPlaces);
      plans = raw ? validatePlans(raw.plans ?? [], metaMap) : [];
    }
    if (plans.length === 0) {
      console.error('[travel-plan:error] openai returned 0 valid plans');
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 4: overview 보강 (실패해도 무시)
    const tourKey = process.env.TOUR_API_SERVICE_KEY?.trim() ?? '';
    if (tourKey) plans = await enrichOverviews(plans, tourKey);

    console.log('[travel-plan] complete', { planCount: plans.length });
    res.status(200).json({ ok: true, plans });
  } catch (err) {
    console.error('[travel-plan:error]', { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ ok: false, error: '일정을 만들지 못했어요.' });
  }
}
