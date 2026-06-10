type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

const VOLUNTEER_DETAIL_URL =
  'http://openapi.1365.go.kr/openapi/service/rest/VolunteerPartcptnService/getVltrPartcptnItem';

const getSingleQueryValue = (value: string | string[] | undefined, fallback = '') => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
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

const firstPresentValue = (...values: string[]) => {
  const value = values.find((item) => item.trim() !== '');
  return value ?? '';
};

const buildVolunteerDetailApiUrl = (params: {
  serviceKey: string;
  progrmRegistNo: string;
}) => {
  const query = new URLSearchParams({
    progrmRegistNo: params.progrmRegistNo,
  });

  const serviceKey = params.serviceKey.includes('%') ? params.serviceKey : encodeURIComponent(params.serviceKey);
  return `${VOLUNTEER_DETAIL_URL}?serviceKey=${serviceKey}&${query.toString()}`;
};

const parseVolunteerDetailItem = (xmlText: string) => {
  const withoutScripts = stripScriptTags(xmlText);
  const itemXml = withoutScripts.match(/<item\b[^>]*>[\s\S]*?<\/item>/i)?.[0] ?? withoutScripts;

  return {
    progrmRegistNo: getTagValue(itemXml, 'progrmRegistNo'),
    adultPosblAt: getTagValue(itemXml, 'adultPosblAt'),
    yngbgsPosblAt: getTagValue(itemXml, 'yngbgsPosblAt'),
    familyPosblAt: getTagValue(itemXml, 'familyPosblAt'),
    grpPosblAt: getTagValue(itemXml, 'grpPosblAt'),
    mnnstNm: getTagValue(itemXml, 'mnnstNm'),
    target: getTagValue(itemXml, 'target'),
    srvcTarget: getTagValue(itemXml, 'srvcTarget'),
    volunteerTarget: getTagValue(itemXml, 'volunteerTarget'),
    trgetNm: getTagValue(itemXml, 'trgetNm'),
  };
};

const formatVolunteerTarget = (item: ReturnType<typeof parseVolunteerDetailItem>) => {
  const textTarget = firstPresentValue(
    item.trgetNm,
    item.target,
    item.srvcTarget,
    item.volunteerTarget,
  );
  return textTarget || null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: '지원하지 않는 요청이에요.' });
    return;
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({ ok: false, error: '1365 API 인증키가 설정되지 않았어요.' });
    return;
  }

  const progrmRegistNo = getSingleQueryValue(req.query.progrmRegistNo).trim();
  if (!progrmRegistNo) {
    res.status(400).json({ ok: false, error: '프로그램 등록번호가 필요해요.' });
    return;
  }

  const detailUrl = buildVolunteerDetailApiUrl({ serviceKey, progrmRegistNo });

  try {
    const response = await fetch(detailUrl);
    const xmlText = await response.text();

    if (!response.ok) {
      res.status(response.status).json({ ok: false, error: '1365 상세 정보를 불러오지 못했어요.' });
      return;
    }

    const resultCode = getTagValue(xmlText, 'resultCode');
    const resultMsg = getTagValue(xmlText, 'resultMsg');

    if (resultCode && resultCode !== '00') {
      res.status(502).json({ ok: false, error: resultMsg || '1365 상세 정보를 불러오지 못했어요.' });
      return;
    }

    const item = parseVolunteerDetailItem(xmlText);
    console.log('1365 detail volunteer target candidates:', {
      progrmRegistNo: item.progrmRegistNo || progrmRegistNo,
      target: item.target,
      srvcTarget: item.srvcTarget,
      volunteerTarget: item.volunteerTarget,
      trgetNm: item.trgetNm,
      mnnstNm: item.mnnstNm,
      adultPosblAt: item.adultPosblAt,
      yngbgsPosblAt: item.yngbgsPosblAt,
      familyPosblAt: item.familyPosblAt,
      grpPosblAt: item.grpPosblAt,
    });

    res.status(200).json({
      ok: true,
      progrmRegistNo: item.progrmRegistNo || progrmRegistNo,
      volunteerTarget: formatVolunteerTarget(item),
    });
  } catch (error) {
    console.error('1365 detail volunteer target request errored:', {
      progrmRegistNo,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({ ok: false, error: '1365 상세 정보를 불러오지 못했어요.' });
  }
}
