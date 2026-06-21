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

type ParsedPreference = {
  intentSummary?: string;
  keywords?: string[];
  categories?: string[];
  preferredConditions?: {
    intensity?: string;
    indoorOutdoor?: string;
    soloFriendly?: boolean | null;
    crowdLevel?: string;
  };
  excludeKeywords?: string[];
};

type CandidateActivity = {
  id?: string;
  title?: string;
  location?: string;
  date?: string;
  time?: string;
  category?: string;
  description?: string;
  baseScore?: number;
  matchReasons?: string[];
};

type ActivityRecommendation = {
  activityId: string;
  reason: string;
  fitTags: string[];
};

const recommendationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['activityId', 'reason', 'fitTags'],
        properties: {
          activityId: { type: 'string' },
          reason: { type: 'string' },
          fitTags: {
            type: 'array',
            minItems: 0,
            maxItems: 3,
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

const parseRequestBody = (body: unknown) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
};

const getStringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const getNumberValue = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeStringList = (value: unknown, limit: number) => {
  if (!Array.isArray(value)) return [];

  return value
    .map(getStringValue)
    .filter(Boolean)
    .slice(0, limit);
};

const normalizeCandidates = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value
    .map((item) => item as CandidateActivity)
    .map((item) => ({
      id: getStringValue(item.id),
      title: getStringValue(item.title),
      location: getStringValue(item.location),
      date: getStringValue(item.date),
      time: getStringValue(item.time),
      category: getStringValue(item.category),
      description: getStringValue(item.description),
      baseScore: getNumberValue(item.baseScore),
      matchReasons: normalizeStringList(item.matchReasons, 5),
    }))
    .filter((item) => {
      if (!item.id || !item.title || seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .sort((a, b) => b.baseScore - a.baseScore)
    .slice(0, 20);
};

const normalizeRecommendations = (value: unknown, validIds: Set<string>): ActivityRecommendation[] => {
  if (!value || typeof value !== 'object') return [];

  const candidate = value as { recommendations?: unknown };
  if (!Array.isArray(candidate.recommendations)) return [];

  const seenIds = new Set<string>();
  return candidate.recommendations
    .map((item) => item as Partial<ActivityRecommendation>)
    .map((item) => ({
      activityId: getStringValue(item.activityId),
      reason: getStringValue(item.reason),
      fitTags: Array.isArray(item.fitTags)
        ? item.fitTags.map(getStringValue).filter(Boolean).slice(0, 3)
        : [],
    }))
    .filter((item) => {
      if (!validIds.has(item.activityId) || seenIds.has(item.activityId)) return false;
      seenIds.add(item.activityId);
      return true;
    })
    .slice(0, 3);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'OPENAI_API_KEY가 설정되지 않았어요.' });
    return;
  }

  const body = parseRequestBody(req.body);
  if (!body) {
    res.status(400).json({ ok: false, error: '요청 형식이 올바르지 않아요.' });
    return;
  }

  if (!Array.isArray(body.candidates)) {
    res.status(400).json({ ok: false, error: '추천 후보가 올바르지 않아요.' });
    return;
  }

  const preference = body.preference && typeof body.preference === 'object' && !Array.isArray(body.preference)
    ? body.preference as ParsedPreference
    : {};
  const candidates = normalizeCandidates(body.candidates);
  const validIds = new Set(candidates.map((item) => item.id));

  if (candidates.length === 0) {
    res.status(400).json({ ok: false, error: '추천 후보가 없어요.' });
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RECOMMEND_MODEL?.trim() || process.env.OPENAI_PARSE_MODEL?.trim() || 'gpt-4.1-mini',
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: [
              '당신은 1365 봉사활동 후보 재랭킹 도우미입니다.',
              '새로운 활동, 기관, 장소, 일정, 활동명을 만들지 마세요.',
              '반드시 입력 candidates 배열 안에 있는 id만 activityId로 반환하세요.',
              '후보에 없는 activityId는 절대 반환하지 마세요.',
              'baseScore가 높은 활동을 우선 고려하세요.',
              '사용자 선호문구와 더 잘 맞는 낮은 점수 후보가 있으면 그 이유를 설명하고 선택할 수 있습니다.',
              '활동 데이터는 수정하지 말고, 추천 이유와 fitTags만 작성하세요.',
              '추천 이유는 시선 서비스 톤으로 짧은 1문장만 작성하세요.',
              '공공기관식 표현, 실적 인정, 귀하의 조건에 부합 같은 표현은 쓰지 마세요.',
              'fitTags는 최대 3개이며 짧고 부드러운 한국어 태그로 작성하세요.',
              '사용자 선호와 맞는 후보를 최대 3개 선택하세요.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              preference,
              candidates,
            }),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'volunteer_candidate_recommendations',
            strict: true,
            schema: recommendationSchema,
          },
        },
      }),
    });

    const payload = await response.json() as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!response.ok) {
      console.error('OpenAI activity recommendation failed:', {
        status: response.status,
        errorMessage: payload.error?.message,
      });
      res.status(502).json({ ok: false, error: 'AI가 활동을 고르지 못했어요.' });
      return;
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ ok: false, error: 'AI 응답이 비어 있어요.' });
      return;
    }

    const recommendations = normalizeRecommendations(JSON.parse(content), validIds);
    res.status(200).json({ ok: true, recommendations });
  } catch (error) {
    console.error('OpenAI activity recommendation errored:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ ok: false, error: 'AI 활동 추천 중 오류가 발생했어요.' });
  }
}
