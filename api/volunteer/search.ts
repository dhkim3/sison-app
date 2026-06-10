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

const toSortableDate = (value: string) => {
  const digits = toApiDate(value);
  if (digits.length !== 8) return 0;

  return Number(digits);
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
    reqstNmpr: getTagValue(itemXml, 'reqstNmpr'),
    progrmRcritNmpr: getTagValue(itemXml, 'progrmRcritNmpr'),
    wanted: getTagValue(itemXml, 'wanted'),
    capacity: getTagValue(itemXml, 'capacity'),
    applcntNmpr: getTagValue(itemXml, 'applcntNmpr'),
    appTotal: getTagValue(itemXml, 'appTotal'),
    partcptnNmpr: getTagValue(itemXml, 'partcptnNmpr'),
    currentParticipants: getTagValue(itemXml, 'currentParticipants'),
    requestCount: getTagValue(itemXml, 'requestCount'),
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

const formatParticipantCount = (value: string) => {
  const trimmedValue = value.trim();
  if (trimmedValue === '') return null;
  if (/[명人]$/.test(trimmedValue)) return trimmedValue;

  const normalizedNumber = Number(trimmedValue.replace(/,/g, ''));
  if (Number.isFinite(normalizedNumber)) return `${normalizedNumber.toLocaleString('ko-KR')}명`;

  return trimmedValue;
};

const getCurrentParticipantValue = (item: ReturnType<typeof parseVolunteerItems>[number]) =>
  firstPresentValue(
    item.applcntNmpr,
    item.partcptnNmpr,
    item.reqstNmpr,
    item.requestCount,
    item.appTotal,
    item.currentParticipants,
  );

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

const isOpenFutureActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const recruitmentEndDate = firstPresentValue(
    item.noticeEndde,
    item.progrmEndde,
    item.srvcEndDate,
  );
  const activityStartDate = firstPresentValue(
    item.progrmBgnde,
    item.actBeginDate,
    item.srvcStartDate,
  );

  return (
    isApiDateTodayOrLater(recruitmentEndDate) &&
    isApiDateTodayOrLater(activityStartDate) &&
    isRecruitingItem(item)
  );
};

const isFutureRecruitingActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const recruitmentEndDate = firstPresentValue(
    item.noticeEndde,
    item.progrmEndde,
    item.srvcEndDate,
  );
  const activityStartDate = firstPresentValue(
    item.progrmBgnde,
    item.actBeginDate,
    item.srvcStartDate,
  );

  return (
    isApiDateTodayOrLater(recruitmentEndDate) &&
    isApiDateTodayOrLater(activityStartDate) &&
    isRecruitingItem(item)
  );
};

const isCurrentlyRecruitingActivity = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const recruitmentStartDate = firstPresentValue(
    item.noticeBgnde,
    item.srvcStartDate,
  );
  const recruitmentEndDate = firstPresentValue(
    item.noticeEndde,
    item.srvcEndDate,
  );
  const activityEndDate = firstPresentValue(
    item.progrmEndde,
    item.actEndDate,
    item.srvcEndDate,
  );

  return (
    isApiDateTodayOrEarlier(recruitmentStartDate) &&
    isApiDateTodayOrLater(recruitmentEndDate) &&
    isApiDateTodayOrLater(activityEndDate) &&
    isRecruitingItem(item)
  );
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
  items.filter(isCurrentlyRecruitingActivity);

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

const lightweightFriendlyCategoryKeywords = [
  '환경',
  '생태',
  '문화',
  '체육',
  '예술',
  '관광',
  '생활',
  '지역행사',
  '지역 행사',
];

const lightweightFriendlyTitleKeywords = [
  '플로깅',
  '환경정화',
  '산책로',
  '축제',
  '안내',
  '정리',
  '체험부스',
];

const lightweightPenaltyPattern = /정기|상시|멘토링|학습지도|교육|치매|요양|어르신|센터|상담|사무|장애/;

const getLightweightActivityScore = (item: ReturnType<typeof parseVolunteerItems>[number]) => {
  const categoryAndTitle = `${item.srvcClCode} ${item.progrmSj}`;
  const durationMinutes = getActivityDurationMinutes(item);
  let score = 0;

  if (lightweightFriendlyCategoryKeywords.some((kw) => categoryAndTitle.includes(kw))) score += 40;
  if (lightweightFriendlyTitleKeywords.some((kw) => item.progrmSj.includes(kw))) score += 40;
  if (durationMinutes !== null && durationMinutes >= 120 && durationMinutes <= 240) score += 30;
  else if (durationMinutes !== null && durationMinutes > 0 && durationMinutes < 120) score += 10;
  if (lightweightPenaltyPattern.test(item.progrmSj)) score -= 100;

  return score;
};

const filterLightweightActivities = (items: Array<ReturnType<typeof parseVolunteerItems>[number]>) => {
  return items
    .filter(isCurrentlyRecruitingActivity)
    .filter(isAdultEligibleItem)
    .map((item, index) => {
      const activityStartDate = firstPresentValue(item.progrmBgnde, item.actBeginDate, item.srvcStartDate);
      const score = getLightweightActivityScore(item);
      return {
        item,
        index,
        score,
        sortableDate: toSortableDate(activityStartDate),
        durationMinutes: getActivityDurationMinutes(item),
      };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => {
      if (a.sortableDate && b.sortableDate && a.sortableDate !== b.sortableDate) {
        return a.sortableDate - b.sortableDate;
      }
      const aDur = a.durationMinutes ?? Infinity;
      const bDur = b.durationMinutes ?? Infinity;
      if (aDur !== bDur) return aDur - bDur;
      return b.score - a.score;
    })
    .map(({ item }) => item);
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

const filterHiddenActivitiesWithConfirmedZeroParticipants = (
  items: Array<ReturnType<typeof parseVolunteerItems>[number]>,
) =>
  items
    .filter((item) => parseParticipantNumber(getCurrentParticipantValue(item)) === 0)
    .sort((a, b) => getHiddenActivityCandidateScore(b) - getHiddenActivityCandidateScore(a));

const mergeVolunteerDetailItem = (
  searchItem: ReturnType<typeof parseVolunteerItems>[number],
  detailItem: ReturnType<typeof parseVolunteerItems>[number] | null,
) => {
  if (!detailItem) return searchItem;

  return {
    ...searchItem,
    rcritNmpr: searchItem.rcritNmpr || detailItem.rcritNmpr,
    reqstNmpr: searchItem.reqstNmpr || detailItem.reqstNmpr,
    progrmRcritNmpr: searchItem.progrmRcritNmpr || detailItem.progrmRcritNmpr,
    wanted: searchItem.wanted || detailItem.wanted,
    capacity: searchItem.capacity || detailItem.capacity,
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

    const detailItem = parseVolunteerItems(xmlText)[0] ?? null;
    if (detailItem) {
      console.log('1365 volunteer detail count candidates:', {
        progrmRegistNo: detailItem.progrmRegistNo,
        capacityCandidates: {
          rcritNmpr: detailItem.rcritNmpr,
          reqstNmpr: detailItem.reqstNmpr,
          progrmRcritNmpr: detailItem.progrmRcritNmpr,
          wanted: detailItem.wanted,
          capacity: detailItem.capacity,
        },
        currentParticipantCandidates: {
          applcntNmpr: detailItem.applcntNmpr,
          partcptnNmpr: detailItem.partcptnNmpr,
          reqstNmpr: detailItem.reqstNmpr,
          requestCount: detailItem.requestCount,
          appTotal: detailItem.appTotal,
          currentParticipants: detailItem.currentParticipants,
        },
        volunteerTargetCandidates: {
          target: detailItem.target,
          srvcTarget: detailItem.srvcTarget,
          volunteerTarget: detailItem.volunteerTarget,
          trgetNm: detailItem.trgetNm,
          mnnstNm: detailItem.mnnstNm,
          adultPosblAt: detailItem.adultPosblAt,
          yngbgsPosblAt: detailItem.yngbgsPosblAt,
          familyPosblAt: detailItem.familyPosblAt,
          grpPosblAt: detailItem.grpPosblAt,
        },
      });
    }

    return detailItem;
  } catch (error) {
    console.error('1365 detail request errored:', {
      progrmRegistNo,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const mapVolunteerActivity = (item: ReturnType<typeof parseVolunteerItems>[number]): VolunteerActivity => {
  const beginTime = formatTime(item.actBeginTm);
  const endTime = formatTime(item.actEndTm);
  const rawEndDate = toApiDate(item.progrmEndde);
  const status: VolunteerStatus = rawEndDate && getTodayApiDate() > rawEndDate ? '지난 활동' : '모집중';
  const detailUrl = normalizeVolunteerUrl(item.url, item.progrmRegistNo);
  const recentSortInfo = getRecentSortInfo(item);
  const capacity = firstPresentValue(
    item.rcritNmpr,
    item.reqstNmpr,
    item.progrmRcritNmpr,
    item.wanted,
    item.capacity,
  );
  const currentParticipants = getCurrentParticipantValue(item);

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
    capacity: formatParticipantCount(capacity),
    currentParticipants: formatParticipantCount(currentParticipants),
    volunteerTarget: formatVolunteerTarget(item),
    volunteerType: formatVolunteerType(item),
    status,
    imageUrl: getImageUrl(item.srvcClCode),
    applyUrl: detailUrl || undefined,
    sourceUrl: detailUrl || undefined,
    recentSortBasis: recentSortInfo.basis,
    recentSortDate: formatDate(recentSortInfo.rawDate),
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
  const sort = getSingleQueryValue(req.query.sort).trim();

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
    const rawItems = parseVolunteerItems(xmlText);

    if (resultCode && resultCode !== '00') {
      console.error('1365 upstream returned error result:', {
        requestUrl: upstreamUrl.replace(serviceKey, '[REDACTED_SERVICE_KEY]'),
        status: response.status,
        responseText: stripScriptTags(xmlText).slice(0, 1000),
      });
      sendFailure(res, 502, resultMsg || '1365 검색 결과를 불러오지 못했어요.');
      return;
    }

    if (sort === 'recent' || sort === 'recruiting' || sort === 'hidden' || sort === 'lightweight') {
      console.log('1365 home volunteer filter candidates:', rawItems.slice(0, 10).map((item) => ({
        progrmRegistNo: item.progrmRegistNo,
        title: item.progrmSj,
        recruitmentStartCandidates: {
          noticeBgnde: item.noticeBgnde,
          srvcStartDate: item.srvcStartDate,
        },
        recruitmentEndCandidates: {
          noticeEndde: item.noticeEndde,
          srvcEndDate: item.srvcEndDate,
        },
        activityStartCandidates: {
          progrmBgnde: item.progrmBgnde,
          actBeginDate: item.actBeginDate,
          srvcStartDate: item.srvcStartDate,
        },
        activityEndCandidates: {
          progrmEndde: item.progrmEndde,
          actEndDate: item.actEndDate,
          srvcEndDate: item.srvcEndDate,
        },
        statusCandidates: {
          status: item.status,
          progrmSttusSe: item.progrmSttusSe,
          rcritAt: item.rcritAt,
        },
        currentParticipantCandidates: {
          applcntNmpr: item.applcntNmpr,
          partcptnNmpr: item.partcptnNmpr,
          reqstNmpr: item.reqstNmpr,
          requestCount: item.requestCount,
          appTotal: item.appTotal,
          currentParticipants: item.currentParticipants,
        },
        hiddenCandidateScore: getHiddenActivityCandidateScore(item),
      })));
    }

    if (sort === 'lightweight') {
      const lightweightItems = filterLightweightActivities(rawItems)
        .slice(0, 3)
        .map(mapVolunteerActivity);

      sendSuccess(res, {
        items: lightweightItems,
        totalCount,
        page: pageNo,
        size: numOfRows,
      });
      return;
    }

    if (sort === 'hidden') {
      const hiddenCandidates = getHiddenActivityCandidates(rawItems, 20);
      const detailItems = await Promise.all(
        hiddenCandidates.map((item) => fetchVolunteerDetailItem(serviceKey, item.progrmRegistNo))
      );
      const hiddenItems = filterHiddenActivitiesWithConfirmedZeroParticipants(
        hiddenCandidates.map((item, index) => mergeVolunteerDetailItem(item, detailItems[index]))
          .filter(isAdultEligibleItem)
      )
        .slice(0, 3)
        .map(mapVolunteerActivity);

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
    console.log('1365 volunteer count candidates:', parsedItems.slice(0, 5).map((item) => ({
      progrmRegistNo: item.progrmRegistNo,
      title: item.progrmSj,
      capacityCandidates: {
        rcritNmpr: item.rcritNmpr,
        reqstNmpr: item.reqstNmpr,
        progrmRcritNmpr: item.progrmRcritNmpr,
        wanted: item.wanted,
        capacity: item.capacity,
      },
      currentParticipantCandidates: {
        applcntNmpr: item.applcntNmpr,
        partcptnNmpr: item.partcptnNmpr,
        reqstNmpr: item.reqstNmpr,
        requestCount: item.requestCount,
        appTotal: item.appTotal,
        currentParticipants: item.currentParticipants,
      },
    })));

    const detailItems = await Promise.all(
      parsedItems.map((item) => fetchVolunteerDetailItem(serviceKey, item.progrmRegistNo))
    );
    const mergedItems = parsedItems
      .map((item, index) => mergeVolunteerDetailItem(item, detailItems[index]))
      .filter(isAdultEligibleItem);

    const processedItems = sort === 'recruiting'
      ? mergedItems
          .filter((item) => !isTravelHardExcluded(item))
          .sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a))
      : mergedItems.sort((a, b) => getTravelFriendlyScore(b) - getTravelFriendlyScore(a));

    const items = processedItems.map(mapVolunteerActivity);

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
