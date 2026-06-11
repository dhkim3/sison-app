type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

import {
  firstPresentValue as firstPresentCapacityValue,
  normalizeCapacity,
  pickCurrentParticipants,
  pickRecruitCapacity,
} from './capacity';

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

console.log('DATA_GO_KR_SERVICE_KEY exists:', !!process.env.DATA_GO_KR_SERVICE_KEY);
console.log(
  'DATA_GO_KR related env keys:',
  Object.keys(process.env).filter((key) => key.includes('DATA_GO_KR') || key.includes('GO_KR')),
);

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
    noticeEndde: getTagValue(itemXml, 'noticeEndde'),
    noticeEndDate: getTagValue(itemXml, 'noticeEndDate'),
    rcritEndde: getTagValue(itemXml, 'rcritEndde'),
    rcritEndDate: getTagValue(itemXml, 'rcritEndDate'),
    reqstEndde: getTagValue(itemXml, 'reqstEndde'),
    reqstEndDate: getTagValue(itemXml, 'reqstEndDate'),
    progrmEndde: getTagValue(itemXml, 'progrmEndde'),
    srvcEndDate: getTagValue(itemXml, 'srvcEndDate'),
    rcritNmpr: getTagValue(itemXml, 'rcritNmpr'),
    recrtNmpr: getTagValue(itemXml, 'recrtNmpr'),
    reqstNmpr: getTagValue(itemXml, 'reqstNmpr'),
    progrmRcritNmpr: getTagValue(itemXml, 'progrmRcritNmpr'),
    rcritNmprCo: getTagValue(itemXml, 'rcritNmprCo'),
    wanted: getTagValue(itemXml, 'wanted'),
    capacity: getTagValue(itemXml, 'capacity'),
    nanmmbyNmpr: getTagValue(itemXml, 'nanmmbyNmpr'),
    applcntNmpr: getTagValue(itemXml, 'applcntNmpr'),
    appTotal: getTagValue(itemXml, 'appTotal'),
    partcptnNmpr: getTagValue(itemXml, 'partcptnNmpr'),
    currentParticipants: getTagValue(itemXml, 'currentParticipants'),
    requestCount: getTagValue(itemXml, 'requestCount'),
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

const formatDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return value;

  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
};

const getRecruitmentEndDate = (item: ReturnType<typeof parseVolunteerDetailItem>) =>
  firstPresentCapacityValue(
    item.noticeEndde,
    item.noticeEndDate,
    item.rcritEndde,
    item.rcritEndDate,
    item.reqstEndde,
    item.reqstEndDate,
  );

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
    const capacity = normalizeCapacity(pickRecruitCapacity(item));
    const currentParticipants = normalizeCapacity(pickCurrentParticipants(item));

    console.log('1365 detail volunteer candidates:', {
      progrmRegistNo: item.progrmRegistNo || progrmRegistNo,
      recruitmentEndCandidates: {
        noticeEndde: item.noticeEndde,
        noticeEndDate: item.noticeEndDate,
        rcritEndde: item.rcritEndde,
        rcritEndDate: item.rcritEndDate,
        reqstEndde: item.reqstEndde,
        reqstEndDate: item.reqstEndDate,
        progrmEndde: item.progrmEndde,
        srvcEndDate: item.srvcEndDate,
      },
      capacityCandidates: {
        rcritNmpr: item.rcritNmpr,
        recrtNmpr: item.recrtNmpr,
        reqstNmpr: item.reqstNmpr,
        progrmRcritNmpr: item.progrmRcritNmpr,
        rcritNmprCo: item.rcritNmprCo,
        nanmmbyNmpr: item.nanmmbyNmpr,
        wanted: item.wanted,
        capacity: item.capacity,
      },
      normalizedCapacity: capacity,
      currentParticipantCandidates: {
        applcntNmpr: item.applcntNmpr,
        partcptnNmpr: item.partcptnNmpr,
        reqstNmpr: item.reqstNmpr,
        requestCount: item.requestCount,
        appTotal: item.appTotal,
        currentParticipants: item.currentParticipants,
      },
      normalizedCurrentParticipants: currentParticipants,
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
      recruitmentEndDate: formatDate(getRecruitmentEndDate(item)),
      capacity,
      currentParticipants,
    });
  } catch (error) {
    console.error('1365 detail volunteer target request errored:', {
      progrmRegistNo,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    res.status(502).json({ ok: false, error: '1365 상세 정보를 불러오지 못했어요.' });
  }
}
