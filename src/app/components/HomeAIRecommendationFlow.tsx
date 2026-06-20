import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { CompactActivityCard } from './CompactActivityCard';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import { filterLocationSuggestions, locationSuggestions } from '../locationSuggestions';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';

interface HomeAIRecommendationFlowProps {
  isOpen: boolean;
  activities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onClose: () => void;
  onOpenActivity: (activity: ActivitySaveRecord) => void;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

type ParsedActivityPreference = {
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

type ParsePreferenceApiResponse = {
  ok: boolean;
  parsed?: ParsedActivityPreference;
  error?: string;
};

type VolunteerApiActivity = {
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
  capacity: string | number | null;
  currentParticipants: string | number | null;
  volunteerTarget?: string | null;
  volunteerType?: string | null;
  status: '모집중' | '지난 활동';
  imageUrl: string;
  applyUrl?: string;
  sourceUrl?: string;
  progrmRegistNo: string;
};

type VolunteerApiResponse = {
  ok: boolean;
  items: VolunteerApiActivity[];
  error?: string;
};

type ActivityRecommendation = {
  activityId: string;
  reason: string;
  fitTags: string[];
};

type RecommendActivitiesApiResponse = {
  ok: boolean;
  recommendations?: ActivityRecommendation[];
  error?: string;
};

type AIRecommendedActivity = {
  activity: ActivitySaveRecord;
  reason?: string;
  fitTags?: string[];
};

type ScoredVolunteerCandidate = {
  source: VolunteerApiActivity;
  activity: ActivitySaveRecord;
  baseScore: number;
  matchReasons: string[];
  diversityKey: string;
};

const timeSuggestions = ['1~2시간', '3~4시간', '4시간 이상'];
const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
const activityMoodSuggestions = [
  '조용히 걸으며 할 수 있는',
  '바다·공원 근처에서 할 수 있는',
  '혼자 참여해도 부담 없는',
  '지역 행사나 축제를 도울 수 있는',
];
const loadingMessages = [
  '조건에 맞는 활동을 살펴보고 있어요',
  '가까운 활동을 찾고 있어요',
  '추천 결과를 정리하고 있어요',
];
const defaultActivityPreferenceText = '여행 중 부담 없이 참여할 수 있는 조용하고 가벼운 활동';
const maxPreferenceTextLength = 200;
const maxRecommendationCacheEntries = 20;

const recommendationResultCache = new Map<string, {
  recommendations: AIRecommendedActivity[];
  notice: string;
}>();

const aiInputClassName =
  'mb-4 w-full rounded-2xl border border-[#c9d5ff] bg-white/86 px-4 py-4 text-[16px] text-[#28324a] outline-none shadow-[0_8px_22px_rgba(96,124,210,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] transition-all placeholder:text-[#9aa4bd] focus:border-[#9c8cff] focus:bg-white focus:shadow-[0_0_0_4px_rgba(118,107,255,0.10),0_10px_26px_rgba(96,124,210,0.10)]';

const aiChipClassName =
  'rounded-full border border-[#d9ddff] bg-[#f6f8ff]/88 px-3.5 py-2 text-[12.5px] font-medium text-[#52607d] shadow-[0_8px_18px_rgba(94,110,180,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all active:scale-[0.98] active:border-[#aaa2ff] active:bg-[#f0efff]';

const aiPrimaryButtonClassName =
  'w-full rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#6fb4ff,#7b7cff_52%,#b763ec)] py-4 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(112,126,255,0.24)] transition-all active:scale-[0.99] disabled:border-transparent disabled:bg-[#e5e8f3] disabled:text-[#a8afc2] disabled:shadow-none';

const aiFlowOpenTransitionDuration = 420;
const aiFlowCloseTransitionDuration = 340;
const aiFlowOpenTransitionEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
const aiFlowCloseTransitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';

const getMonthDay = (value?: string) => {
  const match = value?.match(/^\d{4}[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return '';

  return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;
};

const formatDateLabel = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;

const formatDateRangeLabel = (startDate: Date, endDate: Date) => {
  if (startDate.toDateString() === endDate.toDateString()) return formatDateLabel(startDate);

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
};

const formatApiDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const normalizeCapacityText = (value: string | number | null | undefined) =>
  value == null ? '' : String(value);

const toSortableDateNumber = (value?: string) => {
  const digits = value?.replace(/\D/g, '').slice(0, 8) ?? '';
  return digits.length === 8 ? Number(digits) : 0;
};

const getTodaySortableDate = () => {
  const now = new Date();
  return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
};

const normalizeText = (value?: string | null) => String(value ?? '').trim().toLowerCase();

const createDefaultParsedPreference = (preferenceText = defaultActivityPreferenceText): ParsedActivityPreference => ({
  intentSummary: `${preferenceText}을 선호합니다.`,
  keywords: ['가벼운 활동', '환경정화', '산책', '공원'],
  categories: ['여행친화 활동', '산책형 활동'],
  preferredConditions: {
    intensity: 'low',
    indoorOutdoor: 'both',
    soloFriendly: null,
    crowdLevel: 'unknown',
  },
  excludeKeywords: ['교육', '멘토링', '상담', '요양', '정기', '장기'],
});

const getRecommendationCacheKey = (value: {
  location: string;
  dateRange: string;
  duration: string;
  preferenceText: string;
}) => JSON.stringify({
  location: value.location.trim(),
  dateRange: value.dateRange.trim(),
  duration: value.duration.trim(),
  preferenceText: value.preferenceText.trim(),
});

const rememberRecommendationResult = (
  cacheKey: string,
  value: {
    recommendations: AIRecommendedActivity[];
    notice: string;
  },
) => {
  if (recommendationResultCache.has(cacheKey)) {
    recommendationResultCache.delete(cacheKey);
  }

  recommendationResultCache.set(cacheKey, value);

  while (recommendationResultCache.size > maxRecommendationCacheEntries) {
    const oldestKey = recommendationResultCache.keys().next().value;
    if (!oldestKey) break;
    recommendationResultCache.delete(oldestKey);
  }
};

const getDateFromActivity = (value?: string) => {
  const match = value?.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const getDurationHours = (value?: string) => {
  if (!value) return 2;
  if (value.includes('반나절')) return 4;
  if (value.includes('4시간 이상')) return 4;

  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 2;
};

const getActivityHours = (activity: ActivitySaveRecord) => {
  const durationMatch = activity.duration?.match(/(\d+)/);
  if (durationMatch) return Number(durationMatch[1]);

  const timeMatch = activity.time.match(/^(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}$/);
  if (!timeMatch) return 2;

  return Math.max(1, Number(timeMatch[2]) - Number(timeMatch[1]));
};

const isWeekendActivity = (activity: ActivitySaveRecord) => {
  if (!activity.date) return false;

  const match = activity.date.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return false;

  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay();
  return day === 0 || day === 6;
};

const hasAnyKeyword = (sourceText: string, keywords: RegExp[]) =>
  keywords.some((keyword) => keyword.test(sourceText));

const getNumberValue = (value?: string) => {
  const match = value?.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const isSingleDayActivity = (activity: ActivitySaveRecord) => {
  if (activity.activityStartDate && activity.activityEndDate) {
    return activity.activityStartDate === activity.activityEndDate;
  }

  if (activity.activityDate || activity.date) return true;

  return false;
};

const buildActivityConditionText = (activity: ActivitySaveRecord) =>
  [
    activity.title,
    activity.location,
    activity.description,
    activity.recommendation,
    activity.category,
    activity.volunteerField,
    activity.volunteerTarget,
    activity.volunteerType,
    activity.volunteerPlace,
    activity.recruitingOrganization,
    activity.registrationOrganization,
    activity.materials,
    activity.difficulty,
    activity.indoorOutdoor,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const mapVolunteerApiActivityToSaveRecord = (activity: VolunteerApiActivity): ActivitySaveRecord => ({
  id: activity.id || activity.progrmRegistNo,
  imageUrl: activity.imageUrl,
  title: activity.title || '제목 확인 필요',
  location: activity.location || activity.region || '장소 확인 필요',
  recruitmentStartDate: activity.recruitmentStartDate,
  recruitmentEndDate: activity.recruitmentEndDate,
  date: activity.activityStartDate,
  activityDate: activity.activityStartDate,
  activityStartDate: activity.activityStartDate,
  activityEndDate: activity.activityEndDate,
  time: activity.time || '시간 확인 필요',
  status: activity.status,
  isRecruiting: activity.status !== '지난 활동',
  description: activity.organization
    ? `${activity.organization}에서 모집하는 1365 봉사활동입니다.`
    : '1365에서 제공한 봉사활동입니다.',
  materials: '1365 상세 페이지에서 확인해주세요.',
  capacity: normalizeCapacityText(activity.capacity),
  currentParticipants: normalizeCapacityText(activity.currentParticipants),
  volunteerTarget: activity.volunteerTarget || undefined,
  volunteerType: activity.volunteerType || undefined,
  recommendation: 'AI가 사용자의 조건과 실제 1365 후보를 비교해 고른 활동입니다.',
  category: activity.category,
  volunteerPeriod:
    activity.activityStartDate && activity.activityEndDate
      ? `${activity.activityStartDate} - ${activity.activityEndDate}`
      : activity.activityStartDate,
  volunteerTime: activity.time || '시간 확인 필요',
  volunteerField: activity.category || '봉사분야 확인 필요',
  recruitingOrganization: activity.organization || '모집기관 확인 필요',
  volunteerPlace: activity.location || activity.region || '장소 확인 필요',
  applyUrl: activity.applyUrl || activity.sourceUrl,
  sourceUrl: activity.sourceUrl,
  progrmRegistNo: activity.progrmRegistNo,
});

const buildVolunteerApiConditionText = (activity: VolunteerApiActivity) =>
  [
    activity.title,
    activity.location,
    activity.region,
    activity.category,
    activity.organization,
    activity.volunteerTarget,
    activity.volunteerType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getVolunteerApiActivityHours = (activity: VolunteerApiActivity) => {
  const timeMatch = activity.time.match(/^(\d{1,2}):\d{2}\s*[-~]\s*(\d{1,2}):\d{2}$/);
  if (!timeMatch) return null;

  const startHour = Number(timeMatch[1]);
  const endHour = Number(timeMatch[2]);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) return null;

  return Math.max(1, endHour - startHour);
};

const getActivityTrait = (activity: VolunteerApiActivity) => {
  const sourceText = buildVolunteerApiConditionText(activity);
  if (/플로깅|환경\s*정화|환경정화|정화|공원|해변|산책|숲길|둘레길|하천|해안/.test(sourceText)) return 'environment';
  if (/축제|행사|문화제|공연|체험|부스|안내/.test(sourceText)) return 'event';
  if (/문화|관광|마을|거리/.test(sourceText)) return 'local';

  return 'general';
};

const getCandidateDiversityKey = (activity: VolunteerApiActivity) =>
  [
    normalizeText(activity.organization),
    normalizeText(activity.title),
    activity.activityStartDate,
  ].join('|');

const scoreVolunteerCandidate = (
  activity: VolunteerApiActivity,
  preference: ParsedActivityPreference,
  options: {
    region: string;
    timeLabel: string;
    mood: string;
    selectedStartDate: Date | null;
    selectedEndDate: Date | null;
  },
): ScoredVolunteerCandidate | null => {
  const today = getTodaySortableDate();
  const activityStart = toSortableDateNumber(activity.activityStartDate);
  const activityEnd = toSortableDateNumber(activity.activityEndDate || activity.activityStartDate);
  const recruitmentEnd = toSortableDateNumber(activity.recruitmentEndDate);

  if (activity.status === '지난 활동') return null;
  if (activityEnd > 0 && activityEnd < today) return null;

  const sourceText = buildVolunteerApiConditionText(activity);
  const matchReasons: string[] = [];
  let baseScore = 0;

  const normalizedRegion = normalizeText(options.region);
  if (normalizedRegion && sourceText.includes(normalizedRegion)) {
    baseScore += 28;
    matchReasons.push('지역 일치');
  }

  const rangeStart = options.selectedStartDate ? toSortableDateNumber(formatApiDate(options.selectedStartDate)) : 0;
  const rangeEnd = options.selectedEndDate ? toSortableDateNumber(formatApiDate(options.selectedEndDate)) : 0;
  if (rangeStart && rangeEnd && activityStart && activityEnd && activityStart <= rangeEnd && activityEnd >= rangeStart) {
    baseScore += 24;
    matchReasons.push('선택 일정 안에 있음');
  }

  const desiredHours = getDurationHours(options.timeLabel);
  const activityHours = getVolunteerApiActivityHours(activity);
  if (activityHours !== null) {
    if (options.timeLabel.includes('4시간 이상') ? activityHours >= 4 : activityHours <= desiredHours) {
      baseScore += 14;
      matchReasons.push('선택한 시간 조건과 가까움');
    } else if (Math.abs(activityHours - desiredHours) <= 1) {
      baseScore += 7;
    }
  }

  const preferenceWords = [
    ...preference.keywords,
    ...preference.categories,
    preference.intentSummary,
    options.mood,
  ]
    .map(normalizeText)
    .filter(Boolean);
  const preferenceMatchCount = preferenceWords.filter((word) => sourceText.includes(word)).length;
  if (preferenceMatchCount > 0) {
    baseScore += Math.min(preferenceMatchCount * 8, 24);
    matchReasons.push('선호 문구와 관련 있음');
  }

  if (/환경\s*정화|환경정화|플로깅|공원|산책|해변|해안|숲길|둘레길/.test(sourceText)) {
    baseScore += 16;
    matchReasons.push('여행친화적인 야외 활동');
  }

  if (/지역\s*행사|지역행사|축제|행사|문화제|체험|안내/.test(sourceText)) {
    baseScore += 9;
    matchReasons.push('지역 분위기를 느끼기 좋음');
  }

  if (recruitmentEnd >= today) {
    baseScore += 8;
    matchReasons.push('모집 중');
  }

  if (/교육|멘토링|상담|요양|치매|병원|정기|장기|상시|학습지도|사무/.test(sourceText)) {
    baseScore -= 24;
  }

  if (preference.excludeKeywords.some((keyword) => sourceText.includes(normalizeText(keyword)))) {
    baseScore -= 30;
  }

  if (preference.preferredConditions.intensity === 'low' && /걷|산책|플로깅|정화|안내/.test(sourceText)) {
    baseScore += 8;
  }

  return {
    source: activity,
    activity: mapVolunteerApiActivityToSaveRecord(activity),
    baseScore,
    matchReasons: matchReasons.slice(0, 5),
    diversityKey: getCandidateDiversityKey(activity),
  };
};

const selectDiverseCandidates = (candidates: ScoredVolunteerCandidate[], limit: number) => {
  const selected: ScoredVolunteerCandidate[] = [];
  const seenKeys = new Set<string>();
  const seenTraits = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (seenKeys.has(candidate.diversityKey)) continue;

    const trait = getActivityTrait(candidate.source);
    const isTooSimilar = seenTraits.has(trait) && selected.length < Math.min(limit, 3);
    if (isTooSimilar && candidates.some((item) => !seenTraits.has(getActivityTrait(item.source)))) continue;

    selected.push(candidate);
    seenKeys.add(candidate.diversityKey);
    seenTraits.add(trait);
  }

  if (selected.length < limit) {
    for (const candidate of candidates) {
      if (selected.length >= limit) break;
      if (selected.some((item) => (item.activity.id || item.activity.progrmRegistNo) === (candidate.activity.id || candidate.activity.progrmRegistNo))) {
        continue;
      }
      selected.push(candidate);
    }
  }

  return selected;
};

const getActivityMoodScore = (activity: ActivitySaveRecord, moodValue: string) => {
  const normalizedMood = moodValue.trim().toLowerCase();
  if (!normalizedMood) return 0;

  const sourceText = buildActivityConditionText(activity);
  let score = 0;

  if (normalizedMood.includes('조용') || normalizedMood.includes('걷')) {
    if (
      hasAnyKeyword(sourceText, [
        /플로깅/,
        /산책로\s*정비/,
        /공원\s*정화/,
        /숲길/,
        /둘레길/,
        /걷기/,
        /환경\s*정화|환경정화/,
      ])
    ) {
      score += 4;
    }
  }

  if (normalizedMood.includes('바다') || normalizedMood.includes('공원')) {
    if (
      hasAnyKeyword(sourceText, [
        /바다/,
        /해변/,
        /해수욕장/,
        /공원/,
        /숲/,
        /산책로/,
        /강변/,
        /하천/,
        /해안/,
        /수목원/,
      ])
    ) {
      score += 4;
    }
  }

  if (normalizedMood.includes('혼자') || normalizedMood.includes('부담')) {
    if (
      hasAnyKeyword(sourceText, [
        /단기/,
        /소규모/,
        /준비물\s*(없|적|미지참|불필요)/,
        /(교육|경력|자격)\s*(없|무관|불필요)/,
        /누구나/,
        /초보/,
        /플로깅/,
        /캠페인/,
        /환경\s*정화|환경정화/,
        /안내\s*보조|안내보조/,
      ])
    ) {
      score += 3;
    }

    if (isSingleDayActivity(activity)) score += 1;
    if (getActivityHours(activity) <= 2) score += 1;

    const capacity = getNumberValue(activity.capacity);
    if (capacity > 0 && capacity <= 20) score += 1;
  }

  if (normalizedMood.includes('행사') || normalizedMood.includes('축제')) {
    if (
      hasAnyKeyword(sourceText, [
        /행사/,
        /축제/,
        /문화제/,
        /공연/,
        /체험\s*부스|체험부스/,
        /안내/,
        /운영\s*보조|운영보조/,
        /진행\s*보조|진행보조/,
        /질서\s*안내|질서안내/,
        /안전\s*관리|안전관리/,
      ])
    ) {
      score += 4;
    }
  }

  return score;
};

export function HomeAIRecommendationFlow({
  isOpen,
  activities,
  isActivitySaved,
  onClose,
  onOpenActivity,
  onToggleSavedActivity,
}: HomeAIRecommendationFlowProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPresented, setIsPresented] = useState(false);
  useBottomSheetScrollLock(shouldRender);

  const [step, setStep] = useState(0);
  const [draftRegion, setDraftRegion] = useState('');
  const [region, setRegion] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeLabel, setTimeLabel] = useState('');
  const [mood, setMood] = useState('');
  const [isParsingPreference, setIsParsingPreference] = useState(false);
  const [parsePreferenceError, setParsePreferenceError] = useState('');
  const [aiRecommendedActivities, setAiRecommendedActivities] = useState<AIRecommendedActivity[]>([]);
  const [aiRecommendationNotice, setAiRecommendationNotice] = useState('');
  const [aiLoadingMessage, setAiLoadingMessage] = useState(loadingMessages[0]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const calendarAdvanceTimerRef = useRef<number | null>(null);
  const loadingMessageTimerRef = useRef<number | null>(null);
  const loadingCompleteTimerRef = useRef<number | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);
  const recommendationRequestInFlightRef = useRef(false);
  const recommendationRequestIdRef = useRef(0);

  const clearLoadingTimers = () => {
    if (loadingMessageTimerRef.current) {
      window.clearInterval(loadingMessageTimerRef.current);
      loadingMessageTimerRef.current = null;
    }
    if (loadingCompleteTimerRef.current) {
      window.clearTimeout(loadingCompleteTimerRef.current);
      loadingCompleteTimerRef.current = null;
    }
  };

  const clearCalendarAdvanceTimer = () => {
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
      calendarAdvanceTimerRef.current = null;
    }
  };

  const cancelActiveRecommendationRequest = () => {
    recommendationRequestIdRef.current += 1;
    recommendationRequestInFlightRef.current = false;
    clearLoadingTimers();
    setIsParsingPreference(false);
    setAiLoadingMessage(loadingMessages[0]);
    setLoadingMessageIndex(0);
  };

  const resetRecommendationSession = () => {
    cancelActiveRecommendationRequest();
    clearLoadingTimers();
    clearCalendarAdvanceTimer();

    setDraftRegion('');
    setRegion('');
    setDateLabel('');
    setDateValue('');
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setCurrentMonth(new Date());
    setTimeLabel('');
    setMood('');
    setIsParsingPreference(false);
    setParsePreferenceError('');
    setAiRecommendedActivities([]);
    setAiRecommendationNotice('');
    setAiLoadingMessage(loadingMessages[0]);
    setLoadingMessageIndex(0);
  };

  const resetAndClose = () => {
    setIsPresented(false);
    onClose();
    clearLoadingTimers();
    clearCalendarAdvanceTimer();
    window.setTimeout(() => {
      setStep(0);
      resetRecommendationSession();
    }, aiFlowCloseTransitionDuration);
  };

  useEffect(() => {
    if (!isOpen) return;

    setShouldRender(true);
    // Double rAF: first frame lets the DOM node appear with its initial
    // translate-y-full state; second frame triggers the CSS transition.
    let outerFrameId: number;
    let innerFrameId: number;
    outerFrameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        setIsPresented(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrameId);
      window.cancelAnimationFrame(innerFrameId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !shouldRender) return undefined;

    setIsPresented(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, aiFlowCloseTransitionDuration);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  useEffect(() => () => {
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
    }
    clearLoadingTimers();
  }, []);

  const selectedSummary = [
    region && { label: `${region}에서`, targetStep: 0 },
    dateLabel && { label: dateLabel, targetStep: 1 },
    timeLabel && { label: timeLabel, targetStep: 2 },
    mood && { label: `${mood} 활동`, targetStep: 3 },
  ].filter(Boolean) as Array<{ label: string; targetStep: number }>;
  const aiRegionSuggestions = useMemo(() => {
    const filteredSuggestions = filterLocationSuggestions(draftRegion);

    return draftRegion.trim() ? filteredSuggestions : locationSuggestions.slice(0, 5);
  }, [draftRegion]);

  const resetAfterStep = (targetStep: number) => {
    clearLoadingTimers();
    clearCalendarAdvanceTimer();
    setLoadingMessageIndex(0);

    if (targetStep <= 1) {
      setDateLabel('');
      setDateValue('');
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setCurrentMonth(new Date());
    }

    if (targetStep <= 2) {
      setTimeLabel('');
    }

    if (targetStep <= 3) {
      cancelActiveRecommendationRequest();
      setMood('');
      setParsePreferenceError('');
      setAiRecommendedActivities([]);
      setAiRecommendationNotice('');
      setAiLoadingMessage(loadingMessages[0]);
    }
  };

  const goToStep = (targetStep: number) => {
    resetAfterStep(targetStep);
    setStep(targetStep);
  };

  const confirmRegion = (value = draftRegion) => {
    const nextRegion = value.trim();
    if (!nextRegion) return;

    setRegion(nextRegion);
    setDraftRegion(nextRegion);
    setStep(1);
  };

  const handleBack = () => {
    if (step === 0) {
      resetAndClose();
      return;
    }

    goToStep(step >= 4 ? 3 : step - 1);
  };

  const confirmDateRange = (startDate: Date, endDate: Date) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setDateLabel(formatDateRangeLabel(startDate, endDate));
    setDateValue(getMonthDay(`${startDate.getFullYear()}.${startDate.getMonth() + 1}.${startDate.getDate()}`));
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
    }
    calendarAdvanceTimerRef.current = window.setTimeout(() => {
      setStep(2);
      calendarAdvanceTimerRef.current = null;
    }, 420);
  };

  const clearSelectedDateRange = () => {
    clearCalendarAdvanceTimer();
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setDateLabel('');
    setDateValue('');
  };

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const nextDays: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) {
      nextDays.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      nextDays.push(new Date(year, month, day));
    }

    return nextDays;
  }, [currentMonth]);

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateInSelectedRange = (date: Date) => (
    Boolean(selectedStartDate && selectedEndDate && date >= selectedStartDate && date <= selectedEndDate)
  );

  const isSelectedStartDate = (date: Date) => (
    Boolean(selectedStartDate && date.toDateString() === selectedStartDate.toDateString())
  );

  const isSelectedEndDate = (date: Date) => (
    Boolean(selectedEndDate && date.toDateString() === selectedEndDate.toDateString())
  );

  const handleInlineDateClick = (date: Date) => {
    if (isPastDate(date)) return;

    if (!selectedStartDate || selectedEndDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setDateLabel('');
      setDateValue('');
      return;
    }

    if (date < selectedStartDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setDateLabel('');
      setDateValue('');
      return;
    }

    confirmDateRange(selectedStartDate, date);
  };

  const handleSummaryClick = (targetStep: number) => {
    if (targetStep === step) return;

    goToStep(targetStep);
  };

  const getPreferenceDateRange = () => {
    if (selectedStartDate && selectedEndDate) {
      return `${formatApiDate(selectedStartDate)} - ${formatApiDate(selectedEndDate)}`;
    }

    return dateLabel;
  };

  const getVolunteerSearchDateParams = () => {
    if (!selectedStartDate || !selectedEndDate) return {};

    return {
      startDate: formatApiDate(selectedStartDate),
      endDate: formatApiDate(selectedEndDate),
    };
  };

  const startRecommendationLoadingState = () => {
    clearLoadingTimers();
    setLoadingMessageIndex(0);
    setAiLoadingMessage(loadingMessages[0]);
    setStep(4);
    loadingMessageTimerRef.current = window.setInterval(() => {
      setLoadingMessageIndex((currentIndex) => Math.min(currentIndex + 1, loadingMessages.length - 1));
    }, 700);
  };

  const fetchVolunteerCandidates = async () => {
    const params = new URLSearchParams({
      keyword: region,
      page: '1',
      size: '40',
    });
    const dateParams = getVolunteerSearchDateParams();
    if (dateParams.startDate) params.set('startDate', dateParams.startDate);
    if (dateParams.endDate) params.set('endDate', dateParams.endDate);

    const response = await fetch(`/api/volunteer/search?${params.toString()}`);
    const payload = await response.json() as VolunteerApiResponse;

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || '1365 후보 활동을 불러오지 못했어요.');
    }

    return Array.isArray(payload.items) ? payload.items : [];
  };

  const requestAIRecommendations = async (
    preference: ParsedActivityPreference,
    candidates: ScoredVolunteerCandidate[],
  ) => {
    const response = await fetch('/api/ai/recommend-activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preference,
        candidates: candidates.map((activity) => ({
          id: activity.activity.id || activity.activity.progrmRegistNo,
          title: activity.activity.title,
          location: activity.activity.location,
          date: activity.activity.activityStartDate || activity.activity.date,
          time: activity.activity.time,
          category: activity.activity.category,
          description: activity.activity.description,
          baseScore: activity.baseScore,
          matchReasons: activity.matchReasons,
        })),
      }),
    });
    const payload = await response.json() as RecommendActivitiesApiResponse;

    if (!response.ok || !payload.ok || !Array.isArray(payload.recommendations)) {
      throw new Error(payload.error || 'AI가 활동을 고르지 못했어요.');
    }

    return payload.recommendations;
  };

  const parseActivityPreference = async (nextMood = mood) => {
    if (isParsingPreference || recommendationRequestInFlightRef.current) return;

    const trimmedRegion = region.trim();
    if (!trimmedRegion) {
      setParsePreferenceError('여행지를 먼저 입력해 주세요.');
      return;
    }

    const rawPreferenceText = nextMood.trim();
    const effectivePreferenceText = rawPreferenceText || defaultActivityPreferenceText;
    if (effectivePreferenceText.length > maxPreferenceTextLength) {
      setParsePreferenceError('200자 이내로 입력해 주세요.');
      return;
    }

    const dateRange = getPreferenceDateRange();
    const cacheKey = getRecommendationCacheKey({
      location: trimmedRegion,
      dateRange,
      duration: timeLabel,
      preferenceText: effectivePreferenceText,
    });
    const cachedResult = recommendationResultCache.get(cacheKey);
    if (cachedResult) {
      setMood(effectivePreferenceText);
      setParsePreferenceError('');
      setAiRecommendedActivities(cachedResult.recommendations);
      setAiRecommendationNotice(cachedResult.notice);
      setStep(5);
      return;
    }

    const requestId = recommendationRequestIdRef.current + 1;
    recommendationRequestIdRef.current = requestId;
    recommendationRequestInFlightRef.current = true;
    const isLatestRequest = () => recommendationRequestIdRef.current === requestId;

    setMood(effectivePreferenceText);
    setParsePreferenceError('');
    setAiRecommendedActivities([]);
    setAiRecommendationNotice('');
    setIsParsingPreference(true);
    startRecommendationLoadingState();

    try {
      let parsedPreference = createDefaultParsedPreference(effectivePreferenceText);
      try {
        const response = await fetch('/api/ai/parse-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: trimmedRegion,
            dateRange,
            duration: timeLabel,
            preferenceText: effectivePreferenceText,
          }),
        });
        const payload = await response.json() as ParsePreferenceApiResponse;

        if (!response.ok || !payload.ok || !payload.parsed) {
          throw new Error(payload.error || 'AI가 조건을 해석하지 못했어요.');
        }

        parsedPreference = payload.parsed;
      } catch (error) {
        console.warn('AI preference parse failed, using default preference', error);
      }

      if (!isLatestRequest()) return;

      console.log('AI preference parse result', parsedPreference);
      setAiLoadingMessage('가까운 활동을 찾고 있어요');
      setLoadingMessageIndex(1);
      const candidates = await fetchVolunteerCandidates();
      if (!isLatestRequest()) return;

      const scoredCandidates = candidates
        .map((activity) => scoreVolunteerCandidate(activity, parsedPreference, {
          region: trimmedRegion,
          timeLabel,
          mood: effectivePreferenceText,
          selectedStartDate,
          selectedEndDate,
        }))
        .filter((candidate): candidate is ScoredVolunteerCandidate => candidate !== null)
        .sort((a, b) => b.baseScore - a.baseScore);
      const rankedCandidates = selectDiverseCandidates(scoredCandidates, 20);
      const fallbackCandidates = selectDiverseCandidates(scoredCandidates, 3);

      if (rankedCandidates.length === 0) {
        if (!isLatestRequest()) return;
        rememberRecommendationResult(cacheKey, { recommendations: [], notice: '' });
        setAiRecommendedActivities([]);
        setAiRecommendationNotice('');
        setStep(5);
        return;
      }

      if (rankedCandidates.length < 3) {
        if (!isLatestRequest()) return;
        const recommendations = rankedCandidates.map(({ activity }) => ({ activity }));
        const notice = '조건에 가까운 활동을 먼저 보여드려요.';
        rememberRecommendationResult(cacheKey, { recommendations, notice });
        setAiRecommendedActivities(recommendations);
        setAiRecommendationNotice(notice);
        setStep(5);
        return;
      }

      let nextRecommendedActivities = fallbackCandidates.map(({ activity }) => ({ activity }));
      let nextRecommendationNotice = 'AI 추천 연결이 불안정해 검색 결과 상위 활동을 보여드려요.';

      try {
        setAiLoadingMessage('조건에 맞는 활동을 살펴보고 있어요');
        setLoadingMessageIndex(0);
        const recommendations = await requestAIRecommendations(parsedPreference, rankedCandidates);
        if (!isLatestRequest()) return;

        const candidateMap = new Map(rankedCandidates.map(({ activity }) => [activity.id || activity.progrmRegistNo || activity.title, activity]));
        const selectedRecommendations = recommendations
          .map((recommendation) => {
            const activity = candidateMap.get(recommendation.activityId);
            if (!activity) return null;

            return {
              activity,
              reason: recommendation.reason,
              fitTags: recommendation.fitTags,
            } satisfies AIRecommendedActivity;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 3);

        if (selectedRecommendations.length > 0) {
          const selectedIds = new Set(selectedRecommendations.map((item) => item.activity.id || item.activity.progrmRegistNo || item.activity.title));
          const filledRecommendations = [
            ...selectedRecommendations,
            ...fallbackCandidates
              .filter(({ activity }) => !selectedIds.has(activity.id || activity.progrmRegistNo || activity.title))
              .map(({ activity }) => ({ activity })),
          ].slice(0, 3);

          nextRecommendedActivities = filledRecommendations;
          nextRecommendationNotice = '';
        } else {
          nextRecommendedActivities = fallbackCandidates.map(({ activity }) => ({ activity }));
          nextRecommendationNotice = 'AI가 고른 후보를 확인하지 못해 가까운 활동을 먼저 보여드려요.';
        }
      } catch (error) {
        console.error('AI activity recommendation failed, using search fallback', error);
      }

      if (!isLatestRequest()) return;
      rememberRecommendationResult(cacheKey, {
        recommendations: nextRecommendedActivities,
        notice: nextRecommendationNotice,
      });
      setAiRecommendedActivities(nextRecommendedActivities);
      setAiRecommendationNotice(nextRecommendationNotice);
      setStep(5);
    } catch (error) {
      if (!isLatestRequest()) return;
      console.error('AI preference parse failed', error);
      setAiRecommendedActivities([]);
      setAiRecommendationNotice('');
      setStep(5);
    } finally {
      if (isLatestRequest()) {
        clearLoadingTimers();
        recommendationRequestInFlightRef.current = false;
        setIsParsingPreference(false);
      }
    }
  };

  const restartRecommendation = () => {
    sheetScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setStep(0);
    resetRecommendationSession();
  };

  if (!shouldRender) return null;

  return (
    <div className="bottom-sheet-viewport z-[70] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-[#eef3ff]/62 backdrop-blur-[3px] transition-opacity ${
          isPresented ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transitionDuration: `${isPresented ? aiFlowOpenTransitionDuration : aiFlowCloseTransitionDuration}ms`,
          transitionTimingFunction: isPresented ? aiFlowOpenTransitionEasing : aiFlowCloseTransitionEasing,
        }}
        aria-hidden="true"
      />
      <div
        className={`bottom-sheet-panel bottom-sheet-panel-tall relative flex w-full max-w-[430px] transform-gpu flex-col overflow-hidden rounded-t-[28px] border border-[#e2e8f7] bg-[#fbfcff] shadow-[0_-18px_48px_rgba(87,101,145,0.16)] transition-[transform,opacity] will-change-transform ${
          isPresented ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{
          transitionDuration: `${isPresented ? aiFlowOpenTransitionDuration : aiFlowCloseTransitionDuration}ms`,
          transitionTimingFunction: isPresented ? aiFlowOpenTransitionEasing : aiFlowCloseTransitionEasing,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(253,252,250,0.98),rgba(248,250,246,0.98))]" />
        <header className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b border-[#eef1fb] bg-white/72 px-5 pb-3 pt-4 backdrop-blur-md">
          <button
            type="button"
            onClick={handleBack}
            aria-label={step > 0 ? '이전 질문' : '닫기'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e3e7f4] bg-white/86 text-[#3f4a63] shadow-[0_6px_16px_rgba(84,96,140,0.08)]"
          >
            {step > 0 ? <ArrowLeft className="h-4 w-4" strokeWidth={2} /> : <X className="h-4 w-4" strokeWidth={2} />}
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-[#dfd7ff] bg-[#f4f1ff]/88 px-3 py-1 text-[11px] font-medium text-[#7662d8] shadow-[0_8px_18px_rgba(124,104,220,0.08)]">
            <Sparkles className="h-3 w-3 text-[#7f72ff]" strokeWidth={2} />
            AI 추천
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="h-9 rounded-full px-2 text-[12px] font-medium text-[#777f94]"
          >
            닫기
          </button>
        </header>

        <div
          ref={sheetScrollRef}
          className="bottom-sheet-scrollable relative min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]"
          data-bottom-sheet-scrollable="true"
        >
          <div className="mb-5 flex gap-1.5">
            {[0, 1, 2, 3].map((item) => (
              <span
                key={item}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                  item <= Math.min(step, 3)
                    ? 'bg-[linear-gradient(90deg,#6da8ff,#9888ff)]'
                    : 'bg-[#e5e8f2]'
                }`}
              />
            ))}
          </div>

          {selectedSummary.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {selectedSummary.map((item) => (
                <button
                  key={`${item.targetStep}-${item.label}`}
                  type="button"
                  onClick={() => handleSummaryClick(item.targetStep)}
                  disabled={item.targetStep === step}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium shadow-[0_8px_18px_rgba(94,110,180,0.07)] transition-all active:scale-[0.98] ${
                    item.targetStep === step
                      ? 'cursor-default border-[#e5e8f6] bg-white/56 text-[#9aa2b7]'
                      : 'border-[#dce2fb] bg-white/82 text-[#5d6a86] hover:border-[#cbd4fb] hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div key={step} style={{ animation: 'sisonAiFlowIn 220ms ease-out both' }}>
            {step === 0 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">1/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  어디에서 활동을<br />찾아볼까요?
                </h2>
                <input
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') confirmRegion();
                  }}
                  autoFocus
                  placeholder="어디에서 활동을 찾을까요?"
                  className={aiInputClassName}
                />
                <p className="mb-2 text-[12px] font-medium text-[#7a8499]">
                  {draftRegion.trim() ? '여행지 제안' : '자주 찾는 여행지'}
                </p>
                <div className="mb-4 flex min-h-[70px] flex-wrap content-start gap-2">
                  {aiRegionSuggestions.length > 0 ? (
                    aiRegionSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          confirmRegion(item);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => confirmRegion(item)}
                        className={aiChipClassName}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <span className="rounded-full border border-[#e2e6fb] bg-white/60 px-3 py-2 text-[12px] font-medium text-[#98a1b8]">
                      어울리는 여행지를 찾고 있어요
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!draftRegion.trim()}
                  onClick={() => confirmRegion()}
                  className={aiPrimaryButtonClassName}
                >
                  다음
                </button>
              </section>
            )}

            {step === 1 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">2/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  언제 시간이<br />괜찮으세요?
                </h2>
                <div className="rounded-[1.5rem] border border-[#dfe5fb] bg-white/84 p-3.5 shadow-[0_12px_28px_rgba(91,105,170,0.09),inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-4" style={{ animation: 'sisonAiFlowIn 240ms ease-out both' }}>
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f8ff] text-[#68738f] transition-colors active:bg-[#eef1ff]"
                      aria-label="이전 달"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <div className="text-center">
                      <h3 className="text-[16px] font-semibold text-[#303850]">
                        {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                      </h3>
                      <p className="mt-1 text-[11.5px] text-[#8b94aa]">
                        시작일과 마지막 날을 차례로 골라주세요
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f8ff] text-[#68738f] transition-colors active:bg-[#eef1ff]"
                      aria-label="다음 달"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="mb-1.5 grid grid-cols-7 gap-1 sm:mb-2 sm:gap-1.5">
                    {weekDays.map((day, index) => (
                      <div
                        key={day}
                        className={`py-1.5 text-center text-[11px] font-medium ${
                          index === 0 ? 'text-[#d98c8c]' : index === 6 ? 'text-[#7c97c8]' : 'text-[#a2a7b5]'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {days.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const isPast = isPastDate(date);
                      const isStart = isSelectedStartDate(date);
                      const isEnd = isSelectedEndDate(date);
                      const inRange = isDateInSelectedRange(date);
                      const isSunday = date.getDay() === 0;
                      const isSaturday = date.getDay() === 6;

                      return (
                        <button
                          type="button"
                          key={date.toISOString()}
                          onClick={() => handleInlineDateClick(date)}
                          disabled={isPast}
                          className={`
                            aspect-square rounded-xl text-[12px] font-medium transition-all sm:rounded-2xl sm:text-[12.5px]
                            ${isPast ? 'cursor-not-allowed text-[#d7dbe6]' : 'active:scale-95'}
                            ${isStart || isEnd ? 'scale-[1.03] bg-[#7d8dff] text-white shadow-[0_9px_18px_rgba(125,141,255,0.24),0_0_0_4px_rgba(125,141,255,0.08)]' : ''}
                            ${inRange && !isStart && !isEnd ? 'bg-[#edf0ff] text-[#44506e] shadow-[inset_0_0_0_1px_rgba(125,141,255,0.04)]' : ''}
                            ${!inRange && !isStart && !isEnd && !isPast ? 'bg-white/70 text-[#44506e] hover:bg-[#f4f6ff]' : ''}
                            ${!isPast && isSunday && !isStart && !isEnd && !inRange ? 'text-[#d98c8c]' : ''}
                            ${!isPast && isSaturday && !isStart && !isEnd && !inRange ? 'text-[#7c97c8]' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`mt-4 flex min-h-[28px] items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] transition-all ${
                      selectedStartDate && selectedEndDate
                        ? 'bg-[#f2f4ff] text-[#5964a8] shadow-[inset_0_0_0_1px_rgba(125,141,255,0.08)]'
                        : 'bg-transparent text-[#7a8499]'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#7d8dff]" strokeWidth={2} />
                    <span className="min-w-0 flex-1">
                      {selectedStartDate
                        ? selectedEndDate
                          ? `${formatDateRangeLabel(selectedStartDate, selectedEndDate)}로 정했어요`
                          : `${formatDateLabel(selectedStartDate)}부터 언제까지 가능할까요?`
                        : '가능한 시작일을 먼저 골라주세요'}
                    </span>
                    {selectedStartDate && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearSelectedDateRange();
                        }}
                        aria-label="여행 일정 초기화"
                        className="-mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-[#9aa2b7] transition-colors hover:bg-white hover:text-[#68738f] active:scale-95"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">3/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  얼마나 참여할 수<br />있나요?
                </h2>
                <div className="space-y-2.5">
                  {timeSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTimeLabel(item);
                        setStep(3);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[14px] font-semibold transition-all active:scale-[0.99] ${
                        timeLabel === item
                          ? 'border-[#aaa2ff] bg-[linear-gradient(135deg,rgba(244,245,255,0.96),rgba(255,255,255,0.88))] text-[#303851] shadow-[0_12px_28px_rgba(124,130,232,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]'
                          : 'border-[#e2e6fb] bg-white/86 text-[#303851] shadow-[0_10px_24px_rgba(97,111,176,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] active:border-[#aaa2ff] active:bg-[#f4f5ff]'
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[12px] font-medium text-[#7c82e8]">선택</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">4/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  어떤 활동이면<br />좋을까요?
                </h2>
                <input
                  value={mood}
                  onChange={(event) => {
                    setMood(event.target.value);
                    setParsePreferenceError(
                      event.target.value.trim().length > maxPreferenceTextLength
                        ? '200자 이내로 입력해 주세요.'
                        : '',
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void parseActivityPreference();
                  }}
                  autoFocus
                  placeholder="어떤 활동이면 좋을까요?"
                  className={aiInputClassName}
                />
                <div className="mb-5 space-y-2">
                  {activityMoodSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        void parseActivityPreference(item);
                      }}
                      className="block w-full rounded-2xl border border-[#e2e6fb] bg-white/84 px-4 py-3.5 text-left text-[13px] font-medium text-[#56647f] shadow-[0_8px_20px_rgba(97,111,176,0.07)] transition-all active:scale-[0.99] active:border-[#aaa2ff] active:bg-[#f4f5ff]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={isParsingPreference}
                  onClick={() => void parseActivityPreference()}
                  className={aiPrimaryButtonClassName}
                >
                  추천 결과 보기
                </button>
                {parsePreferenceError && (
                  <p className="mt-3 text-center text-[12.5px] leading-relaxed text-[#c9897e]">
                    {parsePreferenceError}
                  </p>
                )}
              </section>
            )}

            {step === 4 && (
              <section className="py-2">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e7eee7] bg-[#fdfbf6]/92 px-5 py-6 shadow-[0_14px_34px_rgba(84,102,84,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]">
                  <div
                    aria-hidden="true"
                    className="absolute right-5 top-5 h-1.5 w-1.5 rounded-full bg-[#a8d5ba]/70"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute right-8 top-8 h-1 w-1 rounded-full bg-[#d7c7a8]/60"
                  />

                  <div className="relative">
                    <p className="mb-3 text-[12px] font-medium text-[#7ca58c]">일정을 차분히 정리하는 중</p>
                    <h2
                      key={aiLoadingMessage}
                      className="min-h-[58px] text-[22px] font-semibold leading-snug text-[#2f3a33]"
                      style={{ animation: 'sisonAiLoadingTextIn 320ms ease-out both' }}
                    >
                      {aiLoadingMessage}
                    </h2>
                    <p className="mt-3 max-w-[280px] text-[13px] leading-6 text-[#8b9189]">
                      {region}의 일정과 {timeLabel || '가능한 시간'}에 맞춰 부담 없이 이어지는 활동을 살펴보고 있어요.
                    </p>

                    <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#edf1ea]">
                      <span
                        className="block h-full rounded-full bg-[#a8d5ba] transition-all duration-500 ease-out"
                        style={{
                          width: `${((loadingMessageIndex + 1) / loadingMessages.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative mt-6 space-y-2.5" aria-hidden="true">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="sison-ai-calm-skeleton rounded-2xl border border-[#edf0e9] bg-white/72 p-3.5 shadow-[0_6px_16px_rgba(92,108,91,0.04)]"
                        style={{ animationDelay: `${item * 120}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-[#eef3ee]" />
                          <div className="min-w-0 flex-1 space-y-2.5">
                            <div className="h-3 w-4/5 rounded-full bg-[#eef3ee]" />
                            <div className="h-2.5 w-3/5 rounded-full bg-[#f1eee7]" />
                          </div>
                          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-[#eef3ee]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">AI 큐레이션</p>
                <h2 className="mb-6 text-[22px] font-semibold leading-tight text-[#303850]">
                  지금 일정에 어울리는<br />활동이에요
                </h2>
                {aiRecommendationNotice && (
                  <p className="mb-4 rounded-2xl border border-[#e2e6fb] bg-white/72 px-4 py-3 text-[12.5px] leading-relaxed text-[#69718d]">
                    {aiRecommendationNotice}
                  </p>
                )}
                {aiRecommendedActivities.length > 0 ? (
                  <div className="space-y-3">
                    {aiRecommendedActivities.map(({ activity, reason, fitTags }) => (
                      <div key={`${activity.id || activity.progrmRegistNo || activity.title}-${activity.date}`} className="space-y-2">
                        {reason && (
                          <p className="rounded-2xl bg-[#f4f5ff]/80 px-4 py-3 text-[12.5px] leading-relaxed text-[#5d6684]">
                            {reason}
                          </p>
                        )}
                        <CompactActivityCard
                          variant="aiRecommendation"
                          imageUrl={activity.imageUrl}
                          title={activity.title}
                          location={activity.location}
                          recruitmentStartDate={activity.recruitmentStartDate}
                          recruitmentEndDate={activity.recruitmentEndDate}
                          date={activity.date}
                          activityStartDate={activity.activityStartDate}
                          activityEndDate={activity.activityEndDate}
                          time={activity.time}
                          showBookmark
                          isSaved={isActivitySaved(activity)}
                          onBookmarkClick={() => onToggleSavedActivity(activity)}
                          onClick={() => onOpenActivity(activity)}
                        />
                        <p className="px-1 text-[11.5px] leading-relaxed text-[#8b94aa]">
                          모집 {activity.capacity || '확인 필요'} · 신청 {activity.currentParticipants || '확인 필요'}
                        </p>
                        {fitTags && fitTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-1">
                            {fitTags.map((tag) => (
                              <span
                                key={`${activity.id || activity.title}-${tag}`}
                                className="rounded-full bg-white/78 px-2.5 py-1 text-[11px] font-medium text-[#7c82a2] shadow-[inset_0_0_0_1px_rgba(124,130,232,0.12)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e2e6fb] bg-white/78 px-4 py-6 text-center">
                    <p className="text-[14px] font-semibold text-[#303850]">조건에 맞는 활동이 아직 없어요</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#7a8499]">
                      다른 지역이나 일정을 선택해 다시 찾아보세요.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={restartRecommendation}
                  className="mt-5 w-full rounded-2xl border border-[#dfe4fa] bg-white/84 py-3.5 text-[13px] font-semibold text-[#69718d] transition-all active:bg-[#f4f5ff]"
                >
                  다시 고르기
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
