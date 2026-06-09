type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

declare const process: {
  env: Record<string, string | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type VolunteerStatus = '모집중' | '지난 활동';

interface VolunteerActivity {
  id: string;
  title: string;
  location: string;
  region: string;
  recruitmentStartDate: string;
  recruitmentEndDate: string;
  activityStartDate: string;
  activityEndDate: string;
  time: string;
  category: string;
  organization: string;
  capacity: number | null;
  currentParticipants: number | null;
  status: VolunteerStatus;
  imageUrl: string;
  sourceUrl?: string;
  progrmRegistNo: string;
  progrmSttusSe: string;
}

const VOLUNTEER_SEARCH_URL =
  'http://openapi.1365.go.kr/openapi/service/rest/VolunteerPartcptnService/getVltrSearchWordList';

const fallbackImages: Record<string, string> = {
  '환경': 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '교육': 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '문화': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '보건': 'https://images.unsplash.com/photo-1584515933487-779824d29309?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  default: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
};

const getSingleQueryValue = (value: string | string[] | undefined, fallback = '') => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
};

const sendSuccess = (
  res: VercelResponse,
  body: { items: VolunteerActivity[]; totalCount: number; page: number; size: number },
) => {
  res.status(200).json({
    ok: true,
    items: body.items,
    totalCount: body.totalCount,
    page: body.page,
    size: body.size,
  });
};

const sendFailure = (res: VercelResponse, statusCode: number, error: string) => {
  res.status(statusCode).json({
    ok: false,
    items: [],
    totalCount: 0,
    error,
  });
};

const toPositiveInteger = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toApiDate = (value: string) => value.replace(/\D/g, '').slice(0, 8);

const formatDate = (value: string) => {
  const digits = toApiDate(value);
  if (digits.length !== 8) return value;

  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
};

const formatTime = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 2) return `${digits.padStart(2, '0')}:00`;

  const normalized = digits.padStart(4, '0').slice(-4);
  if (normalized === '0000') return '';

  return `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}`;
};

const decodeXmlEntities = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();

const getTagValue = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeXmlEntities(match[1]) : '';
};

const stripScriptTags = (xmlText: string) => xmlText.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

const parseVolunteerItems = (xmlText: string) => {
  const withoutScripts = stripScriptTags(xmlText);
  const itemsXmlMatch = withoutScripts.match(/<items\b[^>]*>([\s\S]*?)<\/items>/i);
  const itemsXml = itemsXmlMatch?.[1] ?? withoutScripts;
  const itemMatches = itemsXml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];

  return itemMatches.map((itemXml) => ({
    actBeginTm: getTagValue(itemXml, 'actBeginTm'),
    actEndTm: getTagValue(itemXml, 'actEndTm'),
    actPlace: getTagValue(itemXml, 'actPlace'),
    adultPosblAt: getTagValue(itemXml, 'adultPosblAt'),
    gugunCd: getTagValue(itemXml, 'gugunCd'),
    nanmmbyNm: getTagValue(itemXml, 'nanmmbyNm'),
    noticeBgnde: getTagValue(itemXml, 'noticeBgnde'),
    noticeEndde: getTagValue(itemXml, 'noticeEndde'),
    progrmBgnde: getTagValue(itemXml, 'progrmBgnde'),
    progrmEndde: getTagValue(itemXml, 'progrmEndde'),
    progrmRegistNo: getTagValue(itemXml, 'progrmRegistNo'),
    progrmSj: getTagValue(itemXml, 'progrmSj'),
    progrmSttusSe: getTagValue(itemXml, 'progrmSttusSe'),
    sidoCd: getTagValue(itemXml, 'sidoCd'),
    srvcClCode: getTagValue(itemXml, 'srvcClCode'),
    url: getTagValue(itemXml, 'url'),
    yngbgsPosblAt: getTagValue(itemXml, 'yngbgsPosblAt'),
  }));
};

const getTodayApiDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

const getImageUrl = (category: string) => {
  const matchedKey = Object.keys(fallbackImages).find((key) => key !== 'default' && category.includes(key));
  return fallbackImages[matchedKey ?? 'default'];
};

const buildVolunteerSearchUrl = (params: {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
  keyword: string;
  startDate: string;
  endDate: string;
}) => {
  const query = new URLSearchParams({
    pageNo: String(params.pageNo),
    numOfRows: String(params.numOfRows),
    keyword: params.keyword,
    adultPosblAt: 'Y',
  });

  if (params.startDate.length === 8) query.set('progrmBgnde', params.startDate);
  if (params.endDate.length === 8) query.set('progrmEndde', params.endDate);

  const serviceKey = params.serviceKey.includes('%') ? params.serviceKey : encodeURIComponent(params.serviceKey);
  return `${VOLUNTEER_SEARCH_URL}?serviceKey=${serviceKey}&${query.toString()}`;
};

const mapVolunteerActivity = (item: ReturnType<typeof parseVolunteerItems>[number]): VolunteerActivity => {
  const beginTime = formatTime(item.actBeginTm);
  const endTime = formatTime(item.actEndTm);
  const rawEndDate = toApiDate(item.progrmEndde);
  const status: VolunteerStatus = rawEndDate && getTodayApiDate() > rawEndDate ? '지난 활동' : '모집중';

  return {
    id: item.progrmRegistNo,
    title: item.progrmSj,
    location: item.actPlace,
    region: [item.sidoCd, item.gugunCd].filter(Boolean).join(' '),
    recruitmentStartDate: formatDate(item.noticeBgnde),
    recruitmentEndDate: formatDate(item.noticeEndde),
    activityStartDate: formatDate(item.progrmBgnde),
    activityEndDate: formatDate(item.progrmEndde),
    time: [beginTime, endTime].filter(Boolean).join(' ~ '),
    category: item.srvcClCode,
    organization: item.nanmmbyNm,
    capacity: null,
    currentParticipants: null,
    status,
    imageUrl: getImageUrl(item.srvcClCode),
    sourceUrl: item.url || undefined,
    progrmRegistNo: item.progrmRegistNo,
    progrmSttusSe: item.progrmSttusSe,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method && req.method !== 'GET') {
    sendFailure(res, 405, '지원하지 않는 요청이에요.');
    return;
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    sendFailure(res, 500, '1365 API 인증키가 설정되지 않았어요.');
    return;
  }

  const keyword = getSingleQueryValue(req.query.keyword).trim();
  const pageNo = toPositiveInteger(getSingleQueryValue(req.query.page), 1);
  const numOfRows = toPositiveInteger(getSingleQueryValue(req.query.size), 10);
  const startDate = toApiDate(getSingleQueryValue(req.query.startDate));
  const endDate = toApiDate(getSingleQueryValue(req.query.endDate));

  const upstreamUrl = buildVolunteerSearchUrl({
    serviceKey,
    pageNo,
    numOfRows,
    keyword,
    startDate,
    endDate,
  });

  try {
    const response = await fetch(upstreamUrl);
    const xmlText = await response.text();
    console.log('1365 volunteer raw response preview:', stripScriptTags(xmlText).slice(0, 1000));

    if (!response.ok) {
      console.error('1365 upstream request failed:', {
        requestUrl: upstreamUrl.replace(serviceKey, '[REDACTED_SERVICE_KEY]'),
        status: response.status,
        responseText: xmlText.slice(0, 1000),
      });
      sendFailure(res, response.status, '1365 검색 결과를 불러오지 못했어요.');
      return;
    }

    const resultCode = getTagValue(xmlText, 'resultCode');
    const resultMsg = getTagValue(xmlText, 'resultMsg');
    const totalCount = Number.parseInt(getTagValue(xmlText, 'totalCount'), 10) || 0;
    const items = parseVolunteerItems(xmlText).map(mapVolunteerActivity);

    if (resultCode && resultCode !== '00') {
      console.error('1365 upstream returned error result:', {
        requestUrl: upstreamUrl.replace(serviceKey, '[REDACTED_SERVICE_KEY]'),
        status: response.status,
        responseText: stripScriptTags(xmlText).slice(0, 1000),
      });
      sendFailure(res, 502, resultMsg || '1365 검색 결과를 불러오지 못했어요.');
      return;
    }

    sendSuccess(res, {
      items,
      totalCount,
      page: pageNo,
      size: numOfRows,
    });
  } catch (error) {
    console.error('1365 volunteer search failed:', {
      requestUrl: upstreamUrl.replace(serviceKey, '[REDACTED_SERVICE_KEY]'),
      status: 'network-error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    sendFailure(res, 500, '1365 검색 중 잠시 문제가 생겼어요.');
  }
}
