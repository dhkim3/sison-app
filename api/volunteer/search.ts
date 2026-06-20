import { get, list } from '@vercel/blob';
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
type SearchRegionCacheStatus =
  | 'region_cache_hit'
  | 'region_cache_miss'
  | 'region_cache_stale'
  | 'popular_region_cache_hit'
  | 'popular_region_cache_miss'
  | 'popular_region_cache_stale'
  | 'live';

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
export const SEARCH_REGION_CACHE_PATH = 'volunteers-search-regions.json';
export const POPULAR_REGION_CACHE_PATH = 'volunteers-popular-regions.json';
const SEARCH_REGION_CACHE_VERSION = 1;
const SEARCH_REGION_CACHE_SOURCE = '1365';
const SEARCH_REGION_CACHE_PAGE_SIZE = 15;
const SEARCH_REGION_CACHE_MAX_PAGES = 5;

const searchRegionCacheConfigs = [
  { query: '서울', sidoCd: '11', fallbackKeyword: '서울' },
  { query: '부산', sidoCd: '26', fallbackKeyword: '부산' },
  { query: '강릉', sidoCd: '42', gugunCd: '42150', fallbackKeyword: '강원' },
  { query: '제주', sidoCd: '50', fallbackKeyword: '서귀포' },
  { query: '여수', fallbackKeyword: '전남' },
  { query: '경주', fallbackKeyword: '경북' },
  { query: '전주', fallbackKeyword: '전북' },
  { query: '속초', fallbackKeyword: '강원' },
  { query: '인천', fallbackKeyword: '인천광역시' },
  { query: '대구', fallbackKeyword: '대구광역시' },
] as const;

const popularRegionCacheConfigs = [
  { query: '부산 수영구', fallbackKeyword: '부산' },
  { query: '제주', fallbackKeyword: '제주' },
  { query: '서울 마포구', fallbackKeyword: '서울' },
] as const;

type SearchRegionName = typeof searchRegionCacheConfigs[number]['query'];
type PopularRegionName = typeof popularRegionCacheConfigs[number]['query'];
type CachedRegionName = SearchRegionName | PopularRegionName;

export type SearchRegionCachePayload = {
  cacheVersion: number;
  generatedAt: string;
  source: '1365';
  capacityEnrichment?: CapacityEnrichmentStats;
  regions: Partial<Record<CachedRegionName, {
    query: CachedRegionName;
    count: number;
    items: VolunteerActivity[];
    capacityEnrichment?: CapacityEnrichmentStats;
  }>>;
};

export type CapacityEnrichmentStats = {
  attempted: number;
  alreadyHadCapacity: number;
  enriched: number;
  detailCapacityFound: number;
  missingAfterEnrichment: number;
  skipped: number;
};

const fallbackImages: Record<string, string> = {
  '환경': '/activity-images/forest-trail-1.png',
  '교육': '/activity-images/education-culture-1.png',
  '문화': '/activity-images/education-culture-3.png',
  '보건': '/activity-images/care-community-1.png',
  safety: '/activity-images/public-safety-1.png',
  campaign: '/activity-images/office-campaign-1.png',
  rural: '/activity-images/rural-village-1.png',
  festival: '/activity-images/festival-event-1.png',
  beach: '/activity-images/beach-cleanup-1.png',
  forest: '/activity-images/forest-trail-1.png',
  city: '/activity-images/city-travel-1.png',
  default: '/activity-images/default-travel-1.png',
};

const festivalImageRotation = [
  fallbackImages.festival,
  fallbackImages.beach,
  fallbackImages.forest,
  fallbackImages.city,
];

const getSingleQueryValue = (value: string | string[] | undefined, fallback = '') => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
};

const sendSuccess = (
  res: VercelResponse,
  body: {
    items: VolunteerActivity[];
    totalCount: number;
    page: number;
    size: number;
    cacheStatus?: SearchRegionCacheStatus;
  },
) => {
  res.status(200).json({
    ok: true,
    items: body.items,
    totalCount: body.totalCount,
    page: body.page,
    size: body.size,
    ...(body.cacheStatus ? { cacheStatus: body.cacheStatus } : {}),
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
  if (/안전관리|질서|동선|진행\s*보조|안내\s*봉사|행사\s*보조|운영\s*보조|교통\s*안내|체험부스\s*안전|관람객\s*안전/.test(text)) {
    return fallbackImages.safety;
  }
  if (/복지관|보호센터|돌봄|어르신|노인|요양|치매/.test(text)) return fallbackImages['보건'];
  if (/농촌|어촌|농어촌|일손|수확|텃밭|농장/.test(text)) return fallbackImages.rural;
  if (/캠페인|홍보|접수|자료|안내데스크/.test(text)) return fallbackImages.campaign;
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
  if (progrmRegistNo) return buildVolunteerDetailUrl(progrmRegistNo);
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

const hasFutureRecruitmentDeadline = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  isApiDateAfterToday(getRecruitmentEndDate(item));

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

const addApiDateDays = (value: string, days: number) => {
  const date = toApiDateObject(value);
  if (!date) return value;

  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
};

const upcomingRemoteActivityPattern = /비대면|온라인|재택|키트|각 가정|개인공간/;
const upcomingCareFacilityPattern = /요양|병원|치매|간병|어르신 돌봄|재활요양/;
const upcomingOperationalPattern = /정기|상시|멘토링|학습지도|상담|사무/;
const upcomingTravelerFriendlyPattern = /문화|관광|축제|행사|환경|플로깅|해변|공원|산책|캠페인|체험|마을|거리|해안|정화|버스킹/;
const upcomingSecondaryPenaltyPattern = /교육|센터|어르신|프로그램/;
const upcomingInstitutionalPenaltyPattern = /기관|복지관|요양원|병동|재가|무료 급식|급식|조리|돌봄/;
const upcomingRepeatPenaltyPattern = /매주|주\s*\d+회|월\s*\d+회|반복|장기|기간\s*내|수시/;
const upcomingSupplementKeywords = ['플로깅', '환경정화', '캠페인', '공원', '문화', '체험', '축제', '행사'];
const upcomingHomeStrongExcludePattern = new RegExp(
  `${upcomingRemoteActivityPattern.source}|${upcomingCareFacilityPattern.source}`,
);
const UPCOMING_HOME_TARGET_COUNT = 6;
const UPCOMING_SEARCH_TARGET_COUNT = 3;

type UpcomingHomeFallbackLevel = 'strict_upcoming' | 'relaxed_upcoming' | 'upcoming_traveler';

const getUpcomingSearchableText = (item: ParsedVolunteerItem) => {
  const title = item.progrmSj;
  const categoryAndTitle = `${item.srvcClCode} ${title}`;
  return {
    categoryAndTitle,
    searchableText: `${categoryAndTitle} ${item.actPlace} ${item.nanmmbyNm} ${item.progrmCn}`,
  };
};

const getUpcomingCandidateDate = (item: ParsedVolunteerItem) => {
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

const getUpcomingActivityScore = (item: ParsedVolunteerItem, index: number) => {
  const { categoryAndTitle, searchableText } = getUpcomingSearchableText(item);
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const candidateDate = getUpcomingCandidateDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const durationMinutes = getActivityDurationMinutes(item);
  const today = getTodayApiDate();
  const todayValue = Number(today);
  const activityEndValue = toSortableDate(activityEndDate || activityStartDate);
  const candidateDateValue = toSortableDate(candidateDate);
  const recruitmentEndValue = toSortableDate(recruitmentEndDate);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate || activityStartDate);
  const hasTravelerFriendlyKeyword = upcomingTravelerFriendlyPattern.test(searchableText);

  if (!isRecruitingItem(item)) return null;
  if (isActivityEnded(item)) return null;
  if (!recruitmentEndDate || recruitmentEndValue < todayValue) return null;
  if (activityEndValue > 0 && activityEndValue < todayValue) return null;
  if (candidateDateValue > 0 && candidateDateValue < todayValue) return null;
  if (candidateDate && candidateDateValue === 0) return null;
  if (!isYesFlag(item.adultPosblAt)) return null;
  if (upcomingRemoteActivityPattern.test(searchableText)) return null;
  if (upcomingCareFacilityPattern.test(searchableText)) return null;
  if (upcomingOperationalPattern.test(searchableText)) return null;
  if (activitySpanDays !== null && activitySpanDays >= 60 && !hasTravelerFriendlyKeyword) return null;

  let score = 0;
  const sortableActivityDate = candidateDateValue || Number.MAX_SAFE_INTEGER;
  const availableEndDate = activityEndValue || Number.MAX_SAFE_INTEGER;

  if (hasTravelerFriendlyKeyword) score += 45;
  if (weeklyPreferredCategoryKeywords.some((kw) => categoryAndTitle.includes(kw))) score += 30;

  const priorityCount = weeklyPriorityTitleKeywords.filter((kw) => searchableText.includes(kw)).length;
  score += Math.min(priorityCount * 10, 40);

  if (durationMinutes !== null && durationMinutes >= 60 && durationMinutes <= 240) score += 35;
  else if (durationMinutes !== null && durationMinutes <= 360) score += 12;

  if (!candidateDateValue) score -= 25;
  if (activitySpanDays !== null && activitySpanDays <= 14) score += 18;
  else if (activitySpanDays !== null && activitySpanDays >= 30) score -= 18;
  if (activitySpanDays !== null && activitySpanDays >= 60) score -= 28;

  if (upcomingSecondaryPenaltyPattern.test(searchableText)) score -= 18;
  if (upcomingInstitutionalPenaltyPattern.test(searchableText)) score -= 24;
  if (upcomingRepeatPenaltyPattern.test(searchableText)) score -= 20;
  if (recruitmentEndValue === todayValue) score -= 10;

  return {
    item,
    index,
    score,
    activityDate: sortableActivityDate,
    availableEndDate,
    recruitmentEndDate: recruitmentEndValue,
    isRecruiting: isRecruitingItem(item),
    durationMinutes: durationMinutes ?? Infinity,
    hasTravelerFriendlyKeyword,
    activitySpanDays: activitySpanDays ?? Infinity,
  };
};

const getUpcomingHomeFallbackScore = (
  item: ParsedVolunteerItem,
  index: number,
  sourceLevel: Exclude<UpcomingHomeFallbackLevel, 'strict_upcoming'>,
) => {
  const { categoryAndTitle, searchableText } = getUpcomingSearchableText(item);
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const candidateDate = getUpcomingCandidateDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const durationMinutes = getActivityDurationMinutes(item);
  const today = getTodayApiDate();
  const todayValue = Number(today);
  const activityStartValue = toSortableDate(activityStartDate);
  const activityEndValue = toSortableDate(activityEndDate || activityStartDate);
  const candidateDateValue = toSortableDate(candidateDate);
  const recruitmentEndValue = toSortableDate(recruitmentEndDate);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate || activityStartDate);
  const daysUntilActivity = getDaysAfterToday(candidateDate);
  const hasTravelerFriendlyKeyword = upcomingTravelerFriendlyPattern.test(searchableText);

  if (!isRecruitingItem(item)) return null;
  if (isActivityEnded(item)) return null;
  if (!recruitmentEndDate || recruitmentEndValue < todayValue) return null;
  if (activityEndValue > 0 && activityEndValue < todayValue) return null;
  if (candidateDateValue > 0 && candidateDateValue < todayValue) return null;
  if (candidateDate && candidateDateValue === 0) return null;
  if (!isYesFlag(item.adultPosblAt)) return null;
  if (upcomingHomeStrongExcludePattern.test(searchableText)) return null;

  if (sourceLevel === 'relaxed_upcoming') {
    if (!hasTravelerFriendlyKeyword && !weeklyPreferredCategoryKeywords.some((kw) => categoryAndTitle.includes(kw))) return null;
    if (activitySpanDays !== null && activitySpanDays >= 90 && !hasTravelerFriendlyKeyword) return null;
  } else {
    const maxUpcomingDate = Number(addApiDateDays(today, 45));
    if (activityStartValue > maxUpcomingDate) return null;
    if (!hasTravelerFriendlyKeyword) return null;
    if (activitySpanDays !== null && activitySpanDays >= 45) return null;
  }

  let score = sourceLevel === 'relaxed_upcoming' ? 15 : 0;
  const sortableActivityDate = candidateDateValue || Number.MAX_SAFE_INTEGER;
  const availableEndDate = activityEndValue || Number.MAX_SAFE_INTEGER;

  if (hasTravelerFriendlyKeyword) score += 35;
  if (weeklyPreferredCategoryKeywords.some((kw) => categoryAndTitle.includes(kw))) score += 22;

  const priorityCount = weeklyPriorityTitleKeywords.filter((kw) => searchableText.includes(kw)).length;
  score += Math.min(priorityCount * 8, 32);

  if (durationMinutes !== null && durationMinutes >= 60 && durationMinutes <= 300) score += 22;
  else if (durationMinutes !== null && durationMinutes <= 420) score += 8;

  if (!candidateDateValue) score -= 25;
  if (activitySpanDays !== null && activitySpanDays <= 14) score += 14;
  else if (activitySpanDays !== null && activitySpanDays >= 30) score -= 16;

  if (upcomingSecondaryPenaltyPattern.test(searchableText)) score -= 10;
  if (upcomingInstitutionalPenaltyPattern.test(searchableText)) score -= 18;
  if (upcomingRepeatPenaltyPattern.test(searchableText)) score -= 18;
  if (upcomingOperationalPattern.test(searchableText)) score -= sourceLevel === 'relaxed_upcoming' ? 14 : 24;

  if (daysUntilActivity !== null && daysUntilActivity >= 0) {
    score += Math.max(0, sourceLevel === 'relaxed_upcoming' ? 20 - Math.min(daysUntilActivity, 20) : 18 - Math.min(daysUntilActivity, 18));
  }

  return {
    item,
    index,
    score,
    sourceLevel,
    activityDate: sortableActivityDate,
    availableEndDate,
    recruitmentEndDate: recruitmentEndValue,
    isRecruiting: isRecruitingItem(item),
    durationMinutes: durationMinutes ?? Infinity,
    hasTravelerFriendlyKeyword,
    activitySpanDays: activitySpanDays ?? Infinity,
  };
};

const getUpcomingActivityRejectReason = (item: ParsedVolunteerItem) => {
  const { searchableText } = getUpcomingSearchableText(item);
  const activityStartDate = getActivityStartDate(item);
  const activityEndDate = getLightweightActivityEndDate(item);
  const candidateDate = getUpcomingCandidateDate(item);
  const recruitmentEndDate = getRecruitmentEndDate(item);
  const today = getTodayApiDate();
  const todayValue = Number(today);
  const activityEndValue = toSortableDate(activityEndDate || activityStartDate);
  const candidateDateValue = toSortableDate(candidateDate);
  const recruitmentEndValue = toSortableDate(recruitmentEndDate);
  const activitySpanDays = getApiDateSpanDays(activityStartDate, activityEndDate || activityStartDate);
  const hasTravelerFriendlyKeyword = upcomingTravelerFriendlyPattern.test(searchableText);

  if (!isRecruitingItem(item)) return 'not_recruiting';
  if (isActivityEnded(item)) return 'activity_ended';
  if (!recruitmentEndDate || recruitmentEndValue < todayValue) return 'recruitment_ended';
  if (recruitmentEndValue === todayValue) return 'recruitment_deadline_today';
  if (!activityEndValue || activityEndValue < todayValue) return 'activity_end_before_today';
  if (candidateDate && candidateDateValue === 0) return 'invalid_activity_date';
  if (!candidateDateValue) return 'missing_activity_date';
  if (candidateDateValue < todayValue) return 'activity_date_before_today';
  if (!isYesFlag(item.adultPosblAt)) return 'not_adult_eligible';
  if (upcomingRemoteActivityPattern.test(searchableText)) return 'remote_keyword';
  if (upcomingCareFacilityPattern.test(searchableText)) return 'care_facility_keyword';
  if (upcomingOperationalPattern.test(searchableText)) return 'operational_keyword';
  if (activitySpanDays !== null && activitySpanDays >= 60 && !hasTravelerFriendlyKeyword) {
    return 'long_without_traveler_keyword';
  }

  return 'passed';
};

const filterUpcomingActivities = (items: ParsedVolunteerItem[], limit = UPCOMING_SEARCH_TARGET_COUNT) => {
  const candidates = items
    .map((item, index) => getUpcomingActivityScore(item, index))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort(compareUpcomingHomeCandidates);

  return candidates.slice(0, limit).map(({ item }) => item);
};

const getVolunteerItemKey = (item: ParsedVolunteerItem) =>
  item.progrmRegistNo || `${item.progrmSj}-${item.noticeEndde}-${item.progrmBgnde}`;

type UpcomingSortableCandidate = {
  activityDate: number;
  recruitmentEndDate: number;
  isRecruiting: boolean;
  durationMinutes: number;
  hasTravelerFriendlyKeyword: boolean;
  score: number;
  activitySpanDays: number;
  availableEndDate: number;
  index: number;
};

const compareUpcomingHomeCandidates = <T extends UpcomingSortableCandidate>(a: T, b: T) => {
  if (a.activityDate !== b.activityDate) return a.activityDate - b.activityDate;
  if (a.recruitmentEndDate !== b.recruitmentEndDate) return a.recruitmentEndDate - b.recruitmentEndDate;
  if (a.isRecruiting !== b.isRecruiting) return a.isRecruiting ? -1 : 1;
  if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
  if (a.hasTravelerFriendlyKeyword !== b.hasTravelerFriendlyKeyword) return a.hasTravelerFriendlyKeyword ? -1 : 1;
  if (b.score !== a.score) return b.score - a.score;
  if (a.activitySpanDays !== b.activitySpanDays) return a.activitySpanDays - b.activitySpanDays;
  if (a.availableEndDate !== b.availableEndDate) return a.availableEndDate - b.availableEndDate;
  return a.index - b.index;
};

const sortUpcomingHomeCandidates = <T extends UpcomingSortableCandidate>(candidates: T[]) =>
  candidates.sort(compareUpcomingHomeCandidates);

const appendUpcomingHomeCandidates = (
  selected: ParsedVolunteerItem[],
  selectedKeys: Set<string>,
  candidates: Array<{ item: ParsedVolunteerItem }>,
  limit: number,
) => {
  for (const candidate of candidates) {
    if (selected.length >= limit) break;

    const key = getVolunteerItemKey(candidate.item);
    if (selectedKeys.has(key)) continue;

    selected.push(candidate.item);
    selectedKeys.add(key);
  }
};

const selectUpcomingHomeItems = (items: ParsedVolunteerItem[], limit = UPCOMING_HOME_TARGET_COUNT) => {
  const selected: ParsedVolunteerItem[] = [];
  const selectedKeys = new Set<string>();
  const sourceLevelCounts: Record<UpcomingHomeFallbackLevel, number> = {
    strict_upcoming: 0,
    relaxed_upcoming: 0,
    upcoming_traveler: 0,
  };

  const strictCandidates = sortUpcomingHomeCandidates(
    items
      .map((item, index) => getUpcomingActivityScore(item, index))
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null),
  );
  appendUpcomingHomeCandidates(selected, selectedKeys, strictCandidates, limit);
  sourceLevelCounts.strict_upcoming = selected.length;

  if (selected.length < limit) {
    const relaxedCandidates = sortUpcomingHomeCandidates(
      items
        .map((item, index) => getUpcomingHomeFallbackScore(item, index, 'relaxed_upcoming'))
        .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null),
    );
    const beforeCount = selected.length;
    appendUpcomingHomeCandidates(selected, selectedKeys, relaxedCandidates, limit);
    sourceLevelCounts.relaxed_upcoming = selected.length - beforeCount;
  }

  if (selected.length < limit) {
    const upcomingCandidates = sortUpcomingHomeCandidates(
      items
        .map((item, index) => getUpcomingHomeFallbackScore(item, index, 'upcoming_traveler'))
        .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null),
    );
    const beforeCount = selected.length;
    appendUpcomingHomeCandidates(selected, selectedKeys, upcomingCandidates, limit);
    sourceLevelCounts.upcoming_traveler = selected.length - beforeCount;
  }

  return {
    items: selected,
    sourceLevelCounts,
  };
};

const getUpcomingRejectReasonCounts = (items: ParsedVolunteerItem[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const reason = getUpcomingActivityRejectReason(item);
    counts[reason] = (counts[reason] ?? 0) + 1;
    return counts;
  }, {});

const fetchUpcomingSupplementItems = async (params: {
  serviceKey: string;
  startDate: string;
  endDate: string;
}) => {
  const supplementalItems: ParsedVolunteerItem[] = [];

  for (const keyword of upcomingSupplementKeywords) {
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
        console.error('1365 upcoming supplement request failed:', {
          keyword,
          status: response.status,
          responseText: stripScriptTags(xmlText).slice(0, 500),
        });
        continue;
      }

      supplementalItems.push(...parseVolunteerItems(xmlText));
    } catch (error) {
      console.error('1365 upcoming supplement request errored:', {
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
  if (!isApiDateAfterToday(recruitmentEndDate)) return null;
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

const emptyCapacityEnrichmentStats = (): CapacityEnrichmentStats => ({
  attempted: 0,
  alreadyHadCapacity: 0,
  enriched: 0,
  detailCapacityFound: 0,
  missingAfterEnrichment: 0,
  skipped: 0,
});

const mergeCapacityEnrichmentStats = (statsList: CapacityEnrichmentStats[]) =>
  statsList.reduce((acc, stats) => ({
    attempted: acc.attempted + stats.attempted,
    alreadyHadCapacity: acc.alreadyHadCapacity + stats.alreadyHadCapacity,
    enriched: acc.enriched + stats.enriched,
    detailCapacityFound: acc.detailCapacityFound + stats.detailCapacityFound,
    missingAfterEnrichment: acc.missingAfterEnrichment + stats.missingAfterEnrichment,
    skipped: acc.skipped + stats.skipped,
  }), emptyCapacityEnrichmentStats());

const hasKnownCapacity = (value: string | number | null | undefined) =>
  Boolean(normalizeApiCapacity(value));

export const enrichVolunteerActivitiesWithCapacity = async (
  serviceKey: string,
  activities: VolunteerActivity[],
  limit = activities.length,
) => {
  const stats = emptyCapacityEnrichmentStats();
  const enrichedActivities = [...activities];

  for (let index = 0; index < enrichedActivities.length; index += 1) {
    if (index >= limit) {
      stats.skipped += 1;
      continue;
    }

    const activity = enrichedActivities[index];
    stats.attempted += 1;

    const hadCapacity = hasKnownCapacity(activity.capacity);
    if (hadCapacity) stats.alreadyHadCapacity += 1;

    const detailItem = await fetchVolunteerDetailItem(serviceKey, activity.progrmRegistNo);
    const detailCapacity = detailItem ? normalizeApiCapacity(pickRecruitCapacity(detailItem)) : null;

    if (detailCapacity) {
      stats.detailCapacityFound += 1;
      enrichedActivities[index] = {
        ...activity,
        capacity: detailCapacity,
      };

      if (!hadCapacity) stats.enriched += 1;
      continue;
    }

    if (!hadCapacity) stats.missingAfterEnrichment += 1;
  }

  return { items: enrichedActivities, stats };
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
  upcoming: VolunteerActivity[];
  festival: VolunteerActivity[];
};

const fetchHomeVolunteerSearchItems = async (params: {
  serviceKey: string;
  sort: 'lightweight' | 'upcoming' | 'festival';
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

const buildUpcomingHomeSection = async (serviceKey: string) => {
  const { items } = await fetchHomeVolunteerSearchItems({ serviceKey, sort: 'upcoming', numOfRows: 50 });
  let supplementalItems: ParsedVolunteerItem[] = [];
  let sourceItems = items;
  let upcomingSelection = selectUpcomingHomeItems(sourceItems);

  if (upcomingSelection.items.length < 4) {
    supplementalItems = await fetchUpcomingSupplementItems({
      serviceKey,
      startDate: '',
      endDate: '',
    });
    sourceItems = mergeVolunteerItems([...sourceItems, ...supplementalItems]);
    upcomingSelection = selectUpcomingHomeItems(sourceItems);
  }

  if (upcomingSelection.items.length < 4) {
    const upcomingSupplementalItems = await fetchUpcomingSupplementItems({
      serviceKey,
      startDate: getTodayApiDate(),
      endDate: addApiDateDays(getTodayApiDate(), 45),
    });
    supplementalItems = mergeVolunteerItems([...supplementalItems, ...upcomingSupplementalItems]);
    sourceItems = mergeVolunteerItems([...sourceItems, ...upcomingSupplementalItems]);
    upcomingSelection = selectUpcomingHomeItems(sourceItems);
  }

  const upcomingItems = upcomingSelection.items
    .map(mapHomeVolunteerActivity)
    .filter((activity) => activity.status !== '지난 활동');

  if (upcomingItems.length < 4) {
    console.warn('1365 upcoming home candidates below target:', {
      baseCandidateCount: items.length,
      supplementCandidateCount: supplementalItems.length,
      mergedCandidateCount: sourceItems.length,
      selectedBeforeStatusFilterCount: upcomingSelection.items.length,
      finalUpcomingCount: upcomingItems.length,
      sourceLevelCounts: upcomingSelection.sourceLevelCounts,
      rejectReasonCounts: getUpcomingRejectReasonCounts(sourceItems),
    });
  } else if (upcomingSelection.sourceLevelCounts.relaxed_upcoming > 0 || upcomingSelection.sourceLevelCounts.upcoming_traveler > 0) {
    console.info('1365 upcoming home candidates filled with fallback:', {
      finalUpcomingCount: upcomingItems.length,
      sourceLevelCounts: upcomingSelection.sourceLevelCounts,
    });
  }

  return upcomingItems;
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
    festivalItems.filter(hasFutureRecruitmentDeadline)
  );

  return finalFestivalItems.map((item) =>
    mapVolunteerActivity(item, { compactLocation: true, omitImageUrl: true })
  );
};

export const buildHomeVolunteerSections = async (serviceKey: string): Promise<HomeVolunteerSections> => {
  const [lightweight, upcoming, festival] = await Promise.all([
    buildLightweightHomeSection(serviceKey),
    buildUpcomingHomeSection(serviceKey),
    buildFestivalHomeSection(serviceKey),
  ]);

  return { lightweight, upcoming, festival };
};

export const enrichHomeVolunteerSectionsWithCapacity = async (
  serviceKey: string,
  sections: HomeVolunteerSections,
) => {
  const lightweight = await enrichVolunteerActivitiesWithCapacity(serviceKey, sections.lightweight);
  const upcoming = await enrichVolunteerActivitiesWithCapacity(serviceKey, sections.upcoming);
  const festival = await enrichVolunteerActivitiesWithCapacity(serviceKey, sections.festival);

  return {
    sections: {
      lightweight: lightweight.items,
      upcoming: upcoming.items,
      festival: festival.items,
    },
    stats: mergeCapacityEnrichmentStats([lightweight.stats, upcoming.stats, festival.stats]),
    sectionStats: {
      lightweight: lightweight.stats,
      upcoming: upcoming.stats,
      festival: festival.stats,
    },
  };
};

const getBlobReadWriteToken = () => process.env.BLOB_READ_WRITE_TOKEN?.trim();

type CachedRegionConfig =
  | typeof searchRegionCacheConfigs[number]
  | typeof popularRegionCacheConfigs[number];

const getSearchRegionConfig = (keyword: string) =>
  searchRegionCacheConfigs.find((config) => config.query === keyword.trim()) ?? null;

const getPopularRegionConfig = (keyword: string) =>
  popularRegionCacheConfigs.find((config) => config.query === keyword.trim()) ?? null;

const isSameKstDate = (isoDate: string) => {
  const generatedAt = new Date(isoDate);
  if (Number.isNaN(generatedAt.getTime())) return false;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const toKstDateKey = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    return `${year}${month}${day}`;
  };

  return toKstDateKey(generatedAt) === toKstDateKey(new Date());
};

const hasOnlyFutureRecruitmentDeadlines = (items: VolunteerActivity[]) =>
  items.every((item) => isApiDateAfterToday(item.recruitmentEndDate));

const normalizeRegionCachePayload = (
  value: unknown,
  configs: readonly CachedRegionConfig[],
): SearchRegionCachePayload | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<SearchRegionCachePayload>;
  if (
    candidate.cacheVersion !== SEARCH_REGION_CACHE_VERSION ||
    candidate.source !== SEARCH_REGION_CACHE_SOURCE ||
    typeof candidate.generatedAt !== 'string' ||
    !candidate.regions ||
    typeof candidate.regions !== 'object'
  ) {
    return null;
  }

  const normalizedRegions: SearchRegionCachePayload['regions'] = {};

  for (const config of configs) {
    const region = candidate.regions[config.query as CachedRegionName];
    if (!region || typeof region !== 'object' || !Array.isArray(region.items)) continue;

    normalizedRegions[config.query as CachedRegionName] = {
      query: config.query as CachedRegionName,
      count: Number.isFinite(region.count) ? region.count : region.items.length,
      items: region.items,
      capacityEnrichment: region.capacityEnrichment,
    };
  }

  return {
    cacheVersion: SEARCH_REGION_CACHE_VERSION,
    generatedAt: candidate.generatedAt,
    source: SEARCH_REGION_CACHE_SOURCE,
    capacityEnrichment: candidate.capacityEnrichment,
    regions: normalizedRegions,
  };
};

const readTextFromBlob = async (urlOrPathname: string, blobToken: string) => {
  const cachedBlob = await get(urlOrPathname, { access: 'private', token: blobToken, useCache: false });
  if (!cachedBlob || cachedBlob.statusCode !== 200 || !cachedBlob.stream) return null;

  return new Response(cachedBlob.stream).text();
};

const readRegionCache = async (cachePath: string, configs: readonly CachedRegionConfig[]) => {
  const blobToken = getBlobReadWriteToken();
  if (!blobToken) return null;

  const listed = await list({
    prefix: cachePath,
    limit: 1,
    token: blobToken,
  });
  const matchedBlob = listed.blobs.find((blob) => blob.pathname === cachePath) ?? listed.blobs[0];
  if (!matchedBlob) return null;

  const blobText =
    await readTextFromBlob(cachePath, blobToken) ??
    await readTextFromBlob(matchedBlob.url, blobToken);
  if (!blobText) return null;

  return normalizeRegionCachePayload(JSON.parse(blobText), configs);
};

const readSearchRegionCache = async () =>
  readRegionCache(SEARCH_REGION_CACHE_PATH, searchRegionCacheConfigs);

const readPopularRegionCache = async () =>
  readRegionCache(POPULAR_REGION_CACHE_PATH, popularRegionCacheConfigs);

const isDefaultCachedRegionSearch = (params: {
  keyword: string;
  pageNo: number;
  numOfRows: number;
  startDate: string;
  endDate: string;
  sort: string;
  sidoCd: string;
  gugunCd: string;
  fallbackKeyword: string;
}, config: CachedRegionConfig | null) => {
  if (!config) return null;
  if (params.sort || params.startDate || params.endDate) return null;
  if (params.numOfRows !== SEARCH_REGION_CACHE_PAGE_SIZE) return null;
  if (params.pageNo < 1 || params.pageNo > SEARCH_REGION_CACHE_MAX_PAGES) return null;
  if (params.sidoCd && params.sidoCd !== (config.sidoCd ?? '')) return null;
  if (params.gugunCd && params.gugunCd !== (config.gugunCd ?? '')) return null;
  if (
    params.fallbackKeyword &&
    params.fallbackKeyword !== config.query &&
    params.fallbackKeyword !== config.fallbackKeyword
  ) {
    return null;
  }

  return config;
};

const getSearchRegionCacheResponse = async (params: {
  keyword: string;
  pageNo: number;
  numOfRows: number;
  startDate: string;
  endDate: string;
  sort: string;
  sidoCd: string;
  gugunCd: string;
  fallbackKeyword: string;
}): Promise<
  | { cacheStatus: 'region_cache_hit'; items: VolunteerActivity[]; totalCount: number }
  | { cacheStatus: 'region_cache_miss' | 'region_cache_stale' | 'live' }
> => {
  const config = isDefaultCachedRegionSearch(params, getSearchRegionConfig(params.keyword));
  if (!config) return { cacheStatus: 'live' };

  try {
    const payload = await readSearchRegionCache();
    if (!payload) return { cacheStatus: 'region_cache_miss' };
    if (!isSameKstDate(payload.generatedAt)) return { cacheStatus: 'region_cache_stale' };

    const region = payload.regions[config.query];
    if (!region || !Array.isArray(region.items)) return { cacheStatus: 'region_cache_miss' };
    if (!hasOnlyFutureRecruitmentDeadlines(region.items)) return { cacheStatus: 'region_cache_stale' };

    const startIndex = (params.pageNo - 1) * params.numOfRows;
    const items = region.items.slice(startIndex, startIndex + params.numOfRows);

    return {
      cacheStatus: 'region_cache_hit',
      items,
      totalCount: region.count,
    };
  } catch (error) {
    console.error('volunteer search region cache read failed:', {
      keyword: params.keyword,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return { cacheStatus: 'region_cache_miss' };
  }
};

const getPopularRegionCacheResponse = async (params: {
  keyword: string;
  pageNo: number;
  numOfRows: number;
  startDate: string;
  endDate: string;
  sort: string;
  sidoCd: string;
  gugunCd: string;
  fallbackKeyword: string;
}): Promise<
  | { cacheStatus: 'popular_region_cache_hit'; items: VolunteerActivity[]; totalCount: number }
  | { cacheStatus: 'popular_region_cache_miss' | 'popular_region_cache_stale' | 'live' }
> => {
  const config = isDefaultCachedRegionSearch(params, getPopularRegionConfig(params.keyword));
  if (!config) return { cacheStatus: 'live' };

  try {
    const payload = await readPopularRegionCache();
    if (!payload) return { cacheStatus: 'popular_region_cache_miss' };
    if (!isSameKstDate(payload.generatedAt)) return { cacheStatus: 'popular_region_cache_stale' };

    const region = payload.regions[config.query as CachedRegionName];
    if (!region || !Array.isArray(region.items)) return { cacheStatus: 'popular_region_cache_miss' };
    if (!hasOnlyFutureRecruitmentDeadlines(region.items)) return { cacheStatus: 'popular_region_cache_stale' };

    const startIndex = (params.pageNo - 1) * params.numOfRows;
    const items = region.items.slice(startIndex, startIndex + params.numOfRows);

    return {
      cacheStatus: 'popular_region_cache_hit',
      items,
      totalCount: region.count,
    };
  } catch (error) {
    console.error('volunteer popular region cache read failed:', {
      keyword: params.keyword,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return { cacheStatus: 'popular_region_cache_miss' };
  }
};

const fetchDefaultVolunteerSearchPage = async (params: {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
  keyword: string;
  startDate?: string;
  endDate?: string;
  sidoCd?: string;
  gugunCd?: string;
  fallbackKeyword?: string;
  logContext: string;
}) => {
  const startDate = params.startDate ?? '';
  const endDate = params.endDate ?? '';
  const useRegionCodes = Boolean(params.sidoCd);
  const upstreamUrl = buildVolunteerSearchUrl({
    serviceKey: params.serviceKey,
    pageNo: params.pageNo,
    numOfRows: params.numOfRows,
    keyword: params.keyword,
    startDate,
    endDate,
    sidoCd: params.sidoCd,
    gugunCd: params.gugunCd,
  });

  const response = await fetch(upstreamUrl);
  const xmlText = await response.text();

  if (!response.ok) {
    console.error('1365 cached region upstream request failed:', {
      context: params.logContext,
      requestUrl: upstreamUrl.replace(params.serviceKey, '[REDACTED_SERVICE_KEY]'),
      status: response.status,
      responseText: xmlText.slice(0, 1000),
    });
    throw new Error(`1365 ${params.logContext} 검색 결과를 불러오지 못했어요.`);
  }

  const resultCode = getTagValue(xmlText, 'resultCode');
  const resultMsg = getTagValue(xmlText, 'resultMsg');
  let totalCount = Number.parseInt(getTagValue(xmlText, 'totalCount'), 10) || 0;
  let rawItems = parseVolunteerItems(xmlText);

  if (resultCode && resultCode !== '00') {
    if (!useRegionCodes) {
      throw new Error(resultMsg || `1365 ${params.logContext} 검색 결과를 불러오지 못했어요.`);
    }
    rawItems = [];
  }

  if (useRegionCodes && (rawItems.length === 0 || (!params.gugunCd && rawItems.length < params.numOfRows))) {
    const tryKeywordFallback = async (kw: string): Promise<boolean> => {
      if (!kw) return false;
      try {
        const kwUrl = buildVolunteerSearchUrl({
          serviceKey: params.serviceKey,
          pageNo: params.pageNo,
          numOfRows: params.numOfRows,
          keyword: kw,
          startDate,
          endDate,
          sidoCd: params.sidoCd,
          gugunCd: params.gugunCd,
        });
        const kwRes = await fetch(kwUrl);
        if (!kwRes.ok) return false;
        const kwXml = await kwRes.text();
        const kwCode = getTagValue(kwXml, 'resultCode');
        if (kwCode && kwCode !== '00') return false;
        const kwItems = parseVolunteerItems(kwXml);
        rawItems = mergeVolunteerItems([...rawItems, ...kwItems]);
        totalCount = Math.max(totalCount, Number.parseInt(getTagValue(kwXml, 'totalCount'), 10) || kwItems.length);
        return kwItems.length > 0;
      } catch {
        return false;
      }
    };

    const resolvedByKeyword = await tryKeywordFallback(params.keyword);
    if (!resolvedByKeyword && params.fallbackKeyword && params.fallbackKeyword !== params.keyword) {
      await tryKeywordFallback(params.fallbackKeyword);
    }
  }

  const items = rawItems
    .filter(hasFutureRecruitmentDeadline)
    .filter(isAdultEligibleItem)
    .sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a));

  return { totalCount, items };
};

const fetchSearchRegionCacheItems = async (
  serviceKey: string,
  config: CachedRegionConfig,
) => {
  let mergedItems: ParsedVolunteerItem[] = [];
  let totalCount = 0;

  for (let pageNo = 1; pageNo <= SEARCH_REGION_CACHE_MAX_PAGES; pageNo += 1) {
    const page = await fetchDefaultVolunteerSearchPage({
      serviceKey,
      pageNo,
      numOfRows: SEARCH_REGION_CACHE_PAGE_SIZE,
      keyword: config.query,
      sidoCd: config.sidoCd,
      gugunCd: config.gugunCd,
      fallbackKeyword: config.fallbackKeyword,
      logContext: `region-cache:${config.query}:page-${pageNo}`,
    });

    totalCount = Math.max(totalCount, page.totalCount);
    mergedItems = mergeVolunteerItems([...mergedItems, ...page.items]);

    if (pageNo * SEARCH_REGION_CACHE_PAGE_SIZE >= totalCount) break;
  }

  return mergedItems
    .filter(hasFutureRecruitmentDeadline)
    .filter(isAdultEligibleItem)
    .sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a))
    .slice(0, SEARCH_REGION_CACHE_PAGE_SIZE * SEARCH_REGION_CACHE_MAX_PAGES)
    .map(mapDefaultVolunteerActivity);
};

export const getSearchRegionCacheTargetRegions = () =>
  searchRegionCacheConfigs.map((config) => config.query);

export const getPopularRegionCacheTargetRegions = () =>
  popularRegionCacheConfigs.map((config) => config.query);

export const buildSearchRegionCache = async (serviceKey: string): Promise<SearchRegionCachePayload> => {
  const regions: SearchRegionCachePayload['regions'] = {};
  const enrichmentStats: CapacityEnrichmentStats[] = [];

  for (const config of searchRegionCacheConfigs) {
    try {
      const items = await fetchSearchRegionCacheItems(serviceKey, config);
      const enriched = await enrichVolunteerActivitiesWithCapacity(serviceKey, items, 20);
      enrichmentStats.push(enriched.stats);
      regions[config.query] = {
        query: config.query,
        count: enriched.items.length,
        items: enriched.items,
        capacityEnrichment: enriched.stats,
      };
    } catch (error) {
      console.error('volunteer search region cache build failed:', {
        region: config.query,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    cacheVersion: SEARCH_REGION_CACHE_VERSION,
    generatedAt: new Date().toISOString(),
    source: SEARCH_REGION_CACHE_SOURCE,
    capacityEnrichment: mergeCapacityEnrichmentStats(enrichmentStats),
    regions,
  };
};

export const buildPopularRegionCache = async (serviceKey: string): Promise<SearchRegionCachePayload> => {
  const regions: SearchRegionCachePayload['regions'] = {};
  const enrichmentStats: CapacityEnrichmentStats[] = [];

  for (const config of popularRegionCacheConfigs) {
    try {
      const items = await fetchSearchRegionCacheItems(serviceKey, config);
      const enriched = await enrichVolunteerActivitiesWithCapacity(serviceKey, items, 20);
      enrichmentStats.push(enriched.stats);
      regions[config.query] = {
        query: config.query,
        count: enriched.items.length,
        items: enriched.items,
        capacityEnrichment: enriched.stats,
      };
    } catch (error) {
      console.error('volunteer popular region cache build failed:', {
        region: config.query,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    cacheVersion: SEARCH_REGION_CACHE_VERSION,
    generatedAt: new Date().toISOString(),
    source: SEARCH_REGION_CACHE_SOURCE,
    capacityEnrichment: mergeCapacityEnrichmentStats(enrichmentStats),
    regions,
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
  const sort = getSingleQueryValue(req.query.sort).trim();

  // 여행지명 기반 검색: sort 없는 일반 검색에서만 지역코드 사용
  const sidoCd = !sort ? getSingleQueryValue(req.query.sidoCd).trim() : '';
  const gugunCd = !sort ? getSingleQueryValue(req.query.gugunCd).trim() : '';
  const fallbackKeyword = !sort ? getSingleQueryValue(req.query.fallbackKeyword).trim() : '';
  const useRegionCodes = Boolean(sidoCd);

  const cacheRequestParams = {
    keyword,
    pageNo,
    numOfRows,
    startDate,
    endDate,
    sort,
    sidoCd,
    gugunCd,
    fallbackKeyword,
  };
  const popularRegionCacheResponse = await getPopularRegionCacheResponse(cacheRequestParams);
  const regionCacheResponse = popularRegionCacheResponse.cacheStatus === 'live'
    ? await getSearchRegionCacheResponse(cacheRequestParams)
    : popularRegionCacheResponse;

  if (
    regionCacheResponse.cacheStatus === 'region_cache_hit' ||
    regionCacheResponse.cacheStatus === 'popular_region_cache_hit'
  ) {
    sendSuccess(res, {
      items: regionCacheResponse.items,
      totalCount: regionCacheResponse.totalCount,
      page: pageNo,
      size: numOfRows,
      cacheStatus: regionCacheResponse.cacheStatus,
    });
    return;
  }

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

    if (sort === 'upcoming' || sort === 'monthly') {
      let upcomingSourceItems = rawItems;
      let supplementalItems: ParsedVolunteerItem[] = [];
      let upcomingFilteredItems = filterUpcomingActivities(upcomingSourceItems);

      if (upcomingFilteredItems.length < UPCOMING_SEARCH_TARGET_COUNT) {
        supplementalItems = await fetchUpcomingSupplementItems({
          serviceKey,
          startDate,
          endDate,
        });
        upcomingSourceItems = mergeVolunteerItems([...rawItems, ...supplementalItems]);
        upcomingFilteredItems = filterUpcomingActivities(upcomingSourceItems);
      }

      const upcomingItems = upcomingFilteredItems
        .map(mapHomeVolunteerActivity)
        .filter((activity) => activity.status !== '지난 활동');

      if (upcomingItems.length === 0) {
        console.warn('1365 upcoming search candidates filtered to zero:', {
          baseCandidateCount: rawItems.length,
          supplementCandidateCount: supplementalItems.length,
          mergedCandidateCount: upcomingSourceItems.length,
          filterPassedCount: upcomingFilteredItems.length,
          finalUpcomingCount: upcomingItems.length,
          rejectReasonCounts: getUpcomingRejectReasonCounts(upcomingSourceItems),
        });
      }

      sendSuccess(res, {
        items: upcomingItems,
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
        festivalItems.filter(hasFutureRecruitmentDeadline)
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
        .filter(hasFutureRecruitmentDeadline)
        .filter(isAdultEligibleItem)
        .sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a));
      const items = processedItems.map(mapDefaultVolunteerActivity);

      sendSuccess(res, {
        items,
        totalCount,
        page: pageNo,
        size: numOfRows,
        cacheStatus: regionCacheResponse.cacheStatus,
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
