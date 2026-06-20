import { geocodeAddress, findNearbyPlaces } from '../travel/_service';

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

// ─── Input Types ─────────────────────────────────────────────────────────────

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

// GPT가 반환하는 것은 duration과 stop id 배열뿐
// title/summary는 코드에서 생성

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

// 같은 카테고리가 겹칠 때 사용할 대체 레이블 순서
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
      const meta = metaMap.get(id);
      if (!meta) { valid = false; break; }
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

    if (!valid || placeStops.length < 2) continue;

    const category = classifyCategory(placeStops, metaMap);
    const planMeta = PLAN_META[category] ?? PLAN_META.nature;
    let { title, summary } = planMeta;

    if (usedCategories.includes(category)) {
      const fallback = FALLBACK_LABELS[usedCategories.filter((c) => c === category).length - 1]
        ?? FALLBACK_LABELS[FALLBACK_LABELS.length - 1];
      title = `${title.replace(/\s+코스$/, '')} · ${fallback}`;
    }
    usedCategories.push(category);

    // 활동 장소에서 각 관광지까지 거리 중 최대값 (= 최대 이동 반경)
    const maxDistanceM = Math.max(0, ...placeStops.map((s) => s.distance));

    result.push({ title, summary, duration, maxDistanceM, stops: placeStops });
  }

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

  let payload: OpenAIPayload;
  try {
    payload = (await response.json()) as OpenAIPayload;
  } catch {
    console.error('[travel-plan] OpenAI 응답 파싱 실패, status:', response.status);
    return null;
  }

  if (!response.ok) {
    console.error('[travel-plan] OpenAI 오류:', response.status, payload.error?.message);
    return null;
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as RawResponse;
  } catch {
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
    // HTML 태그 제거 후 공백 정규화, 최대 100자
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

  console.log('[travel-plan] start', { address, region, destination, date, timePreference, activityTitle: activity.title });

  try {
    // Step 1: 주소 → 좌표 (VWorld)
    console.log('[travel-plan] normalize address', { address, region });
    let geoLat: number;
    let geoLng: number;
    try {
      const geo = await geocodeAddress(address, region);
      geoLat = geo.lat;
      geoLng = geo.lng;
      console.log('[travel-plan] geocode success', { lat: geoLat, lng: geoLng });
    } catch (err) {
      console.error('[travel-plan] geocode 실패', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    // Step 2: 좌표 → 주변 관광지 (TourAPI)
    let nearby: Awaited<ReturnType<typeof findNearbyPlaces>> = [];
    try {
      nearby = await findNearbyPlaces(geoLat, geoLng);
      console.log('[travel-plan] nearby places fetched', { count: nearby.length });
    } catch (err) {
      console.error('[travel-plan] 주변 관광지 조회 실패', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    if (nearby.length === 0) {
      console.error('[travel-plan] 주변 관광지 없음 — 종료');
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
      console.log('[travel-plan] 첫 번째 OpenAI 시도 실패 — 재시도');
      raw = await callOpenAI(apiKey, destination, date, timePreference, activity, inputPlaces);
      plans = raw ? validatePlans(raw.plans ?? [], metaMap) : [];
    }

    if (plans.length === 0) {
      console.error('[travel-plan] itinerary generation failed — 재시도 후에도 0건');
      res.status(200).json({ ok: false, error: '일정을 만들지 못했어요.' });
      return;
    }

    console.log('[travel-plan] itinerary generated', { planCount: plans.length });

    // Step 5: overview 조회 (실패해도 기본 설명으로 대체)
    const tourKey = process.env.TOUR_API_SERVICE_KEY?.trim() ?? '';
    if (tourKey) {
      plans = await enrichPlansWithOverviews(plans, tourKey);
    }

    console.log('[travel-plan] complete');
    res.status(200).json({ ok: true, plans });
  } catch (err) {
    console.error('[travel-plan]', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({ ok: false, error: '일정을 만들지 못했어요.' });
  }
}
