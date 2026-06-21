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

type ParsePreferenceRequestBody = {
  location?: string;
  dateRange?: string;
  duration?: string;
  preferenceText?: string;
};

type ParsedPreference = {
  intentSummary: string;
  keywords: string[];
  categories: string[];
  preferredConditions: {
    intensity: 'low' | 'medium' | 'high' | 'unknown';
    indoorOutdoor: 'indoor' | 'outdoor' | 'both' | 'unknown';
    soloFriendly: boolean | null;
    crowdLevel: 'low' | 'medium' | 'high' | 'unknown';
  };
  excludeKeywords: string[];
};

const defaultActivityPreferenceText = '여행 중 부담 없이 참여할 수 있는 조용하고 가벼운 활동';
const maxPreferenceTextLength = 200;

const preferenceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intentSummary', 'keywords', 'categories', 'preferredConditions', 'excludeKeywords'],
  properties: {
    intentSummary: {
      type: 'string',
      description: '사용자 선호를 검색 조건으로 쓰기 쉽게 한 문장으로 요약합니다.',
    },
    keywords: {
      type: 'array',
      minItems: 0,
      maxItems: 8,
      items: { type: 'string' },
    },
    categories: {
      type: 'array',
      minItems: 0,
      maxItems: 6,
      items: { type: 'string' },
    },
    preferredConditions: {
      type: 'object',
      additionalProperties: false,
      required: ['intensity', 'indoorOutdoor', 'soloFriendly', 'crowdLevel'],
      properties: {
        intensity: { type: 'string', enum: ['low', 'medium', 'high', 'unknown'] },
        indoorOutdoor: { type: 'string', enum: ['indoor', 'outdoor', 'both', 'unknown'] },
        soloFriendly: { type: ['boolean', 'null'] },
        crowdLevel: { type: 'string', enum: ['low', 'medium', 'high', 'unknown'] },
      },
    },
    excludeKeywords: {
      type: 'array',
      minItems: 0,
      maxItems: 8,
      items: { type: 'string' },
    },
  },
};

const fallbackParsedPreference: ParsedPreference = {
  intentSummary: '사용자가 입력한 자연어 조건을 검색 가능한 선호 조건으로 정리하지 못했습니다.',
  keywords: [],
  categories: [],
  preferredConditions: {
    intensity: 'unknown',
    indoorOutdoor: 'unknown',
    soloFriendly: null,
    crowdLevel: 'unknown',
  },
  excludeKeywords: [],
};

const getStringValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeStringList = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const normalizeParsedPreference = (value: unknown): ParsedPreference => {
  if (!value || typeof value !== 'object') return fallbackParsedPreference;

  const candidate = value as Partial<ParsedPreference>;
  const preferredConditions = candidate.preferredConditions ?? fallbackParsedPreference.preferredConditions;

  return {
    intentSummary: getStringValue(candidate.intentSummary) || fallbackParsedPreference.intentSummary,
    keywords: normalizeStringList(candidate.keywords),
    categories: normalizeStringList(candidate.categories),
    preferredConditions: {
      intensity: ['low', 'medium', 'high', 'unknown'].includes(String(preferredConditions.intensity))
        ? preferredConditions.intensity
        : 'unknown',
      indoorOutdoor: ['indoor', 'outdoor', 'both', 'unknown'].includes(String(preferredConditions.indoorOutdoor))
        ? preferredConditions.indoorOutdoor
        : 'unknown',
      soloFriendly: typeof preferredConditions.soloFriendly === 'boolean' ? preferredConditions.soloFriendly : null,
      crowdLevel: ['low', 'medium', 'high', 'unknown'].includes(String(preferredConditions.crowdLevel))
        ? preferredConditions.crowdLevel
        : 'unknown',
    },
    excludeKeywords: normalizeStringList(candidate.excludeKeywords),
  };
};

const parseRequestBody = (body: unknown): ParsePreferenceRequestBody | null => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as ParsePreferenceRequestBody
        : null;
    } catch {
      return null;
    }
  }

  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as ParsePreferenceRequestBody
    : null;
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

  const location = getStringValue(body.location);
  const dateRange = getStringValue(body.dateRange);
  const duration = getStringValue(body.duration);
  const preferenceText = getStringValue(body.preferenceText) || defaultActivityPreferenceText;

  if (!location) {
    res.status(400).json({ ok: false, error: '여행지를 입력해 주세요.' });
    return;
  }

  if (preferenceText.length > maxPreferenceTextLength) {
    res.status(400).json({ ok: false, error: '200자 이내로 입력해 주세요.' });
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
        model: process.env.OPENAI_PARSE_MODEL?.trim() || 'gpt-4.1-mini',
        temperature: 0.1,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: [
              '당신은 1365 봉사활동 검색 조건 파서입니다.',
              '실제 봉사활동을 추천하거나 생성하지 마세요.',
              '존재하지 않는 활동명, 기관명, 일정, 장소를 만들지 마세요.',
              '사용자의 자연어 선호를 검색/랭킹에 활용할 수 있는 구조화 데이터로만 변환하세요.',
              '키워드는 1365 검색에 쓸 수 있는 짧은 한국어 명사 중심으로 작성하세요.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: JSON.stringify({
              location,
              dateRange,
              duration,
              preferenceText,
            }),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'volunteer_preference_parse',
            strict: true,
            schema: preferenceSchema,
          },
        },
      }),
    });

    const payload = await response.json() as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!response.ok) {
      console.error('OpenAI preference parse failed:', {
        status: response.status,
        errorMessage: payload.error?.message,
      });
      res.status(502).json({ ok: false, error: 'AI가 조건을 해석하지 못했어요.' });
      return;
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ ok: false, error: 'AI 응답이 비어 있어요.' });
      return;
    }

    const parsed = normalizeParsedPreference(JSON.parse(content));
    res.status(200).json({ ok: true, parsed });
  } catch (error) {
    console.error('OpenAI preference parse errored:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ ok: false, error: 'AI 조건 해석 중 오류가 발생했어요.' });
  }
}
