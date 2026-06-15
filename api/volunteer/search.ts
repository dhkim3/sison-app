import {
  normalizeCapacity as normalizeApiCapacity,
  pickCurrentParticipants,
  pickRecruitCapacity,
} from './capacity.js';

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

export interface VolunteerActivity {
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
  capacity: string | null;
  currentParticipants: string | null;
  volunteerTarget: string | null;
  volunteerType: string | null;
  status: VolunteerStatus;
  imageUrl: string;
  applyUrl?: string;
  sourceUrl?: string;
  recentSortBasis?: 'registration' | 'recruitmentStart' | 'responseOrder';
  recentSortDate?: string;
  progrmRegistNo: string;
  progrmSttusSe: string;
}

const VOLUNTEER_SEARCH_URL =
  'http://openapi.1365.go.kr/openapi/service/rest/VolunteerPartcptnService/getVltrSearchWordList';
const VOLUNTEER_DETAIL_URL =
  'http://openapi.1365.go.kr/openapi/service/rest/VolunteerPartcptnService/getVltrPartcptnItem';

const fallbackImages: Record<string, string> = {
  '환경': 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '교육': 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '문화': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  '보건': 'https://images.unsplash.com/photo-1584515933487-779824d29309?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  city: 'https://images.unsplash.com/photo-1519010470956-6d877008eaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
  default: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
};

const festivalImageRotation = [
  fallbackImages.festival,
  fallbackImages.city,
  fallbackImages.beach,
  fallbackImages.forest,
];

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

const toSortableDate = (value: string) => {
  const digits = toApiDate(value);
  if (digits.length !== 8) return 0;

  return Number(digits);
};

const toApiDateObject = (value: string) => {
  const digits = toApiDate(value);
  if (digits.length !== 8) return null;

  return new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)));
};

const getApiDateSpanDays = (startValue: string, endValue: string) => {
  const start = toApiDateObject(startValue);
  const end = toApiDateObject(endValue);
  if (!start || !end || end < start) return null;

  return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
};

const getDaysAfterToday = (value: string) => {
  const date = toApiDateObject(value);
  const today = toApiDateObject(getTodayApiDate());
  if (!date || !today) return null;

  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
};

const getSeoulDateTime = (dateValue: string, minutes: number) => {
  const date = toApiDate(dateValue);
  if (date.length !== 8) return null;

  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
    hours - 9,
    minute,
  ));
};

const formatTime = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 2) return `${digits.padStart(2, '0')}:00`;

  const normalized = digits.padStart(4, '0').slice(-4);
  if (normalized === '0000') return '';

  return `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}`;
};

const toTimeMinutes = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  const normalized = digits.length <= 2
    ? `${digits.padStart(2, '0')}00`
    : digits.padStart(4, '0').slice(-4);
  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2, 4));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
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
    familyPosblAt: getTagValue(itemXml, 'familyPosblAt'),
    grpPosblAt: getTagValue(itemXml, 'grpPosblAt'),
    gugunCd: getTagValue(itemXml, 'gugunCd'),
    mnnstNm: getTagValue(itemXml, 'mnnstNm'),
    nanmmbyNm: getTagValue(itemXml, 'nanmmbyNm'),
    noticeBgnde: getTagValue(itemXml, 'noticeBgnde'),
    noticeEndde: getTagValue(itemXml, 'noticeEndde'),
    noticeEndDate: getTagValue(itemXml, 'noticeEndDate'),
    rcritEndde: getTagValue(itemXml, 'rcritEndde'),
    rcritEndDate: getTagValue(itemXml, 'rcritEndDate'),
    reqstEndde: getTagValue(itemXml, 'reqstEndde'),
    reqstEndDate: getTagValue(itemXml, 'reqstEndDate'),
    progrmBgnde: getTagValue(itemXml, 'progrmBgnde'),
    progrmEndde: getTagValue(itemXml, 'progrmEndde'),
    actBeginDate: getTagValue(itemXml, 'actBeginDate'),
    actEndDate: getTagValue(itemXml, 'actEndDate'),
    registDt: getTagValue(itemXml, 'registDt'),
    regDate: getTagValue(itemXml, 'regDate'),
    createdAt: getTagValue(itemXml, 'createdAt'),
    progrmRegistDe: getTagValue(itemXml, 'progrmRegistDe'),
    srvcStartDate: getTagValue(itemXml, 'srvcStartDate'),
    srvcEndDate: getTagValue(itemXml, 'srvcEndDate'),
    progrmRegistNo: getTagValue(itemXml, 'progrmRegistNo'),
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
    progrmCn: getTagValue(itemXml, 'progrmCn'),
    progrmSj: getTagValue(itemXml, 'progrmSj'),
    progrmSttusSe: getTagValue(itemXml, 'progrmSttusSe'),
    rcritAt: getTagValue(itemXml, 'rcritAt'),
    status: getTagValue(itemXml, 'status'),
    target: getTagValue(itemXml, 'target'),
    srvcTarget: getTagValue(itemXml, 'srvcTarget'),
    volunteerTarget: getTagValue(itemXml, 'volunteerTarget'),
    trgetNm: getTagValue(itemXml, 'trgetNm'),
    sidoCd: getTagValue(itemXml, 'sidoCd'),
    srvcClCode: getTagValue(itemXml, 'srvcClCode'),
    url: getTagValue(itemXml, 'url'),
    yngbgsPosblAt: getTagValue(itemXml, 'yngbgsPosblAt'),
  }));
};

type ParsedVolunteerItem = ReturnType<typeof parseVolunteerItems>[number];

const getTodayApiDate = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}${month}${day}`;
};

const getRecruitmentDdayLabelFromApiDate = (value: string) => {
  const recruitmentEnd = toSortableDate(value);
  const today = Number(getTodayApiDate());
  if (!recruitmentEnd) return '';
  if (recruitmentEnd < today) return '모집마감';
  if (recruitmentEnd === today) return '오늘 마감';

  const endDate = toApiDateObject(value);
  const todayDate = toApiDateObject(getTodayApiDate());
  if (!endDate || !todayDate) return '';

  const daysUntilDeadline = Math.ceil((endDate.getTime() - todayDate.getTime()) / 86400000);
  return `마감 D-${daysUntilDeadline}`;
};

const getImageUrl = (category: string, text = '') => {
  if (/축제|행사|페스티벌|마켓|플리마켓|부스|박람회/.test(text)) return fallbackImages.festival;
  if (/해변|바다|해수욕장|플로깅/.test(text)) return fallbackImages.beach;
  if (/숲|숲길|산|공원/.test(text)) return fallbackImages.forest;
  if (/문화|관광|공연|체험|안내/.test(text)) return fallbackImages.city;

  const matchedKey = Object.keys(fallbackImages).find((key) =>
    !['default', 'festival', 'beach', 'forest', 'city'].includes(key) && category.includes(key)
  );
  return fallbackImages[matchedKey ?? 'default'];
};

const shortenHomeLocation = (value: string) => {
  const withoutParentheses = value.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!withoutParentheses) return value;

  const separators = [' / ', '/', ',', ' - ', '·'];
  const separated = separators
    .flatMap((separator) => withoutParentheses.split(separator))
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = separated.length > 1 ? separated : withoutParentheses.split(/\s+/);
  const preferred = [...parts].reverse().find((part) =>
    /(분원|센터|광장|공원|해변|해수욕장|시장|마켓|회관|체육관|박물관|미술관|문화관|축제장|행사장|일원)$/.test(part)
  );

  return preferred || withoutParentheses;
};

const avoidConsecutiveImages = (items: VolunteerActivity[]) =>
  items.map((item, index, array) => {
    if (index === 0 || item.imageUrl !== array[index - 1].imageUrl) return item;

    const replacement = festivalImageRotation.find((imageUrl) => imageUrl !== array[index - 1].imageUrl) || item.imageUrl;
    return { ...item, imageUrl: replacement };
  });

const buildVolunteerSearchUrl = (params: {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
  keyword: string;
  startDate: string;
  endDate: string;
  sidoCd?: string;
  gugunCd?: string;
}) => {
  const query = new URLSearchParams({
    pageNo: String(params.pageNo),
    numOfRows: String(params.numOfRows),
    keyword: params.keyword,
    adultPosblAt: 'Y',
  });

  if (params.startDate.length === 8) query.set('progrmBgnde', params.startDate);
  if (params.endDate.length === 8) query.set('progrmEndde', params.endDate);
  if (params.sidoCd) query.set('sidoCd', params.sidoCd);
  if (params.gugunCd) query.set('gugunCd', params.gugunCd);

  const serviceKey = params.serviceKey.includes('%') ? params.serviceKey : encodeURIComponent(params.serviceKey);
  return `${VOLUNTEER_SEARCH_URL}?serviceKey=${serviceKey}&${query.toString()}`;
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

const buildVolunteerDetailUrl = (progrmRegistNo: string) => {
  if (!progrmRegistNo) return '';

  const query = new URLSearchParams({
    type: 'show',
    progrmRegistNo,
  });

  return `https://www.1365.go.kr/vols/P9210/partcptn/timeCptn.do?${query.toString()}`;
};

const normalizeVolunteerUrl = (url: string, progrmRegistNo: string) => {
  const trimmedUrl = url.trim();
  if (trimmedUrl) return trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl.replace(/^\/+/, '')}`;

  return buildVolunteerDetailUrl(progrmRegistNo);
};

const firstPresentValue = (...values: string[]) => {
  const value = values.find((item) => item.trim() !== '');
  return value ?? '';
};

const isYesFlag = (value: string) => value.trim().toUpperCase() === 'Y';

const mergeAvailabilityFlag = (searchValue: string, detailValue: string) => {
  if (isYesFlag(searchValue) || isYesFlag(detailValue)) return 'Y';
  return searchValue || detailValue;
};

const getCurrentParticipantValue = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  pickCurrentParticipants(item);

const parseParticipantNumber = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const numberMatch = trimmedValue.replace(/,/g, '').match(/\d+/);
  if (!numberMatch) return null;

  const parsed = Number(numberMatch[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatVolunteerTarget = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const textTarget = firstPresentValue(
    item.trgetNm,
    item.target,
    item.srvcTarget,
    item.volunteerTarget,
  );
  return textTarget || null;
};

const formatVolunteerType = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const typeFlags = [
    ['성인', item.adultPosblAt],
    ['청소년', item.yngbgsPosblAt],
    ['가족', item.familyPosblAt],
    ['단체', item.grpPosblAt],
  ]
    .filter(([, value]) => isYesFlag(value))
    .map(([label]) => label);

  return typeFlags.length > 0 ? typeFlags.join(' · ') : null;
};

const getRecentSortInfo = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const recruitmentStartDate = firstPresentValue(
    item.noticeBgnde,
    item.progrmBgnde,
    item.srvcStartDate,
  );

  if (recruitmentStartDate) {
    return {
      basis: 'recruitmentStart' as const,
      rawDate: recruitmentStartDate,
      sortValue: toSortableDate(recruitmentStartDate),
    };
  }

  return {
    basis: 'responseOrder' as const,
    rawDate: '',
    sortValue: 0,
  };
};

const isApiDateAfterToday = (value: string) => {
  const sortableDate = toSortableDate(value);
  return sortableDate > 0 && sortableDate > Number(getTodayApiDate());
};

const isApiDateTodayOrLater = (value: string) => {
  const sortableDate = toSortableDate(value);
  return sortableDate > 0 && sortableDate >= Number(getTodayApiDate());
};

const isApiDateTodayOrEarlier = (value: string) => {
  const sortableDate = toSortableDate(value);
  return sortableDate > 0 && sortableDate <= Number(getTodayApiDate());
};

const isRecruitingItem = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const statusText = `${item.status} ${item.rcritAt}`.trim();
  if (/마감|종료|완료|N|n|false/i.test(statusText)) return false;

  if (item.progrmSttusSe && !['2', '모집중'].includes(item.progrmSttusSe)) return false;

  return true;
};

const getRecruitmentStartDate = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  firstPresentValue(item.noticeBgnde, item.srvcStartDate);

const getRecruitmentEndDate = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  firstPresentValue(
    item.noticeEndde,
    item.noticeEndDate,
    item.rcritEndde,
    item.rcritEndDate,
    item.reqstEndde,
    item.reqstEndDate,
  );

const getActivityStartDate = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  firstPresentValue(item.progrmBgnde, item.actBeginDate, item.srvcStartDate);

const isHomeVisibleRecruitingActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const recruitmentStartDate = getRecruitmentStartDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const activityStartDate = getActivityStartDate(item);

  return (
    isRecruitingItem(item) &&
    isApiDateTodayOrEarlier(recruitmentStartDate) &&
    isApiDateAfterToday(recruitmentEndDate) &&
    isApiDateAfterToday(activityStartDate)
  );
};

const isOpenFutureActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  return isHomeVisibleRecruitingActivity(item);
};

const isFutureRecruitingActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  return isHomeVisibleRecruitingActivity(item);
};

const isCurrentlyRecruitingActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  return isHomeVisibleRecruitingActivity(item);
};

const sortVolunteerItemsByRecent = (items: Array<ReturnType<typeof parseVolunteerItems>[number]>) => {
  return items
    .filter(isOpenFutureActivity)
    .map((item, index) => ({ item, index, sortInfo: getRecentSortInfo(item) }))
    .sort((a, b) => {
      if (a.sortInfo.sortValue && b.sortInfo.sortValue) return b.sortInfo.sortValue - a.sortInfo.sortValue;
      if (a.sortInfo.sortValue) return -1;
      if (b.sortInfo.sortValue) return 1;

      return a.index - b.index;
    })
    .map(({ item }) => item);
};

const filterVolunteerItemsByRecruiting = (items: Array<ReturnType<typeof parseVolunteerItems>[number]>) =>
  items
    .filter(isCurrentlyRecruitingActivity)
    .sort((a, b) => {
      const aStart = toSortableDate(getRecruitmentStartDate(a));
      const bStart = toSortableDate(getRecruitmentStartDate(b));

      if (aStart !== bStart) return bStart - aStart;
      return toSortableDate(getActivityStartDate(a)) - toSortableDate(getActivityStartDate(b));
    });

const travelFriendlyHardExcludePattern = /정기|상시|멘토링|학습지도|치매|요양|상담|사무|장애/;

const travelFriendlyCategoryBonusKeywords = [
  '환경', '생태', '문화', '체육', '예술', '관광', '생활',
  '지역행사', '지역 행사', '지역안전', '지역 안전', '농어촌', '농촌', '어촌', '보호',
];

const travelFriendlyCategoryPenaltyKeywords = ['교육', '보건', '의료', '상담', '사무행정'];

const isTravelHardExcluded = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const checkText = `${item.progrmSj} ${item.nanmmbyNm}`;
  return travelFriendlyHardExcludePattern.test(checkText);
};

const getTravelFriendlyScore = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const categoryAndTitle = `${item.srvcClCode} ${item.progrmSj}`;
  const durationMinutes = getActivityDurationMinutes(item);
  let score = 0;

  if (travelFriendlyCategoryBonusKeywords.some((kw) => categoryAndTitle.includes(kw))) score += 40;
  if (durationMinutes !== null && durationMinutes >= 60 && durationMinutes <= 240) score += 20;
  if (/교육|어르신|센터/.test(item.progrmSj)) score -= 20;
  if (travelFriendlyCategoryPenaltyKeywords.some((kw) => categoryAndTitle.includes(kw))) score -= 30;

  return score;
};

const lightweightPreferredCategoryKeywords = [
  '환경',
  '생태',
  '문화',
  '체육',
  '예술',
  '관광',
  '생활편의',
  '생활',
  '지역행사',
  '지역 행사',
  '지역안전',
  '지역 안전',
  '농어촌',
  '농촌',
  '어촌',
];

const lightweightPriorityTitleKeywords = [
  '플로깅',
  '환경정화',
  '산책',
  '산책로',
  '해변',
  '바다',
  '공원',
  '숲길',
  '축제',
  '행사',
  '안내',
  '정리',
  '체험',
  '부스',
];

const lightweightForceExcludePattern = /정기|상시|멘토링|학습지도|치매|요양|상담|사무/;
const lightweightSecondaryPenaltyPattern = /교육|어르신|센터/;
const lightweightLongRunningTitlePattern = /프로그램|동아리/;
const lightweightSupplementKeywords = ['바다', '축제', '플로깅', '환경정화', '공원', '산책', '행사', '안내'];

type LightweightRelaxationProfile = {
  allowLongActivityPeriod: boolean;
  allowLongRecruitmentPeriod: boolean;
  allowLongDuration: boolean;
  allowLongRunningTitle: boolean;
};

const lightweightRelaxationProfiles: LightweightRelaxationProfile[] = [
  {
    allowLongActivityPeriod: false,
    allowLongRecruitmentPeriod: false,
    allowLongDuration: false,
    allowLongRunningTitle: false,
  },
  {
    allowLongActivityPeriod: true,
    allowLongRecruitmentPeriod: true,
    allowLongDuration: false,
    allowLongRunningTitle: false,
  },
  {
    allowLongActivityPeriod: true,
    allowLongRecruitmentPeriod: true,
    allowLongDuration: true,
    allowLongRunningTitle: false,
  },
  {
    allowLongActivityPeriod: true,
    allowLongRecruitmentPeriod: true,
    allowLongDuration: true,
    allowLongRunningTitle: true,
  },
];

const getLightweightActivityEndDate = (item: ParsedVolunteerItem) =>
  firstPresentValue(item.progrmEndde, item.actEndDate, item.srvcEndDate);

const isActivityEnded = (item: ParsedVolunteerItem) => {
  const activityEndDate = getLightweightActivityEndDate(item) || getActivityStartDate(item);
  const endMinutes = toTimeMinutes(item.actEndTm) ?? ((23 * 60) + 59);
  const activityEndDateTime = getSeoulDateTime(activityEndDate, endMinutes);

  return activityEndDateTime ? activityEndDateTime.getTime() < Date.now() : false;
};

const isLightweightOpenActivity = (item: ParsedVolunteerItem) => {
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);

  return (
    isRecruitingItem(item) &&
    isApiDateAfterToday(recruitmentEndDate) &&
    (isApiDateAfterToday(activityStartDate) || isApiDateAfterToday(activityEndDate))
  );
};

const getLightweightActivityReferenceDate = (item: ParsedVolunteerItem) => {
  const activityStartDate = getActivityStartDate(item);
  if (isApiDateAfterToday(activityStartDate)) return activityStartDate;

  return getLightweightActivityEndDate(item);
};

const getLightweightActivityScore = (
  item: ParsedVolunteerItem,
  index: number,
  profile: LightweightRelaxationProfile,
) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  const searchableText = `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm}`;
  const durationMinutes = getActivityDurationMinutes(item);
  const recruitmentSpanDays = getApiDateSpanDays(getRecruitmentStartDate(item), getRecruitmentEndDate(item));
  const activitySpanDays = getApiDateSpanDays(getActivityStartDate(item), getLightweightActivityEndDate(item));
  const daysUntilActivity = getDaysAfterToday(getLightweightActivityReferenceDate(item));
  const hasLongRunningTitle = lightweightLongRunningTitlePattern.test(title);

  if (!isLightweightOpenActivity(item)) return null;
  if (lightweightForceExcludePattern.test(searchableText)) return null;
  if (!profile.allowLongActivityPeriod && activitySpanDays !== null && activitySpanDays > 30) return null;
  if (!profile.allowLongRecruitmentPeriod && recruitmentSpanDays !== null && recruitmentSpanDays > 60) return null;
  if (!profile.allowLongDuration && durationMinutes !== null && durationMinutes > 240) return null;
  if (!profile.allowLongRunningTitle && hasLongRunningTitle) return null;

  let score = 0;

  if (isYesFlag(item.adultPosblAt)) score += 25;
  if (lightweightPreferredCategoryKeywords.some((keyword) => categoryAndTitle.includes(keyword))) score += 45;

  const priorityKeywordCount = lightweightPriorityTitleKeywords.filter((keyword) =>
    searchableText.includes(keyword)
  ).length;
  score += Math.min(priorityKeywordCount * 18, 72);

  if (durationMinutes !== null && durationMinutes <= 240) score += 35;
  if (durationMinutes !== null && durationMinutes <= 120) score += 10;
  if (durationMinutes === null) score += 5;

  if (daysUntilActivity !== null && daysUntilActivity >= 0) {
    score += Math.max(0, 35 - Math.min(daysUntilActivity, 35));
  }

  if (activitySpanDays !== null && activitySpanDays > 30) score -= 35;
  if (recruitmentSpanDays !== null && recruitmentSpanDays > 60) score -= 25;
  if (lightweightSecondaryPenaltyPattern.test(searchableText)) score -= 25;
  if (hasLongRunningTitle) score -= 35;

  return {
    item,
    index,
    score,
    activityDate: toSortableDate(getLightweightActivityReferenceDate(item)),
  };
};

const filterLightweightActivities = (items: ParsedVolunteerItem[]) => {
  for (const profile of lightweightRelaxationProfiles) {
    const candidates = items
      .map((item, index) => getLightweightActivityScore(item, index, profile))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.activityDate !== b.activityDate) return a.activityDate - b.activityDate;
        return a.index - b.index;
      });

    if (candidates.length >= 3 || profile === lightweightRelaxationProfiles[lightweightRelaxationProfiles.length - 1]) {
      return candidates.slice(0, 3).map(({ item }) => item);
    }
  }

  return [];
};

const mergeVolunteerItems = (items: ParsedVolunteerItem[]) => {
  const itemMap = new Map<string, ParsedVolunteerItem>();

  items.forEach((item) => {
    const key = item.progrmRegistNo || `${item.progrmSj}-${item.noticeEndde}-${item.progrmBgnde}`;
    if (!key || itemMap.has(key)) return;

    itemMap.set(key, item);
  });

  return Array.from(itemMap.values());
};

const fetchLightweightSupplementItems = async (params: {
  serviceKey: string;
  startDate: string;
  endDate: string;
}) => {
  const supplementalItems: ParsedVolunteerItem[] = [];

  for (const keyword of lightweightSupplementKeywords) {
    const supplementUrl = buildVolunteerSearchUrl({
      serviceKey: params.serviceKey,
      pageNo: 1,
      numOfRows: 30,
      keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    try {
      const response = await fetch(supplementUrl);
      const xmlText = await response.text();

      if (!response.ok) {
        console.error('1365 lightweight supplement request failed:', {
          keyword,
          status: response.status,
          responseText: stripScriptTags(xmlText).slice(0, 500),
        });
        continue;
      }

      supplementalItems.push(...parseVolunteerItems(xmlText));
    } catch (error) {
      console.error('1365 lightweight supplement request errored:', {
        keyword,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return supplementalItems;
};

const weeklyPreferredCategoryKeywords = [
  '환경',
  '생태',
  '문화',
  '체육',
  '예술',
  '관광',
  '생활편의',
  '생활',
  '지역행사',
  '지역 행사',
  '지역안전',
  '지역 안전',
  '농어촌',
  '농촌',
  '어촌',
];

const weeklyPriorityTitleKeywords = [
  '축제',
  '행사',
  '플로깅',
  '환경정화',
  '산책',
  '공원',
  '해변',
  '안내',
  '정리',
  '체험',
  '부스',
];

const weeklyForceExcludePattern = /정기|상시|멘토링|학습지도|치매|요양|상담|사무/;
const weeklyLongRunningTitlePattern = /프로그램|동아리/;
const weeklySecondaryPenaltyPattern = /교육|어르신|센터/;

type WeeklyRelaxationProfile = {
  maxDaysUntilActivity: number;
  requireShortDuration: boolean;
  allowLongActivityPeriod: boolean;
  allowLongRunningTitle: boolean;
};

const weeklyRelaxationProfiles: WeeklyRelaxationProfile[] = [
  { maxDaysUntilActivity: 7, requireShortDuration: true, allowLongActivityPeriod: false, allowLongRunningTitle: false },
  { maxDaysUntilActivity: 14, requireShortDuration: true, allowLongActivityPeriod: false, allowLongRunningTitle: false },
  { maxDaysUntilActivity: 30, requireShortDuration: false, allowLongActivityPeriod: false, allowLongRunningTitle: false },
  { maxDaysUntilActivity: 30, requireShortDuration: false, allowLongActivityPeriod: true, allowLongRunningTitle: true },
];

const isPeriodActivity = (item: ParsedVolunteerItem) => {
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);

  return Boolean(activityStartDate && activityEndDate && toApiDate(activityStartDate) !== toApiDate(activityEndDate));
};

const getWeeklyCandidateDate = (item: ParsedVolunteerItem) => {
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);

  if (isPeriodActivity(item)) {
    if (isApiDateTodayOrLater(activityStartDate) && isApiDateTodayOrLater(activityEndDate)) {
      return activityStartDate;
    }

    if (isApiDateTodayOrEarlier(activityStartDate) && isApiDateTodayOrLater(activityEndDate)) {
      return getTodayApiDate();
    }

    return activityEndDate;
  }

  return activityStartDate || activityEndDate;
};

const getWeeklyActivityScore = (
  item: ParsedVolunteerItem,
  index: number,
  profile: WeeklyRelaxationProfile,
) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  const searchableText = `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm}`;
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const candidateDate = getWeeklyCandidateDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate);
  const daysUntilActivity = getDaysAfterToday(candidateDate);
  const durationMinutes = getActivityDurationMinutes(item);

  if (!isRecruitingItem(item)) return null;
  if (isActivityEnded(item)) return null;
  if (!isApiDateTodayOrLater(recruitmentEndDate)) return null;
  if (!isApiDateTodayOrLater(activityEndDate || activityStartDate)) return null;
  if (weeklyForceExcludePattern.test(searchableText)) return null;
  if (!profile.allowLongRunningTitle && weeklyLongRunningTitlePattern.test(title)) return null;
  if (!profile.allowLongActivityPeriod && activitySpanDays !== null && activitySpanDays > 30) return null;
  if (daysUntilActivity === null || daysUntilActivity < 0 || daysUntilActivity > profile.maxDaysUntilActivity) return null;
  if (profile.requireShortDuration && durationMinutes !== null && durationMinutes > 240) return null;

  let score = 0;

  if (isYesFlag(item.adultPosblAt)) score += 20;
  if (weeklyPreferredCategoryKeywords.some((keyword) => categoryAndTitle.includes(keyword))) score += 35;

  const priorityKeywordCount = weeklyPriorityTitleKeywords.filter((keyword) =>
    searchableText.includes(keyword)
  ).length;
  score += Math.min(priorityKeywordCount * 12, 48);

  if (durationMinutes !== null && durationMinutes <= 240) score += 20;
  if (durationMinutes !== null && durationMinutes <= 120) score += 8;
  if (weeklySecondaryPenaltyPattern.test(searchableText)) score -= 20;

  return {
    item,
    index,
    score,
    bucket: profile.maxDaysUntilActivity,
    activityDate: toSortableDate(candidateDate),
    durationMinutes: durationMinutes ?? Infinity,
  };
};

const filterWeeklyActivities = (items: ParsedVolunteerItem[]) => {
  for (const profile of weeklyRelaxationProfiles) {
    const candidates = items
      .map((item, index) => getWeeklyActivityScore(item, index, profile))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => {
        if (a.bucket !== b.bucket) return a.bucket - b.bucket;
        if (a.activityDate !== b.activityDate) return a.activityDate - b.activityDate;
        if (b.score !== a.score) return b.score - a.score;
        if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
        return a.index - b.index;
      });

    if (candidates.length >= 3 || profile === weeklyRelaxationProfiles[weeklyRelaxationProfiles.length - 1]) {
      return candidates.slice(0, 3).map(({ item }) => item);
    }
  }

  return [];
};

const monthlyRemoteActivityPattern = /비대면|온라인|재택|키트|각 가정|개인공간/;
const monthlyCareFacilityPattern = /요양|병원|치매|간병|어르신 돌봄|재활요양/;
const monthlyOperationalPattern = /정기|상시|멘토링|학습지도|상담|사무/;
const monthlyTravelerFriendlyPattern = /문화|관광|축제|행사|환경|플로깅|해변|공원|산책|캠페인|체험|마을|거리|해안|정화|버스킹/;
const monthlySecondaryPenaltyPattern = /교육|센터|어르신|프로그램/;
const monthlyInstitutionalPenaltyPattern = /기관|복지관|요양원|병동|재가|무료 급식|급식|조리|돌봄/;
const monthlyRepeatPenaltyPattern = /매주|주\s*\d+회|월\s*\d+회|반복|장기|기간\s*내|수시/;
const monthlySupplementKeywords = ['플로깅', '환경정화', '캠페인', '공원', '문화', '체험', '축제', '행사'];

const getMonthBoundsFromApiDate = (today: string) => {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(4, 6));
  const monthEnd = new Date(year, month, 0);

  return {
    monthStart: Number(`${today.slice(0, 6)}01`),
    monthEnd: Number(
      `${monthEnd.getFullYear()}${String(monthEnd.getMonth() + 1).padStart(2, '0')}${String(monthEnd.getDate()).padStart(2, '0')}`,
    ),
  };
};

const clampApiDate = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getMonthlyActivityScore = (item: ParsedVolunteerItem, index: number) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  const searchableText = `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm} ${item.progrmCn}`;
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const durationMinutes = getActivityDurationMinutes(item);
  const today = getTodayApiDate();
  const todayValue = Number(today);
  const { monthStart, monthEnd } = getMonthBoundsFromApiDate(today);
  const activityStartValue = toSortableDate(activityStartDate);
  const activityEndValue = toSortableDate(activityEndDate || activityStartDate);
  const recruitmentEndValue = toSortableDate(recruitmentEndDate);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate || activityStartDate);
  const hasTravelerFriendlyKeyword = monthlyTravelerFriendlyPattern.test(searchableText);

  if (!isRecruitingItem(item)) return null;
  if (isActivityEnded(item)) return null;
  if (!recruitmentEndDate || recruitmentEndValue < todayValue) return null;
  if (!activityStartDate) return null;
  if (!activityEndValue || activityEndValue < todayValue) return null;
  if (!activityStartValue || activityStartValue > monthEnd) return null;
  if (activityEndValue < monthStart) return null;
  if (!isYesFlag(item.adultPosblAt)) return null;
  if (monthlyRemoteActivityPattern.test(searchableText)) return null;
  if (monthlyCareFacilityPattern.test(searchableText)) return null;
  if (monthlyOperationalPattern.test(searchableText)) return null;
  if (activitySpanDays !== null && activitySpanDays >= 60 && !hasTravelerFriendlyKeyword) return null;

  let score = 0;
  const availableStartDate = clampApiDate(activityStartValue, Math.max(todayValue, monthStart), monthEnd);
  const availableEndDate = clampApiDate(activityEndValue, monthStart, monthEnd);

  if (hasTravelerFriendlyKeyword) score += 45;
  if (weeklyPreferredCategoryKeywords.some((kw) => categoryAndTitle.includes(kw))) score += 30;

  const priorityCount = weeklyPriorityTitleKeywords.filter((kw) => searchableText.includes(kw)).length;
  score += Math.min(priorityCount * 10, 40);

  if (durationMinutes !== null && durationMinutes >= 60 && durationMinutes <= 240) score += 35;
  else if (durationMinutes !== null && durationMinutes <= 360) score += 12;

  if (activitySpanDays !== null && activitySpanDays <= 14) score += 18;
  else if (activitySpanDays !== null && activitySpanDays >= 30) score -= 18;
  if (activitySpanDays !== null && activitySpanDays >= 60) score -= 28;

  if (monthlySecondaryPenaltyPattern.test(searchableText)) score -= 18;
  if (monthlyInstitutionalPenaltyPattern.test(searchableText)) score -= 24;
  if (monthlyRepeatPenaltyPattern.test(searchableText)) score -= 20;
  if (recruitmentEndValue === todayValue) score -= 10;

  return {
    item,
    index,
    score,
    availableStartDate,
    availableEndDate,
    recruitmentEndDate: recruitmentEndValue,
    durationMinutes: durationMinutes ?? Infinity,
    hasTravelerFriendlyKeyword,
    activitySpanDays: activitySpanDays ?? Infinity,
  };
};

const getMonthlyActivityRejectReason = (item: ParsedVolunteerItem) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  const searchableText = `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm} ${item.progrmCn}`;
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const today = getTodayApiDate();
  const todayValue = Number(today);
  const { monthStart, monthEnd } = getMonthBoundsFromApiDate(today);
  const activityStartValue = toSortableDate(activityStartDate);
  const activityEndValue = toSortableDate(activityEndDate || activityStartDate);
  const recruitmentEndValue = toSortableDate(recruitmentEndDate);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate || activityStartDate);
  const hasTravelerFriendlyKeyword = monthlyTravelerFriendlyPattern.test(searchableText);

  if (!isRecruitingItem(item)) return 'not_recruiting';
  if (isActivityEnded(item)) return 'activity_ended';
  if (!recruitmentEndDate || recruitmentEndValue < todayValue) return 'recruitment_ended';
  if (!activityStartDate) return 'missing_activity_start';
  if (!activityEndValue || activityEndValue < todayValue) return 'activity_end_before_today';
  if (!activityStartValue || activityStartValue > monthEnd) return 'activity_start_after_month_end';
  if (activityEndValue < monthStart) return 'activity_end_before_month_start';
  if (!isYesFlag(item.adultPosblAt)) return 'not_adult_eligible';
  if (monthlyRemoteActivityPattern.test(searchableText)) return 'remote_keyword';
  if (monthlyCareFacilityPattern.test(searchableText)) return 'care_facility_keyword';
  if (monthlyOperationalPattern.test(searchableText)) return 'operational_keyword';
  if (activitySpanDays !== null && activitySpanDays >= 60 && !hasTravelerFriendlyKeyword) {
    return 'long_without_traveler_keyword';
  }

  return 'passed';
};

const filterMonthlyActivities = (items: ParsedVolunteerItem[]) => {
  const candidates = items
    .map((item, index) => getMonthlyActivityScore(item, index))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => {
      if (a.availableStartDate !== b.availableStartDate) return a.availableStartDate - b.availableStartDate;
      if (a.recruitmentEndDate !== b.recruitmentEndDate) return a.recruitmentEndDate - b.recruitmentEndDate;
      if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
      if (a.hasTravelerFriendlyKeyword !== b.hasTravelerFriendlyKeyword) return a.hasTravelerFriendlyKeyword ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.activitySpanDays !== b.activitySpanDays) return a.activitySpanDays - b.activitySpanDays;
      if (a.availableEndDate !== b.availableEndDate) return a.availableEndDate - b.availableEndDate;
      return a.index - b.index;
    });

  return candidates.slice(0, 3).map(({ item }) => item);
};

const getMonthlyRejectReasonCounts = (items: ParsedVolunteerItem[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const reason = getMonthlyActivityRejectReason(item);
    counts[reason] = (counts[reason] ?? 0) + 1;
    return counts;
  }, {});

const fetchMonthlySupplementItems = async (params: {
  serviceKey: string;
  startDate: string;
  endDate: string;
}) => {
  const supplementalItems: ParsedVolunteerItem[] = [];

  for (const keyword of monthlySupplementKeywords) {
    const supplementUrl = buildVolunteerSearchUrl({
      serviceKey: params.serviceKey,
      pageNo: 1,
      numOfRows: 20,
      keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    try {
      const response = await fetch(supplementUrl);
      const xmlText = await response.text();

      if (!response.ok) {
        console.error('1365 monthly supplement request failed:', {
          keyword,
          status: response.status,
          responseText: stripScriptTags(xmlText).slice(0, 500),
        });
        continue;
      }

      supplementalItems.push(...parseVolunteerItems(xmlText));
    } catch (error) {
      console.error('1365 monthly supplement request errored:', {
        keyword,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return supplementalItems;
};

const fetchWeeklySupplementItems = async (params: {
  serviceKey: string;
  startDate: string;
  endDate: string;
  pageSize: number;
}) => {
  const supplementalItems: ParsedVolunteerItem[] = [];

  for (const pageNo of [2, 3]) {
    const supplementUrl = buildVolunteerSearchUrl({
      serviceKey: params.serviceKey,
      pageNo,
      numOfRows: params.pageSize,
      keyword: '',
      startDate: params.startDate,
      endDate: params.endDate,
    });

    try {
      const response = await fetch(supplementUrl);
      const xmlText = await response.text();

      if (!response.ok) {
        console.error('1365 weekly supplement request failed:', {
          pageNo,
          status: response.status,
          responseText: stripScriptTags(xmlText).slice(0, 500),
        });
        continue;
      }

      supplementalItems.push(...parseVolunteerItems(xmlText));
    } catch (error) {
      console.error('1365 weekly supplement request errored:', {
        pageNo,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return supplementalItems;
};

const festivalPriorityKeywords = [
  '축제',
  '행사',
  '문화',
  '관광',
  '공연',
  '박람회',
  '체험',
  '체험부스',
  '부스',
  '안내',
  '운영지원',
  '운영 지원',
  '페스티벌',
  '플리마켓',
  '마켓',
  '지역축제',
  '거리축제',
  '해변축제',
  '봄축제',
  '여름축제',
];

const festivalCoreKeywordPattern = /축제|행사/;

const festivalPreferredCategoryKeywords = [
  '문화',
  '체육',
  '예술',
  '관광',
  '생활편의',
  '생활',
  '지역행사',
  '지역 행사',
  '지역안전',
  '지역 안전',
  '환경',
  '생태',
];

const festivalForceExcludePattern = /정기|상시|멘토링|학습지도|치매|요양|상담|사무/;
const festivalSecondaryPenaltyPattern = /교육원|교육청|고등학생|프로그램|센터|기관|보조|교육|어르신/;
const festivalLongRunningTitlePattern = /프로그램|동아리/;
const festivalSupplementKeywords = ['축제', '행사', '문화', '관광', '체험', '부스', '안내', '페스티벌', '마켓'];

type FestivalRelaxationProfile = {
  maxDaysUntilActivity: number;
  requirePreferredSignal: boolean;
  requireShortActivityPeriod: boolean;
};

const festivalRelaxationProfiles: FestivalRelaxationProfile[] = [
  { maxDaysUntilActivity: 14, requirePreferredSignal: true, requireShortActivityPeriod: true },
  { maxDaysUntilActivity: 30, requirePreferredSignal: true, requireShortActivityPeriod: true },
  { maxDaysUntilActivity: 30, requirePreferredSignal: false, requireShortActivityPeriod: true },
  { maxDaysUntilActivity: 30, requirePreferredSignal: false, requireShortActivityPeriod: false },
];

const getFestivalActivityReferenceDate = (item: ParsedVolunteerItem) => {
  const activityStartDate = getActivityStartDate(item);
  if (isApiDateTodayOrLater(activityStartDate)) return activityStartDate;

  return getLightweightActivityEndDate(item);
};

const getFestivalActivityScore = (
  item: ParsedVolunteerItem,
  index: number,
  profile: FestivalRelaxationProfile,
) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  const searchableText = `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm}`;
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const daysUntilDeadline = getDaysAfterToday(recruitmentEndDate);
  const activityReferenceDate = getFestivalActivityReferenceDate(item);
  const daysUntilActivity = getDaysAfterToday(activityReferenceDate);
  const activitySpanDays = getApiDateSpanDays(getActivityStartDate(item), getLightweightActivityEndDate(item));
  const recruitmentSpanDays = getApiDateSpanDays(getRecruitmentStartDate(item), recruitmentEndDate);
  const priorityKeywordCount = festivalPriorityKeywords.filter((keyword) =>
    searchableText.includes(keyword)
  ).length;
  const hasCoreKeyword = festivalCoreKeywordPattern.test(searchableText);
  const hasPreferredCategory = festivalPreferredCategoryKeywords.some((keyword) => categoryAndTitle.includes(keyword));
  const hasPreferredSignal = priorityKeywordCount > 0 || hasPreferredCategory;
  const hasLongRunningTitle = festivalLongRunningTitlePattern.test(title);

  if (!isRecruitingItem(item)) return null;
  if (isActivityEnded(item)) return null;
  if (!isApiDateTodayOrLater(recruitmentEndDate)) return null;
  if (daysUntilActivity === null || daysUntilActivity < 0 || daysUntilActivity > profile.maxDaysUntilActivity) return null;
  if (festivalForceExcludePattern.test(searchableText)) return null;
  if (!hasPreferredSignal) return null;
  if (profile.requirePreferredSignal && priorityKeywordCount === 0 && !hasPreferredCategory) return null;
  if (profile.requireShortActivityPeriod && activitySpanDays !== null && activitySpanDays > 30 && !hasCoreKeyword) return null;
  if (recruitmentSpanDays !== null && recruitmentSpanDays > 60 && !hasCoreKeyword) return null;
  if (hasLongRunningTitle && !hasCoreKeyword) return null;

  let score = 0;

  if (/축제|행사/.test(title)) score += 95;
  else if (hasCoreKeyword) score += 70;
  score += Math.min(priorityKeywordCount * 18, 90);
  if (categoryAndTitle.includes('문화') || categoryAndTitle.includes('관광')) score += 45;
  else if (hasPreferredCategory) score += 28;

  if (isYesFlag(item.adultPosblAt)) score += 12;
  if (daysUntilActivity !== null && daysUntilActivity >= 0) {
    score += Math.max(0, 30 - Math.min(daysUntilActivity, 30));
  }
  if (daysUntilDeadline !== null) {
    if (daysUntilDeadline >= 2 && daysUntilDeadline <= 14) score += 28;
    else if (daysUntilDeadline === 0) score -= 35;
    else if (daysUntilDeadline === 1) score -= 8;
  }
  if (activitySpanDays !== null && activitySpanDays >= 1 && activitySpanDays <= 3) score += 32;
  else if (activitySpanDays !== null && activitySpanDays > 30) score -= hasCoreKeyword ? 25 : 60;
  if (recruitmentSpanDays !== null && recruitmentSpanDays > 60) score -= hasCoreKeyword ? 20 : 45;
  if (festivalSecondaryPenaltyPattern.test(searchableText)) score -= 45;
  if (hasLongRunningTitle) score -= 30;

  return {
    item,
    index,
    score,
    activityDate: toSortableDate(activityReferenceDate),
    daysUntilDeadline: daysUntilDeadline ?? Infinity,
  };
};

const pickFestivalFinalCandidates = (
  candidates: Array<NonNullable<ReturnType<typeof getFestivalActivityScore>>>,
) => {
  const preferredDeadline = candidates.filter((candidate) =>
    candidate.daysUntilDeadline >= 2 && candidate.daysUntilDeadline <= 14
  );
  const otherFutureDeadline = candidates.filter((candidate) =>
    candidate.daysUntilDeadline > 14 || candidate.daysUntilDeadline === 1
  );
  const todayDeadline = candidates.filter((candidate) => candidate.daysUntilDeadline === 0);
  const selected: typeof candidates = [];

  [...preferredDeadline, ...otherFutureDeadline].forEach((candidate) => {
    if (selected.length < 3) selected.push(candidate);
  });

  if (selected.length < 3 && todayDeadline.length > 0) {
    selected.push(todayDeadline[0]);
  }

  return selected.slice(0, 3);
};

const limitTodayDeadlineActivities = (items: ParsedVolunteerItem[]) => {
  const sortedItems = [...items].sort((a, b) => {
    const aDays = getDaysAfterToday(getRecruitmentEndDate(a));
    const bDays = getDaysAfterToday(getRecruitmentEndDate(b));
    const aPreferred = aDays !== null && aDays >= 2 && aDays <= 14 ? 0 : aDays === 0 ? 2 : 1;
    const bPreferred = bDays !== null && bDays >= 2 && bDays <= 14 ? 0 : bDays === 0 ? 2 : 1;

    if (aPreferred !== bPreferred) return aPreferred - bPreferred;
    return (aDays ?? Infinity) - (bDays ?? Infinity);
  });
  const selected: ParsedVolunteerItem[] = [];
  let todayDeadlineCount = 0;

  sortedItems.forEach((item) => {
    if (selected.length >= 3) return;

    const daysUntilDeadline = getDaysAfterToday(getRecruitmentEndDate(item));
    if (daysUntilDeadline === 0) {
      if (todayDeadlineCount >= 1) return;
      todayDeadlineCount += 1;
    }

    selected.push(item);
  });

  return selected;
};

const filterFestivalActivities = (items: ParsedVolunteerItem[]) => {
  for (const profile of festivalRelaxationProfiles) {
    const candidates = items
      .map((item, index) => getFestivalActivityScore(item, index, profile))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.activityDate !== b.activityDate) return a.activityDate - b.activityDate;
        return a.index - b.index;
      });

    if (candidates.length >= 3 || profile === festivalRelaxationProfiles[festivalRelaxationProfiles.length - 1]) {
      const finalCandidates = pickFestivalFinalCandidates(candidates);
      return finalCandidates.map(({ item }) => item);
    }
  }

  return [];
};

const fetchFestivalSupplementItems = async (params: {
  serviceKey: string;
  startDate: string;
  endDate: string;
}) => {
  const supplementalItems: ParsedVolunteerItem[] = [];

  for (const keyword of festivalSupplementKeywords) {
    const supplementUrl = buildVolunteerSearchUrl({
      serviceKey: params.serviceKey,
      pageNo: 1,
      numOfRows: 30,
      keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    try {
      const response = await fetch(supplementUrl);
      const xmlText = await response.text();

      if (!response.ok) {
        console.error('1365 festival supplement request failed:', {
          keyword,
          status: response.status,
          responseText: stripScriptTags(xmlText).slice(0, 500),
        });
        continue;
      }

      supplementalItems.push(...parseVolunteerItems(xmlText));
    } catch (error) {
      console.error('1365 festival supplement request errored:', {
        keyword,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return supplementalItems;
};

const hiddenFriendlyCategoryKeywords = [
  '환경',
  '생태',
  '문화',
  '체육',
  '예술',
  '관광',
  '생활',
  '지역행사',
  '지역 행사',
  '농어촌',
  '농촌',
  '어촌',
  '지역안전',
  '지역 안전',
  '보호',
];

const hiddenTitlePenaltyPattern = /정기|상시|멘토링|학습지도|프로그램 운영|치매|어르신|요양|센터/;

const getActivityDurationMinutes = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const beginMinutes = toTimeMinutes(item.actBeginTm);
  const endMinutes = toTimeMinutes(item.actEndTm);

  if (beginMinutes === null || endMinutes === null || endMinutes <= beginMinutes) return null;

  return endMinutes - beginMinutes;
};

const getHiddenActivityCandidateScore = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const categoryAndTitle = `${item.srvcClCode} ${item.progrmSj}`;
  const durationMinutes = getActivityDurationMinutes(item);
  let score = 0;

  if (hiddenFriendlyCategoryKeywords.some((keyword) => categoryAndTitle.includes(keyword))) score += 60;
  if (durationMinutes !== null && durationMinutes <= 360) score += 30;
  if (hiddenTitlePenaltyPattern.test(item.progrmSj)) score -= 80;

  return score;
};

const getHiddenActivityCandidates = (
  items: Array<ReturnType<typeof parseVolunteerItems>[number]>,
  limit = 20,
) =>
  items
    .filter(isFutureRecruitingActivity)
    .filter((item) => !isTravelHardExcluded(item))
    .map((item, index) => ({
      item,
      index,
      score: getHiddenActivityCandidateScore(item),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ item }) => item);

const sortHiddenActivitiesByLowParticipants = (
  items: Array<ReturnType<typeof parseVolunteerItems>[number]>,
) =>
  items
    .map((item) => ({
      item,
      participantCount: parseParticipantNumber(getCurrentParticipantValue(item)),
    }))
    .filter(({ participantCount }) => participantCount !== null)
    .sort((a, b) => {
      if (a.participantCount !== b.participantCount) {
        return (a.participantCount ?? Infinity) - (b.participantCount ?? Infinity);
      }

      return toSortableDate(getActivityStartDate(a.item)) - toSortableDate(getActivityStartDate(b.item));
    })
    .map(({ item }) => item);

const mergeVolunteerDetailItem = (
  searchItem: ReturnType<typeof parseVolunteerItems>[number],
  detailItem: ReturnType<typeof parseVolunteerItems>[number] | null,
) => {
  if (!detailItem) return searchItem;

  return {
    ...searchItem,
    noticeEndde: detailItem.noticeEndde || searchItem.noticeEndde,
    noticeEndDate: detailItem.noticeEndDate || searchItem.noticeEndDate,
    rcritEndde: detailItem.rcritEndde || searchItem.rcritEndde,
    rcritEndDate: detailItem.rcritEndDate || searchItem.rcritEndDate,
    reqstEndde: detailItem.reqstEndde || searchItem.reqstEndde,
    reqstEndDate: detailItem.reqstEndDate || searchItem.reqstEndDate,
    rcritNmpr: detailItem.rcritNmpr || searchItem.rcritNmpr,
    recrtNmpr: detailItem.recrtNmpr || searchItem.recrtNmpr,
    reqstNmpr: searchItem.reqstNmpr || detailItem.reqstNmpr,
    progrmRcritNmpr: detailItem.progrmRcritNmpr || searchItem.progrmRcritNmpr,
    rcritNmprCo: detailItem.rcritNmprCo || searchItem.rcritNmprCo,
    wanted: detailItem.wanted || searchItem.wanted,
    capacity: detailItem.capacity || searchItem.capacity,
    nanmmbyNmpr: detailItem.nanmmbyNmpr || searchItem.nanmmbyNmpr,
    applcntNmpr: detailItem.applcntNmpr || searchItem.applcntNmpr,
    appTotal: detailItem.appTotal || searchItem.appTotal,
    partcptnNmpr: detailItem.partcptnNmpr || searchItem.partcptnNmpr,
    currentParticipants: detailItem.currentParticipants || searchItem.currentParticipants,
    requestCount: detailItem.requestCount || searchItem.requestCount,
    adultPosblAt: mergeAvailabilityFlag(searchItem.adultPosblAt, detailItem.adultPosblAt),
    yngbgsPosblAt: mergeAvailabilityFlag(searchItem.yngbgsPosblAt, detailItem.yngbgsPosblAt),
    familyPosblAt: mergeAvailabilityFlag(searchItem.familyPosblAt, detailItem.familyPosblAt),
    grpPosblAt: mergeAvailabilityFlag(searchItem.grpPosblAt, detailItem.grpPosblAt),
    mnnstNm: searchItem.mnnstNm || detailItem.mnnstNm,
    target: searchItem.target || detailItem.target,
    srvcTarget: searchItem.srvcTarget || detailItem.srvcTarget,
    volunteerTarget: searchItem.volunteerTarget || detailItem.volunteerTarget,
    trgetNm: searchItem.trgetNm || detailItem.trgetNm,
  };
};

const isAdultEligibleItem = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  isYesFlag(item.adultPosblAt);

const fetchVolunteerDetailItem = async (serviceKey: string, progrmRegistNo: string) => {
  if (!progrmRegistNo) return null;

  const detailUrl = buildVolunteerDetailApiUrl({ serviceKey, progrmRegistNo });

  try {
    const response = await fetch(detailUrl);
    const xmlText = await response.text();

    if (!response.ok) {
      console.error('1365 detail request failed:', {
        progrmRegistNo,
        status: response.status,
        responseText: xmlText.slice(0, 500),
      });
      return null;
    }

    return parseVolunteerItems(xmlText)[0] ?? null;
  } catch (error) {
    console.error('1365 detail request errored:', {
      progrmRegistNo,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const mapVolunteerActivity = (
  item: ReturnType<typeof parseVolunteerItems>[number],
  options: { compactLocation?: boolean; keywordImage?: boolean; omitImageUrl?: boolean } = {},
): VolunteerActivity => {
  const beginTime = formatTime(item.actBeginTm);
  const endTime = formatTime(item.actEndTm);
  const status: VolunteerStatus = isActivityEnded(item) ? '지난 활동' : '모집중';
  const detailUrl = normalizeVolunteerUrl(item.url, item.progrmRegistNo);
  const recentSortInfo = getRecentSortInfo(item);
  const capacity = pickRecruitCapacity(item);
  const currentParticipants = getCurrentParticipantValue(item);

  return {
    id: item.progrmRegistNo,
    title: item.progrmSj,
    location: options.compactLocation ? shortenHomeLocation(item.actPlace) : item.actPlace,
    region: [item.sidoCd, item.gugunCd].filter(Boolean).join(' '),
    recruitmentStartDate: formatDate(item.noticeBgnde),
    recruitmentEndDate: formatDate(getRecruitmentEndDate(item)),
    activityStartDate: formatDate(item.progrmBgnde),
    activityEndDate: formatDate(item.progrmEndde),
    time: [beginTime, endTime].filter(Boolean).join(' ~ '),
    category: item.srvcClCode,
    organization: item.nanmmbyNm,
    capacity: normalizeApiCapacity(capacity),
    currentParticipants: normalizeApiCapacity(currentParticipants),
    volunteerTarget: formatVolunteerTarget(item),
    volunteerType: formatVolunteerType(item),
    status,
    imageUrl: options.omitImageUrl
      ? ''
      : getImageUrl(
        item.srvcClCode,
        options.keywordImage ? `${item.progrmSj} ${item.actPlace} ${item.nanmmbyNm}` : '',
      ),
    applyUrl: detailUrl || undefined,
    sourceUrl: detailUrl || undefined,
    recentSortBasis: recentSortInfo.basis,
    recentSortDate: formatDate(recentSortInfo.rawDate),
    progrmRegistNo: item.progrmRegistNo,
    progrmSttusSe: item.progrmSttusSe,
  };
};

const mapDefaultVolunteerActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  mapVolunteerActivity(item);

const mapHomeVolunteerActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  mapVolunteerActivity(item, { omitImageUrl: true });

export type HomeVolunteerSections = {
  lightweight: VolunteerActivity[];
  monthly: VolunteerActivity[];
  festival: VolunteerActivity[];
};

const fetchHomeVolunteerSearchItems = async (params: {
  serviceKey: string;
  sort: 'lightweight' | 'monthly' | 'festival';
  numOfRows: number;
}) => {
  const upstreamUrl = buildVolunteerSearchUrl({
    serviceKey: params.serviceKey,
    pageNo: 1,
    numOfRows: params.numOfRows,
    keyword: '',
    startDate: '',
    endDate: '',
  });

  const response = await fetch(upstreamUrl);
  const xmlText = await response.text();

  if (!response.ok) {
    console.error('1365 home cache upstream request failed:', {
      sort: params.sort,
      requestUrl: upstreamUrl.replace(params.serviceKey, '[REDACTED_SERVICE_KEY]'),
      status: response.status,
      responseText: stripScriptTags(xmlText).slice(0, 1000),
    });
    throw new Error(`1365 ${params.sort} 홈 데이터를 불러오지 못했어요.`);
  }

  const resultCode = getTagValue(xmlText, 'resultCode');
  const resultMsg = getTagValue(xmlText, 'resultMsg');

  if (resultCode && resultCode !== '00') {
    console.error('1365 home cache upstream returned error result:', {
      sort: params.sort,
      requestUrl: upstreamUrl.replace(params.serviceKey, '[REDACTED_SERVICE_KEY]'),
      status: response.status,
      responseText: stripScriptTags(xmlText).slice(0, 1000),
    });
    throw new Error(resultMsg || `1365 ${params.sort} 홈 데이터를 불러오지 못했어요.`);
  }

  return {
    totalCount: Number.parseInt(getTagValue(xmlText, 'totalCount'), 10) || 0,
    items: parseVolunteerItems(xmlText),
  };
};

const buildLightweightHomeSection = async (serviceKey: string) => {
  const { items } = await fetchHomeVolunteerSearchItems({ serviceKey, sort: 'lightweight', numOfRows: 30 });
  let sourceItems = items;
  let lightweightItems = filterLightweightActivities(sourceItems);

  if (lightweightItems.length < 3) {
    const supplementalItems = await fetchLightweightSupplementItems({
      serviceKey,
      startDate: '',
      endDate: '',
    });
    sourceItems = mergeVolunteerItems([...items, ...supplementalItems]);
    lightweightItems = filterLightweightActivities(sourceItems);
  }

  return lightweightItems.map(mapHomeVolunteerActivity);
};

const buildMonthlyHomeSection = async (serviceKey: string) => {
  const { items } = await fetchHomeVolunteerSearchItems({ serviceKey, sort: 'monthly', numOfRows: 30 });
  const supplementalItems = await fetchMonthlySupplementItems({
    serviceKey,
    startDate: '',
    endDate: '',
  });
  const sourceItems = mergeVolunteerItems([...items, ...supplementalItems]);
  const monthlyFilteredItems = filterMonthlyActivities(sourceItems);
  const monthlyItems = monthlyFilteredItems
    .map(mapHomeVolunteerActivity)
    .filter((activity) => activity.status !== '지난 활동');

  if (monthlyItems.length === 0) {
    console.warn('1365 monthly home candidates filtered to zero:', {
      baseCandidateCount: items.length,
      supplementCandidateCount: supplementalItems.length,
      mergedCandidateCount: sourceItems.length,
      filterPassedCount: monthlyFilteredItems.length,
      finalMonthlyCount: monthlyItems.length,
      rejectReasonCounts: getMonthlyRejectReasonCounts(sourceItems),
    });
  }

  return monthlyItems;
};

const buildFestivalHomeSection = async (serviceKey: string) => {
  const { items } = await fetchHomeVolunteerSearchItems({ serviceKey, sort: 'festival', numOfRows: 50 });
  let sourceItems = items;
  let festivalItems = filterFestivalActivities(sourceItems);

  if (festivalItems.length < 3) {
    const supplementalItems = await fetchFestivalSupplementItems({
      serviceKey,
      startDate: '',
      endDate: '',
    });
    sourceItems = mergeVolunteerItems([...items, ...supplementalItems]);
    festivalItems = filterFestivalActivities(sourceItems);
  }

  const finalFestivalItems = limitTodayDeadlineActivities(
    festivalItems.filter((item) => isApiDateTodayOrLater(getRecruitmentEndDate(item)))
  );

  return finalFestivalItems.map((item) =>
    mapVolunteerActivity(item, { compactLocation: true, omitImageUrl: true })
  );
};

export const buildHomeVolunteerSections = async (serviceKey: string): Promise<HomeVolunteerSections> => {
  const [lightweight, monthly, festival] = await Promise.all([
    buildLightweightHomeSection(serviceKey),
    buildMonthlyHomeSection(serviceKey),
    buildFestivalHomeSection(serviceKey),
  ]);

  return { lightweight, monthly, festival };
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
  const sort = getSingleQueryValue(req.query.sort).trim();

  // 여행지명 기반 검색: sort 없는 일반 검색에서만 지역코드 사용
  const sidoCd = !sort ? getSingleQueryValue(req.query.sidoCd).trim() : '';
  const gugunCd = !sort ? getSingleQueryValue(req.query.gugunCd).trim() : '';
  const fallbackKeyword = !sort ? getSingleQueryValue(req.query.fallbackKeyword).trim() : '';
  const useRegionCodes = Boolean(sidoCd);

  const upstreamUrl = buildVolunteerSearchUrl({
    serviceKey,
    pageNo,
    numOfRows,
    keyword,
    startDate,
    endDate,
    sidoCd: useRegionCodes ? sidoCd : undefined,
    gugunCd: useRegionCodes && gugunCd ? gugunCd : undefined,
  });

  try {
    const response = await fetch(upstreamUrl);
    const xmlText = await response.text();

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
    let totalCount = Number.parseInt(getTagValue(xmlText, 'totalCount'), 10) || 0;
    let rawItems = parseVolunteerItems(xmlText);

    if (resultCode && resultCode !== '00') {
      console.error('1365 upstream returned error result:', {
        requestUrl: upstreamUrl.replace(serviceKey, '[REDACTED_SERVICE_KEY]'),
        status: response.status,
        responseText: stripScriptTags(xmlText).slice(0, 1000),
      });
      if (!useRegionCodes) {
        sendFailure(res, 502, resultMsg || '1365 검색 결과를 불러오지 못했어요.');
        return;
      }
      // 지역코드 검색 API 오류 → keyword fallback으로 계속 진행
      rawItems = [];
    }

    // 시도 단독 검색이 너무 좁게 해석되거나 비었을 때 keyword fallback으로 보강
    if (useRegionCodes && (rawItems.length === 0 || (!gugunCd && rawItems.length < numOfRows))) {
      const tryKeywordFallback = async (kw: string): Promise<boolean> => {
        if (!kw) return false;
        try {
          const kwUrl = buildVolunteerSearchUrl({ serviceKey, pageNo, numOfRows, keyword: kw, startDate, endDate, sidoCd: sidoCd || undefined, gugunCd: gugunCd || undefined });
          const kwRes = await fetch(kwUrl);
          if (!kwRes.ok) return false;
          const kwXml = await kwRes.text();
          const kwCode = getTagValue(kwXml, 'resultCode');
          if (kwCode && kwCode !== '00') return false;
          const kwItems = parseVolunteerItems(kwXml);
          rawItems = mergeVolunteerItems([...rawItems, ...kwItems]);
          totalCount = Math.max(
            totalCount,
            Number.parseInt(getTagValue(kwXml, 'totalCount'), 10) || kwItems.length,
          );
          return kwItems.length > 0;
        } catch {
          return false;
        }
      };

      // 2차: 원래 입력값 keyword 검색
      const kwResolved = await tryKeywordFallback(keyword);
      // 3차: alias sigungu keyword 검색
      if (!kwResolved && fallbackKeyword && fallbackKeyword !== keyword) {
        await tryKeywordFallback(fallbackKeyword);
      }
    }

    if (sort === 'lightweight') {
      let lightweightSourceItems = rawItems;
      let lightweightItems = filterLightweightActivities(lightweightSourceItems);

      if (lightweightItems.length < 3) {
        const supplementalItems = await fetchLightweightSupplementItems({
          serviceKey,
          startDate,
          endDate,
        });
        lightweightSourceItems = mergeVolunteerItems([...rawItems, ...supplementalItems]);
        lightweightItems = filterLightweightActivities(lightweightSourceItems);
      }

      const mappedLightweightItems = lightweightItems
        .map(mapHomeVolunteerActivity);

      sendSuccess(res, {
        items: mappedLightweightItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    if (sort === 'weekly') {
      // Filter first using search fields, then fetch details only for candidates (~3)
      let weeklyFilteredItems = filterWeeklyActivities(rawItems);

      if (weeklyFilteredItems.length < 3) {
        const supplementalItems = await fetchWeeklySupplementItems({
          serviceKey,
          startDate,
          endDate,
          pageSize: numOfRows,
        });

        if (supplementalItems.length > 0) {
          const mergedWeeklyItems = mergeVolunteerItems([...rawItems, ...supplementalItems]);
          weeklyFilteredItems = filterWeeklyActivities(mergedWeeklyItems);
        }
      }

      const weeklyDetailItems = await Promise.all(
        weeklyFilteredItems.map((item) => fetchVolunteerDetailItem(serviceKey, item.progrmRegistNo))
      );
      const weeklyItems = weeklyFilteredItems
        .map((item, index) => mergeVolunteerDetailItem(item, weeklyDetailItems[index]))
        .map(mapDefaultVolunteerActivity)
        .filter((activity) => activity.status !== '지난 활동');

      sendSuccess(res, {
        items: weeklyItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    if (sort === 'monthly') {
      const supplementalItems = await fetchMonthlySupplementItems({
        serviceKey,
        startDate,
        endDate,
      });
      const monthlySourceItems = mergeVolunteerItems([...rawItems, ...supplementalItems]);
      const monthlyFilteredItems = filterMonthlyActivities(monthlySourceItems);
      const monthlyItems = monthlyFilteredItems
        .map(mapHomeVolunteerActivity)
        .filter((activity) => activity.status !== '지난 활동');

      if (monthlyItems.length === 0) {
        console.warn('1365 monthly search candidates filtered to zero:', {
          baseCandidateCount: rawItems.length,
          supplementCandidateCount: supplementalItems.length,
          mergedCandidateCount: monthlySourceItems.length,
          filterPassedCount: monthlyFilteredItems.length,
          finalMonthlyCount: monthlyItems.length,
          rejectReasonCounts: getMonthlyRejectReasonCounts(monthlySourceItems),
        });
      }

      sendSuccess(res, {
        items: monthlyItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    if (sort === 'festival') {
      let festivalSourceItems = rawItems;
      let festivalItems = filterFestivalActivities(festivalSourceItems);

      if (festivalItems.length < 3) {
        const supplementalItems = await fetchFestivalSupplementItems({
          serviceKey,
          startDate,
          endDate,
        });
        festivalSourceItems = mergeVolunteerItems([...rawItems, ...supplementalItems]);
        festivalItems = filterFestivalActivities(festivalSourceItems);
      }

      const finalFestivalItems = limitTodayDeadlineActivities(
        festivalItems.filter((item) => isApiDateTodayOrLater(getRecruitmentEndDate(item)))
      );

      const mappedFestivalItems = finalFestivalItems.map((item) =>
        mapVolunteerActivity(item, { compactLocation: true, omitImageUrl: true })
      );

      sendSuccess(res, {
        items: mappedFestivalItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    if (sort === 'hidden') {
      const hiddenCandidates = getHiddenActivityCandidates(rawItems, 10);
      const detailItems = await Promise.all(
        hiddenCandidates.map((item) => fetchVolunteerDetailItem(serviceKey, item.progrmRegistNo))
      );
      const hiddenItems = sortHiddenActivitiesByLowParticipants(
        hiddenCandidates.map((item, index) => mergeVolunteerDetailItem(item, detailItems[index]))
          .filter(isAdultEligibleItem)
      )
        .slice(0, 3)
        .map(mapDefaultVolunteerActivity);

      sendSuccess(res, {
        items: hiddenItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    const parsedItems = sort === 'recent'
      ? sortVolunteerItemsByRecent(rawItems)
      : sort === 'recruiting'
        ? filterVolunteerItemsByRecruiting(rawItems)
        : rawItems;

    if (!sort) {
      const processedItems = parsedItems
        .filter(isAdultEligibleItem)
        .sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a));
      const items = processedItems.map(mapDefaultVolunteerActivity);

      sendSuccess(res, {
        items,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    const detailItems = await Promise.all(
      parsedItems.map((item) => fetchVolunteerDetailItem(serviceKey, item.progrmRegistNo))
    );
    const mergedItems = parsedItems
      .map((item, index) => mergeVolunteerDetailItem(item, detailItems[index]))
      .filter(isAdultEligibleItem);

    const processedItems = sort === 'recruiting'
      ? mergedItems
          .filter((item) => !isTravelHardExcluded(item))
      : mergedItems.sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a));

    const items = processedItems.map(mapDefaultVolunteerActivity);

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
