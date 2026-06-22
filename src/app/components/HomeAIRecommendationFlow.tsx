import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Calendar, ChevronLeft, ChevronRight, Clock, Lightbulb, MapPin, Route, Sparkles, X } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import { getSearchSuggestions, locationSuggestions } from '../locationSuggestions';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';
import { resolveActivityImage } from '../utils/activityImage';

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
  preferredCategories?: string[];
  avoidCategories?: string[];
  intensity?: 'light' | 'medium' | 'high' | 'unknown';
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both' | 'unknown';
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
  '주변 활동을 살펴보고 있어요',
  '가까운 활동을 찾고 있어요',
  '가벼운 활동을 고르고 있어요',
  '일정에 맞는 추천을 정리하고 있어요',
];
const buildLoadingMessages = (
  regionValue: string,
  dateValue: string,
  timeValue: string,
  moodValue: string,
) => [
  regionValue ? `${regionValue} 활동을 살펴보고 있어요` : loadingMessages[0],
  dateValue ? '일정에 맞는 활동을 찾고 있어요' : '가능한 일정을 확인하고 있어요',
  timeValue ? '참여 시간을 비교하고 있어요' : loadingMessages[2],
  moodValue ? '활동 성향을 분석하고 있어요' : '선호 활동을 분석하고 있어요',
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
  preferredCategories: ['환경', '산책형'],
  avoidCategories: ['교육', '멘토링', '상담', '요양', '정기', '장기'],
  intensity: 'light',
  indoorOutdoor: 'both',
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

const getPreferenceTokens = (preference: ParsedActivityPreference, moodValue: string) => {
  const rawWords = [
    ...preference.keywords,
    ...preference.categories,
    ...(preference.preferredCategories ?? []),
    preference.intentSummary,
    moodValue,
  ];

  return rawWords
    .flatMap((word) => normalizeText(word).split(/[\s,./·|]+/))
    .map((word) => word.replace(/이면$|에서$|근처$|으로$|으로도$|하며$|하게$|있는$|활동$/g, ''))
    .filter((word) => word.length >= 2)
    .filter((word, index, words) => words.indexOf(word) === index)
    .slice(0, 18);
};

const getCompactRegionLabel = (value: string) => {
  const firstToken = value.trim().split(/\s+/)[0] ?? '';
  return firstToken
    .replace(/특별자치도|특별자치시|특별시|광역시|도$/g, '')
    .trim() || value.trim();
};

const getAiRecommendationIntro = (regionValue: string, timeValue: string, moodValue: string) => {
  const regionLabel = getCompactRegionLabel(regionValue);
  const sourceText = moodValue.toLowerCase();
  const timeText = timeValue || '활동 시간';
  const preferenceLabel = moodValue.trim() && moodValue.trim() !== defaultActivityPreferenceText
    ? `‘${moodValue.trim()}’ 조건`
    : `${timeText} 조건`;

  if (/환경|정화|플로깅|바다|해변|해안/.test(sourceText)) {
    return [
      `${regionLabel} 일정과 ${preferenceLabel}을 바탕으로`,
      '부담 없이 참여할 수 있는 활동을 골랐어요.',
    ];
  }

  if (/축제|행사|문화/.test(sourceText)) {
    return [
      `${regionLabel} 여행 동선과 ${preferenceLabel}을 함께 고려해`,
      '지역 분위기를 자연스럽게 느낄 수 있는 활동을 골랐어요.',
    ];
  }

  return [
    `여행 동선과 ${preferenceLabel}을 함께 고려해`,
    `지금 ${regionLabel} 일정에 어울리는 활동을 추천했어요.`,
  ];
};

const getEditorialRecommendationReason = (
  activity: ActivitySaveRecord,
  aiReason: string | undefined,
  index: number,
  moodValue: string,
) => {
  const sourceText = [moodValue, buildActivityConditionText(activity)].join(' ').toLowerCase();
  const placeLabel = getCompactRegionLabel(activity.volunteerPlace || activity.location || '여행지');
  const fallbackReason = aiReason?.trim().replace(/\s+/g, ' ');
  const shortAiReason = fallbackReason
    && fallbackReason.length <= 34
    && !/(조건|일정|동선|시간|귀하|부합|실적|신청 대상)/.test(fallbackReason)
    ? fallbackReason.replace(/[.。]\s*$/, '')
    : '';

  if (/환경|정화|플로깅|쓰레기/.test(sourceText)) {
    return [
      `${placeLabel} 인근에서 참여할 수 있는 환경정화 활동이에요.`,
      '가볍게 움직이며 환경보호에 참여할 수 있어요.',
      '여행 중 산책하듯 참여하기 좋은 정화 활동이에요.',
    ][index % 3];
  }

  if (/바다|해변|해안|포구/.test(sourceText)) {
    return [
      '바다 풍경을 즐기며 환경보호에 참여할 수 있어요.',
      `${placeLabel} 주변에서 여행 분위기와 함께하기 좋아요.`,
      '해안가 일정 사이에 자연스럽게 더하기 좋은 활동이에요.',
    ][index % 3];
  }

  if (/축제|행사|문화제|부스|안내/.test(sourceText)) {
    return [
      '지역 분위기를 가까이에서 느낄 수 있는 활동이에요.',
      `${placeLabel}의 활기를 함께 경험하기 좋은 활동이에요.`,
      '여행지의 현장감을 가볍게 만날 수 있어요.',
    ][index % 3];
  }

  return shortAiReason || [
    `${placeLabel} 근처에서 부담 없이 참여할 수 있는 활동이에요.`,
    '여행 중 잠깐 들러 작은 선행을 더하기 좋아요.',
    '일정 사이에 차분히 참여하기 좋은 활동이에요.',
  ][index % 3];
};

const getRecommendationMoodTip = (
  activity: ActivitySaveRecord,
  index: number,
  moodValue: string,
) => {
  const sourceText = [moodValue, buildActivityConditionText(activity)].join(' ').toLowerCase();

  if (/바다|해변|해안|포구|해수욕장|해양/.test(sourceText)) {
    return '해안 산책과 함께 즐길 수 있어요.';
  }

  if (/문화|전시|도서관|체험|공연|박물관|미술관/.test(sourceText)) {
    return '여행지의 문화 분위기와 자연스럽게 이어져요.';
  }

  if (/축제|행사|지역행사|문화제|부스|운영/.test(sourceText)) {
    return '지역 분위기를 가까이에서 느끼기 좋아요.';
  }

  if (/교육|멘토링|수업|학습|강의/.test(sourceText)) {
    return '짧은 배움의 시간을 더하기 좋은 활동이에요.';
  }

  if (/공원|숲|산책|둘레길|플로깅|환경|정화|하천/.test(sourceText)) {
    return '여행 일정 중 가볍게 참여하기 좋아요.';
  }

  return [
    '현재 일정에 가장 부담 없이 참여할 수 있어요.',
    '여행 중 잠깐 들러 작은 의미를 더하기 좋아요.',
    '활동 후보를 비교해보기에 좋은 균형감이 있어요.',
  ][index % 3];
};

const getActivityDateLabel = (activity: ActivitySaveRecord) => {
  const dateRange = activity.activityStartDate && activity.activityEndDate && activity.activityStartDate !== activity.activityEndDate
    ? `${getMonthDay(activity.activityStartDate)} - ${getMonthDay(activity.activityEndDate)}`
    : getMonthDay(activity.activityStartDate || activity.activityDate || activity.date);

  return dateRange || activity.volunteerPeriod || activity.date || '일정 확인 필요';
};

const getActivityPlaceLabel = (activity: ActivitySaveRecord) =>
  activity.volunteerPlace || activity.location || '장소 확인 필요';

const getActivityStatusLabel = (activity: ActivitySaveRecord) => {
  if (activity.status === '지난 활동' || activity.status === 'completed') return '지난 활동';
  if (activity.isRecruiting === false) return '모집 마감';
  return '모집중';
};

const getActivityTimeLabel = (activity: ActivitySaveRecord) =>
  activity.volunteerTime || activity.duration || activity.time || '시간 확인 필요';

const getShortRecommendationReason = (reason: string) => {
  const normalized = reason
    .replace(/[.。]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '가볍게 참여하기 좋아요';
  if (normalized.length <= 25) return normalized;

  if (/해변|해안|바다/.test(normalized)) return '해변 산책과 함께 좋아요';
  if (/공원|숲|산책/.test(normalized)) return '산책 전후로 추천해요';
  if (/환경|정화|플로깅/.test(normalized)) return '가볍게 환경에 보탬이 돼요';
  if (/문화|행사|관광/.test(normalized)) return '여행 분위기와 잘 맞아요';
  return '여행 중 가볍게 참여해요';
};

const getDeckCardStyle = (
  depth: number,
  dragOffset: number,
  isDragging: boolean,
  _enterDirection: 1 | -1 | null,
  _isEntering: boolean,
  interactionType: 'button' | 'swipe' | null,
) => {
  const isActive = depth === 0;
  const clampedDepth = Math.min(depth, 3);
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scaleByDepth = [1, 0.97, 0.94, 0.9];
  const translateYByDepth = [0, -12, -22, -30];
  const opacityByDepth = [1, 0.9, 0.76, 0];
  const scale = scaleByDepth[clampedDepth] ?? 0.9;
  const translateY = translateYByDepth[clampedDepth] ?? -30;
  const translateX = isActive && interactionType !== 'button' ? dragOffset : 0;
  const rotate = isActive && interactionType !== 'button' ? dragOffset / 48 : 0;

  return {
    zIndex: 30 - clampedDepth,
    opacity: opacityByDepth[clampedDepth] ?? 0,
    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
    boxShadow: isActive
      ? '0 18px 36px rgba(38,28,66,0.15)'
      : clampedDepth === 1
        ? '0 10px 24px rgba(56,42,92,0.08)'
        : '0 6px 16px rgba(56,42,92,0.045)',
    transition: prefersReducedMotion || (isDragging && isActive)
      ? 'none'
      : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease-out, box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
};

const getExitingDeckCardStyle = (direction: 1 | -1) => {
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 430;
  // Use 100% viewport width so exit card goes just off-screen (not 1.12x)
  // to avoid increasing the document scroll width on Android
  const exitOffset = direction === 1 ? -viewportWidth : viewportWidth;

  return {
    zIndex: 40,
    opacity: 1,
    transform: `translate3d(${exitOffset}px, 0, 0) scale(0.96) rotate(${direction === 1 ? -9 : 9}deg)`,
    boxShadow: '0 12px 28px rgba(38,28,66,0.10)',
    transition: prefersReducedMotion
      ? 'none'
      : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease-out',
  };
};

const resolveRecommendationFallbackImage = (
  activity: ActivitySaveRecord,
  index: number,
  usedImageUrls: Set<string>,
) => {
  const baseKey = activity.id || activity.progrmRegistNo || activity.title || `recommendation-${index}`;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const resolved = resolveActivityImage({
      ...activity,
      id: `${baseKey}-${index}-${attempt}`,
      imageUrl: null,
    });

    if (!usedImageUrls.has(resolved.imageUrl)) {
      return resolved.imageUrl;
    }
  }

  return resolveActivityImage({
    ...activity,
    id: `${baseKey}-${index}-default`,
    imageUrl: null,
  }).imageUrl;
};

const buildRecommendationDisplayItems = (items: AIRecommendedActivity[], moodValue: string) => {
  const usedImageUrls = new Set<string>();

  return items.map((item, index) => {
    const originalImageUrl = item.activity.imageUrl?.trim() || '';
    const imageUrl = originalImageUrl && !usedImageUrls.has(originalImageUrl)
      ? originalImageUrl
      : resolveRecommendationFallbackImage(item.activity, index, usedImageUrls);

    usedImageUrls.add(imageUrl);

    return {
      ...item,
      imageUrl,
      moodTip: getRecommendationMoodTip(item.activity, index, moodValue),
    };
  });
};

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
    ...getPreferenceTokens(preference, options.mood),
  ];
  const preferenceMatchCount = preferenceWords.filter((word) => sourceText.includes(word)).length;
  if (preferenceMatchCount > 0) {
    baseScore += Math.min(preferenceMatchCount * 8, 24);
    matchReasons.push('선호 문구와 관련 있음');
  }

  const preferenceText = [
    options.mood,
    preference.intentSummary,
    ...preference.keywords,
    ...preference.categories,
    ...(preference.preferredCategories ?? []),
  ].map(normalizeText).join(' ');
  const avoidText = [
    ...preference.excludeKeywords,
    ...(preference.avoidCategories ?? []),
  ].map(normalizeText).join(' ');
  const wantsSea = /바다|해변|해안|해수욕장|항구|포구|해양/.test(preferenceText);
  const wantsQuietSolo = /혼자|조용|차분|소규모|가볍|부담|산책|걷/.test(preferenceText);
  const wantsEnvironment = /환경|정화|플로깅|쓰레기|공원|숲|하천/.test(preferenceText);
  const avoidsEvent = /행사|축제|단체|운영보조|행사보조|진행보조|부스/.test(avoidText)
    || (wantsQuietSolo && !/행사|축제/.test(preferenceText));
  const candidateIsSea = /바다|해변|해안|해수욕장|항구|포구|해양|연안|방파제/.test(sourceText);
  const candidateIsEnvironment = /환경\s*정화|환경정화|플로깅|쓰레기|공원|하천|숲길|둘레길|산책로|해변/.test(sourceText);
  const candidateIsEvent = /축제|행사|문화제|공연|부스|운영\s*보조|운영보조|행사\s*보조|행사보조|진행\s*보조|진행보조/.test(sourceText);
  const candidateIsLargeGroup = /단체|대규모|운영|행사|축제|부스|질서|안전관리/.test(sourceText);

  if (wantsSea && candidateIsSea) {
    baseScore += 22;
    matchReasons.push('바다 근처 선호와 맞음');
  }

  if (wantsEnvironment && candidateIsEnvironment) {
    baseScore += 18;
    matchReasons.push('환경 활동 선호와 맞음');
  }

  if (wantsQuietSolo) {
    if (candidateIsEnvironment || /산책|걷|공원|숲길|둘레길|플로깅|정화/.test(sourceText)) {
      baseScore += 14;
      matchReasons.push('혼자 가볍게 참여하기 좋음');
    }
    if (candidateIsEvent || candidateIsLargeGroup) {
      baseScore -= 22;
    }
  }

  if (avoidsEvent && candidateIsEvent) {
    baseScore -= 26;
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

  if ((preference.avoidCategories ?? []).some((keyword) => sourceText.includes(normalizeText(keyword)))) {
    baseScore -= 26;
  }

  if (
    (preference.preferredConditions.intensity === 'low' || preference.intensity === 'light')
    && /걷|산책|플로깅|정화|안내|공원|해변/.test(sourceText)
  ) {
    baseScore += 8;
  }

  if (
    (preference.preferredConditions.indoorOutdoor === 'outdoor' || preference.indoorOutdoor === 'outdoor')
    && /해변|해안|공원|하천|숲|야외|거리|광장|플로깅|정화/.test(sourceText)
  ) {
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
  const [isAiLoadingTextVisible, setIsAiLoadingTextVisible] = useState(true);
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0);
  const [deckDragOffset, setDeckDragOffset] = useState(0);
  const [isDeckDragging, setIsDeckDragging] = useState(false);
  const [deckTransitionDirection, setDeckTransitionDirection] = useState<1 | -1 | null>(null);
  const [deckInteractionType, setDeckInteractionType] = useState<'button' | 'swipe' | null>(null);
  const [isDeckEntering, setIsDeckEntering] = useState(false);
  const [exitingRecommendationIndex, setExitingRecommendationIndex] = useState<number | null>(null);
  const [fallingPhase, setFallingPhase] = useState<'hidden' | 'in' | 'hold' | 'out'>('hidden');
  const calendarAdvanceTimerRef = useRef<number | null>(null);
  const fallingPhaseTimerRef = useRef<number | null>(null);
  const loadingMessageTimerRef = useRef<number | null>(null);
  const loadingCompleteTimerRef = useRef<number | null>(null);
  const loadingTextFadeTimerRef = useRef<number | null>(null);
  const loadingStartedAtRef = useRef(0);
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);
  const moodInputRef = useRef<HTMLInputElement | null>(null);
  const deckDragStartXRef = useRef(0);
  const deckDragStartYRef = useRef(0);
  const deckDragLastXRef = useRef(0);
  const deckDragLastTimeRef = useRef(0);
  const deckDragVelocityXRef = useRef(0);
  const deckDragFrameRef = useRef<number | null>(null);
  const deckPendingDragOffsetRef = useRef(0);
  const deckSuppressClickRef = useRef(false);
  // Prevents pointerUp + pointerCancel double-firing on the same gesture
  const deckSwipeHandledRef = useRef(false);
  // Ref-based transition lock: prevents concurrent moveRecommendation calls
  // (state-based deckTransitionDirection is async and can't guard synchronous double calls)
  const deckTransitionActiveRef = useRef(false);
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
    if (loadingTextFadeTimerRef.current) {
      window.clearTimeout(loadingTextFadeTimerRef.current);
      loadingTextFadeTimerRef.current = null;
    }
  };

  const clearCalendarAdvanceTimer = () => {
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
      calendarAdvanceTimerRef.current = null;
    }
  };

  const keepMoodInputVisible = () => {
    const inputElement = moodInputRef.current;
    if (!inputElement) return;

    const scrollInputIntoView = () => {
      inputElement.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
    };

    scrollInputIntoView();
    window.setTimeout(scrollInputIntoView, 280);
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
    setActiveRecommendationIndex(0);
    setDeckDragOffset(0);
    setIsDeckDragging(false);
    setDeckTransitionDirection(null);
    setDeckInteractionType(null);
    setIsDeckEntering(false);
    setExitingRecommendationIndex(null);
    deckSwipeHandledRef.current = false;
    deckTransitionActiveRef.current = false;
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
    if (fallingPhaseTimerRef.current) {
      window.clearTimeout(fallingPhaseTimerRef.current);
    }
    clearLoadingTimers();
  }, []);

  useEffect(() => {
    if (step !== 4) {
      if (fallingPhaseTimerRef.current) window.clearTimeout(fallingPhaseTimerRef.current);
      setFallingPhase('hidden');
      return;
    }

    const runCycle = () => {
      setFallingPhase('hidden');
      fallingPhaseTimerRef.current = window.setTimeout(() => {
        setFallingPhase('in');
        fallingPhaseTimerRef.current = window.setTimeout(() => {
          setFallingPhase('hold');
          fallingPhaseTimerRef.current = window.setTimeout(() => {
            setFallingPhase('out');
            fallingPhaseTimerRef.current = window.setTimeout(runCycle, 560);
          }, 800);
        }, 1450);
      }, 50);
    };

    runCycle();

    return () => {
      if (fallingPhaseTimerRef.current) window.clearTimeout(fallingPhaseTimerRef.current);
    };
  }, [step]);

  const selectedSummary = [
    region && { label: `${region}에서`, targetStep: 0 },
    dateLabel && { label: dateLabel, targetStep: 1 },
    timeLabel && { label: timeLabel, targetStep: 2 },
    mood && { label: `${mood} 활동`, targetStep: 3 },
  ].filter(Boolean) as Array<{ label: string; targetStep: number }>;
  const loadingConditionBubbles = [
    {
      label: region ? `${region}에서` : '여행지에서',
      caption: '위치 조건 확인 중',
      icon: <MapPin className="h-4 w-4" strokeWidth={2.2} />,
      className: 'left-0 top-3 w-[132px]',
    },
    {
      label: dateLabel || '여행 일정',
      caption: '일정 조건 분석 중',
      icon: <Calendar className="h-4 w-4" strokeWidth={2.2} />,
      className: 'right-0 top-[72px] w-[154px]',
    },
    {
      label: timeLabel || '참여 시간',
      caption: '활동 시간 검토 중',
      icon: <Clock className="h-4 w-4" strokeWidth={2.2} />,
      className: 'left-1 bottom-[64px] w-[126px]',
    },
    {
      label: mood || '활동 성향',
      caption: '활동 유형 분석 중',
      icon: <Route className="h-4 w-4" strokeWidth={2.2} />,
      className: 'right-1 bottom-2 w-[148px]',
    },
  ];

  const fallingCardConfigs = [
    { dx: -14, dy: -175, rotate: -8, exitDx: -38, exitDy: 52, exitRotate: -13 },
    { dx: 7,  dy: -155, rotate:  5, exitDx: -14, exitDy: 68, exitRotate:   7 },
    { dx: -8, dy: -195, rotate: -6, exitDx:  16, exitDy: 56, exitRotate:  -9 },
    { dx: 14, dy: -168, rotate:  9, exitDx:  42, exitDy: 60, exitRotate:  12 },
  ] as const;

  const getFallingCardStyle = (phase: 'hidden' | 'in' | 'hold' | 'out', i: number): React.CSSProperties => {
    const cfg = fallingCardConfigs[i];
    const stagger = i * 190;
    switch (phase) {
      case 'hidden':
        return {
          transform: `translateX(${cfg.dx}px) translateY(${cfg.dy}px) rotate(${cfg.rotate}deg)`,
          opacity: 0,
          transition: 'none',
        };
      case 'in':
        return {
          transform: 'translateX(0) translateY(0) rotate(0deg)',
          opacity: 1,
          transition: `transform 920ms cubic-bezier(0.22, 1, 0.36, 1) ${stagger}ms, opacity 380ms ease ${stagger}ms`,
        };
      case 'hold':
        return {
          transform: 'translateX(0) translateY(0) rotate(0deg)',
          opacity: 1,
          transition: 'none',
        };
      case 'out':
        return {
          transform: `translateX(${cfg.exitDx}px) translateY(${cfg.exitDy}px) rotate(${cfg.exitRotate}deg)`,
          opacity: 0,
          transition: 'transform 500ms cubic-bezier(0.4, 0, 1, 1), opacity 400ms ease',
        };
    }
  };

  const aiRegionSuggestions = useMemo(() => {
    const filteredSuggestions = getSearchSuggestions(draftRegion);

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
    loadingStartedAtRef.current = Date.now();
    const nextLoadingMessages = buildLoadingMessages(region, dateLabel, timeLabel, mood);
    setLoadingMessageIndex(0);
    setAiLoadingMessage(nextLoadingMessages[0]);
    setIsAiLoadingTextVisible(true);
    setStep(4);
    loadingMessageTimerRef.current = window.setInterval(() => {
      setIsAiLoadingTextVisible(false);
      if (loadingTextFadeTimerRef.current) {
        window.clearTimeout(loadingTextFadeTimerRef.current);
      }
      loadingTextFadeTimerRef.current = window.setTimeout(() => {
        loadingTextFadeTimerRef.current = null;
        setLoadingMessageIndex((currentIndex) => {
          const nextIndex = (currentIndex + 1) % nextLoadingMessages.length;
          setAiLoadingMessage(nextLoadingMessages[nextIndex]);
          return nextIndex;
        });
        setIsAiLoadingTextVisible(true);
      }, 240);
    }, 1800);
  };

  const finishRecommendationLoadingState = () => {
    if (loadingMessageTimerRef.current) {
      window.clearInterval(loadingMessageTimerRef.current);
      loadingMessageTimerRef.current = null;
    }
    if (loadingCompleteTimerRef.current) {
      window.clearTimeout(loadingCompleteTimerRef.current);
      loadingCompleteTimerRef.current = null;
    }
    if (loadingTextFadeTimerRef.current) {
      window.clearTimeout(loadingTextFadeTimerRef.current);
      loadingTextFadeTimerRef.current = null;
    }
    const elapsed = Date.now() - loadingStartedAtRef.current;
    const delay = Math.max(0, 850 - elapsed);

    loadingCompleteTimerRef.current = window.setTimeout(() => {
      loadingCompleteTimerRef.current = null;
      setIsAiLoadingTextVisible(true);
      setStep(5);
    }, delay);
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
    preferenceText: string,
  ) => {
    const response = await fetch('/api/ai/recommend-activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preference,
        preferenceText,
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
        finishRecommendationLoadingState();
        return;
      }

      if (rankedCandidates.length < 3) {
        if (!isLatestRequest()) return;
        const recommendations = rankedCandidates.map(({ activity }) => ({ activity }));
        const notice = '조건에 가까운 활동을 먼저 보여드려요.';
        rememberRecommendationResult(cacheKey, { recommendations, notice });
        setAiRecommendedActivities(recommendations);
        setAiRecommendationNotice(notice);
        finishRecommendationLoadingState();
        return;
      }

      let nextRecommendedActivities = fallbackCandidates.map(({ activity }) => ({ activity }));
      let nextRecommendationNotice = 'AI 추천 연결이 불안정해 검색 결과 상위 활동을 보여드려요.';

      try {
        const recommendations = await requestAIRecommendations(parsedPreference, rankedCandidates, effectivePreferenceText);
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
      finishRecommendationLoadingState();
    } catch (error) {
      if (!isLatestRequest()) return;
      console.error('AI preference parse failed', error);
      setAiRecommendedActivities([]);
      setAiRecommendationNotice('');
      finishRecommendationLoadingState();
    } finally {
      if (isLatestRequest()) {
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

  const recommendationDisplayItems = useMemo(
    () => buildRecommendationDisplayItems(aiRecommendedActivities, mood),
    [aiRecommendedActivities, mood],
  );
  const recommendationCount = recommendationDisplayItems.length;
  const canMoveRecommendation = recommendationCount > 1;

  useEffect(() => {
    setActiveRecommendationIndex(0);
    setDeckDragOffset(0);
    setIsDeckDragging(false);
    setDeckTransitionDirection(null);
    setIsDeckEntering(false);
    setExitingRecommendationIndex(null);
    if (deckDragFrameRef.current) {
      window.cancelAnimationFrame(deckDragFrameRef.current);
      deckDragFrameRef.current = null;
    }
  }, [recommendationCount]);

  const moveRecommendation = (
    direction: 1 | -1 = 1,
    indexDelta: 1 | -1 = direction,
    interactionType: 'button' | 'swipe' = 'button',
  ) => {
    // Use ref-based lock to guard against stale-closure double calls
    // (state-based deckTransitionDirection is async — two synchronous calls both see null)
    if (!canMoveRecommendation || deckTransitionActiveRef.current) return;
    deckTransitionActiveRef.current = true;

    setIsDeckDragging(false);
    // For swipe: keep deckDragOffset at its current position so the exit animation
    // starts from where the finger left off, not from center. Reset in timeout.
    if (interactionType !== 'swipe') {
      setDeckDragOffset(0);
      deckPendingDragOffsetRef.current = 0;
    }
    deckDragVelocityXRef.current = 0;
    setDeckInteractionType(interactionType);
    setExitingRecommendationIndex(interactionType === 'swipe' ? activeRecommendationIndex : null);
    setDeckTransitionDirection(direction);
    setIsDeckEntering(false);
    setActiveRecommendationIndex((current) =>
      (current + indexDelta + recommendationCount) % recommendationCount,
    );

    window.setTimeout(() => {
      deckTransitionActiveRef.current = false;
      setDeckDragOffset(0);
      deckPendingDragOffsetRef.current = 0;
      deckDragVelocityXRef.current = 0;
      setDeckTransitionDirection(null);
      setDeckInteractionType(null);
      setIsDeckEntering(false);
      setExitingRecommendationIndex(null);
      deckSuppressClickRef.current = false;
    }, interactionType === 'swipe' ? 360 : 320);
  };

  const handleDeckPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (recommendationCount <= 1) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    deckSwipeHandledRef.current = false;
    deckDragStartXRef.current = event.clientX;
    deckDragStartYRef.current = event.clientY;
    deckDragLastXRef.current = event.clientX;
    deckDragLastTimeRef.current = event.timeStamp || performance.now();
    deckDragVelocityXRef.current = 0;
    deckPendingDragOffsetRef.current = 0;
    deckSuppressClickRef.current = false;
    setIsDeckDragging(true);
    setDeckDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDeckPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDeckDragging) return;
    const rawOffset = event.clientX - deckDragStartXRef.current;
    const verticalOffset = event.clientY - deckDragStartYRef.current;
    const horizontalLimit = typeof window !== 'undefined' ? window.innerWidth : 430;
    const nextOffset = Math.max(Math.min(rawOffset, horizontalLimit), -horizontalLimit);
    const now = event.timeStamp || performance.now();
    const elapsed = Math.max(now - deckDragLastTimeRef.current, 1);

    deckDragVelocityXRef.current = (event.clientX - deckDragLastXRef.current) / elapsed;
    deckDragLastXRef.current = event.clientX;
    deckDragLastTimeRef.current = now;
    deckPendingDragOffsetRef.current = nextOffset;

    if (Math.abs(rawOffset) > Math.abs(verticalOffset) && Math.abs(rawOffset) > 4) {
      event.preventDefault();
    }

    if (!deckDragFrameRef.current) {
      deckDragFrameRef.current = window.requestAnimationFrame(() => {
        deckDragFrameRef.current = null;
        setDeckDragOffset(deckPendingDragOffsetRef.current);
      });
    }
  };

  const settleDeckDrag = (shouldOpenOnTap = false) => {
    if (!isDeckDragging) return;
    // Prevent pointerUp + pointerCancel from both processing the same gesture
    if (deckSwipeHandledRef.current) return;
    deckSwipeHandledRef.current = true;
    if (deckDragFrameRef.current) {
      window.cancelAnimationFrame(deckDragFrameRef.current);
      deckDragFrameRef.current = null;
    }
    const cardWidth = 332;
    const threshold = cardWidth * 0.25;
    const finalDragOffset = deckPendingDragOffsetRef.current;
    const dragDistance = Math.abs(finalDragOffset);
    const velocityX = deckDragVelocityXRef.current;

    // Use 12px tap threshold instead of 8px for Android compatibility
    // (Android touch events can report slight movement even for taps)
    if (dragDistance > 12) {
      deckSuppressClickRef.current = true;
    }

    if ((dragDistance >= threshold || Math.abs(velocityX) > 0.45) && canMoveRecommendation) {
      const direction = finalDragOffset < 0 || velocityX < -0.45 ? 1 : -1;
      setDeckDragOffset(finalDragOffset);
      moveRecommendation(direction, direction, 'swipe');
      return;
    }

    if (shouldOpenOnTap && dragDistance <= 12) {
      const activeRecommendation = recommendationDisplayItems[activeRecommendationIndex];
      const activeActivity = activeRecommendation
        ? { ...activeRecommendation.activity, imageUrl: activeRecommendation.imageUrl }
        : null;
      if (activeActivity) {
        deckSuppressClickRef.current = true;
        setDeckDragOffset(0);
        deckPendingDragOffsetRef.current = 0;
        deckDragVelocityXRef.current = 0;
        setIsDeckDragging(false);
        onOpenActivity(activeActivity);
        window.setTimeout(() => {
          deckSuppressClickRef.current = false;
        }, 120);
        return;
      }
    }

    setDeckDragOffset(0);
    deckPendingDragOffsetRef.current = 0;
    deckDragVelocityXRef.current = 0;
    setIsDeckDragging(false);
    if (dragDistance > 12) {
      window.setTimeout(() => {
        deckSuppressClickRef.current = false;
      }, 120);
    }
  };

  const activeLoadingConditionIndex = Math.min(loadingMessageIndex, loadingConditionBubbles.length);

  if (!shouldRender) return null;

  return (
    <div className="bottom-sheet-viewport z-[70] flex items-end justify-center overflow-x-hidden overscroll-x-none">
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
        className={`bottom-sheet-panel bottom-sheet-panel-tall relative flex w-full max-w-[430px] transform-gpu flex-col overflow-hidden overflow-x-hidden overscroll-x-none rounded-t-[28px] border border-[#e2e8f7] bg-[#fbfcff] shadow-[0_-18px_48px_rgba(87,101,145,0.16)] transition-[transform,opacity] will-change-transform ${
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
          className={`bottom-sheet-scrollable relative min-h-0 flex-1 overflow-x-hidden overscroll-x-none px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))] ${
            step === 4
              ? 'overflow-y-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_50%_88%,rgba(192,132,252,0.18),transparent_38%),linear-gradient(180deg,#faf8ff_0%,#fffefe_46%,#f3f0ff_100%)]'
              : 'overflow-y-auto'
          }`}
          data-bottom-sheet-scrollable="true"
        >
          <div className={`${step === 4 ? 'mb-3' : 'mb-5'} flex gap-1.5`}>
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

          {step !== 4 && selectedSummary.length > 0 && (
            <div className={`${step === 4 ? 'mb-3' : 'mb-6'} flex flex-wrap gap-2`}>
              {selectedSummary.map((item) => (
                <button
                  key={`${item.targetStep}-${item.label}`}
                  type="button"
                  onClick={() => handleSummaryClick(item.targetStep)}
                  disabled={item.targetStep === step}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium shadow-[0_8px_18px_rgba(94,110,180,0.07)] transition-all active:scale-[0.98] ${
                    item.targetStep === step
                      ? 'cursor-default border-[#e5e8f6] bg-white/56 text-[#7A7F87]'
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
                <h2 className="mb-6 whitespace-nowrap text-[24px] font-semibold leading-tight text-[#303850]">
                  어디에서 활동을 찾아볼까요?
                </h2>
                <input
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') confirmRegion();
                  }}
                  onFocus={(event) => {
                    window.setTimeout(() => {
                      event.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }, 320);
                  }}
                  placeholder="어디에서 활동을 찾을까요?"
                  className={aiInputClassName}
                />
                <p className="mb-2 text-[12px] font-medium text-[#7A7F87]">
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
                    <span className="rounded-full border border-[#e2e6fb] bg-white/60 px-3 py-2 text-[12px] font-medium text-[#7A7F87]">
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
                <h2 className="mb-6 whitespace-nowrap text-[24px] font-semibold leading-tight text-[#303850]">
                  언제 시간이 괜찮으세요?
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
                      <p className="mt-1 text-[11.5px] text-[#7A7F87]">
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
                        : 'bg-transparent text-[#7A7F87]'
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
                        className="-mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-[#7A7F87] transition-colors hover:bg-white hover:text-[#68738f] active:scale-95"
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
                <h2 className="mb-6 whitespace-nowrap text-[24px] font-semibold leading-tight text-[#303850]">
                  얼마나 참여할 수 있나요?
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
                <h2 className="mb-6 whitespace-nowrap text-[24px] font-semibold leading-tight text-[#303850]">
                  어떤 활동이면 좋을까요?
                </h2>
                <input
                  ref={moodInputRef}
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
                  onFocus={keepMoodInputVisible}
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
              <section className="-mx-5 -mb-[calc(24px+env(safe-area-inset-bottom))] flex min-h-[calc(var(--sison-sheet-tall-height)-150px)] overflow-hidden px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-2 text-center">
                <div className="mx-auto flex w-full max-w-[340px] flex-col items-center justify-center">

                  {/* Falling condition cards */}
                  <div className="mb-8 flex h-[116px] w-full items-center justify-center" aria-hidden="true">
                    <div className="flex items-center justify-center gap-2">
                      {loadingConditionBubbles.map((item, i) => (
                        <div key={item.label} style={getFallingCardStyle(fallingPhase, i)}>
                          <div className="flex h-[116px] w-[76px] flex-col items-center justify-center rounded-3xl border border-[#e0d8ff] bg-white/92 px-2 py-3 text-center shadow-[0_8px_22px_rgba(100,70,200,0.10)]">
                            <span className="mb-2.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#f3f0ff] text-[#8b5cf6] [&_svg]:h-[22px] [&_svg]:w-[22px]">
                              {item.icon}
                            </span>
                            <p className="line-clamp-2 overflow-hidden text-[10px] font-semibold leading-[1.35] text-[#514165]">
                              {item.label}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="min-h-[52px]">
                    <p
                      className={`flex min-h-[48px] max-w-full items-center justify-center gap-1.5 whitespace-nowrap text-[clamp(13.5px,3.65vw,16px)] font-bold leading-6 text-[#6f4bd8] transition-all duration-[260ms] ${
                        isAiLoadingTextVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                      }`}
                    >
                      <Sparkles className="h-4 w-4 flex-shrink-0 translate-y-[-1px]" strokeWidth={2.1} />
                      <span>가장 잘 맞는 활동을 찾고 있어요…</span>
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium leading-5 text-[#756b89]">
                      선택한 조건을 분석하고 있어요
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5 h-2 w-[78%] overflow-hidden rounded-full bg-[#8b5cf6]/14">
                    <span
                      aria-hidden="true"
                      className="sison-ai-loading-progress block h-full w-[48%] rounded-full bg-[linear-gradient(90deg,#8b5cf6,#c084fc,#a78bfa)]"
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="pt-0">
                {aiRecommendationNotice && (
                  <p className="mb-4 rounded-2xl border border-[#e2e6fb] bg-white/72 px-4 py-3 text-[12.5px] leading-relaxed text-[#69718d]">
                    {aiRecommendationNotice}
                  </p>
                )}
                {recommendationDisplayItems.length > 0 ? (
                  <div>
                    {/* Clip horizontal overflow from exit/enter card animations to prevent
                        Android horizontal scroll. overflowX clip does not affect vertical overflow. */}
                    <div className="-mx-5 px-5" style={{ overflowX: 'clip', overflowY: 'visible' }}>
                    <div
                      className="relative z-10 mx-auto h-[364px] max-w-[332px] touch-pan-y select-none overflow-visible overscroll-x-none [touch-action:pan-y] [-webkit-user-select:none]"
                      onPointerDown={handleDeckPointerDown}
                      onPointerMove={handleDeckPointerMove}
                      onPointerUp={() => settleDeckDrag(true)}
                      onPointerCancel={() => settleDeckDrag(false)}
                    >
                      {recommendationDisplayItems.map(({ activity, reason, imageUrl, moodTip }, index) => {
                        const depth = recommendationCount > 0
                          ? (index - activeRecommendationIndex + recommendationCount) % recommendationCount
                          : 0;
                        const isExitingCard = exitingRecommendationIndex === index;
                        const isActiveCard = depth === 0 && !isExitingCard;
                        const isEnteringCard = isActiveCard && isDeckEntering;
                        const reasonText = getEditorialRecommendationReason(activity, reason, index, mood);
                        const displayActivity = { ...activity, imageUrl };

                        return (
                          <article
                            key={`${activity.id || activity.progrmRegistNo || activity.title}-${activity.date}`}
                            role="button"
                            tabIndex={isActiveCard ? 0 : -1}
                            aria-label={`${activity.title} 상세 보기`}
                            onClick={() => {
                              if (deckSuppressClickRef.current) {
                                deckSuppressClickRef.current = false;
                                return;
                              }
                              if (isActiveCard && Math.abs(deckPendingDragOffsetRef.current) < 8) onOpenActivity(displayActivity);
                            }}
                            onKeyDown={(event) => {
                              if (!isActiveCard) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onOpenActivity(displayActivity);
                              }
                            }}
                            className={`absolute inset-x-0 top-4 h-[342px] overflow-hidden rounded-[24px] border border-white/80 bg-white outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/45 ${
                              isActiveCard ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                            }`}
                            style={
                              isExitingCard && deckTransitionDirection && deckInteractionType === 'swipe'
                                ? getExitingDeckCardStyle(deckTransitionDirection)
                                : getDeckCardStyle(
                                  depth,
                                  deckDragOffset,
                                  isDeckDragging,
                                  deckTransitionDirection,
                                  isEnteringCard,
                                  deckInteractionType,
                                )
                            }
                            aria-hidden={!isActiveCard}
                          >
                            <div className="block h-full w-full text-left transition-transform duration-150 active:scale-[0.99]">
                              <div className="relative h-[148px] overflow-hidden bg-[#f3f0ff]">
                                <img
                                  src={imageUrl}
                                  alt={activity.title}
                                  draggable={false}
                                  className="pointer-events-none h-full w-full select-none object-cover [-webkit-user-drag:none] [-webkit-user-select:none]"
                                  loading={index === activeRecommendationIndex ? 'eager' : 'lazy'}
                                  decoding="async"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/28 to-transparent" aria-hidden="true" />
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleSavedActivity(displayActivity);
                                  }}
                                  aria-label={isActivitySaved(displayActivity) ? '저장 취소' : '활동 저장'}
                                  className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all active:scale-95 ${
                                    isActivitySaved(displayActivity)
                                      ? 'border-[#d8c8ff] bg-white/92 text-[#8b5cf6] shadow-[0_6px_14px_rgba(139,92,246,0.16)]'
                                      : 'border-white/55 bg-white/82 text-[#6f6680] shadow-[0_5px_12px_rgba(38,28,66,0.10)]'
                                  }`}
                                >
                                  <Bookmark
                                    className={`h-[19px] w-[19px] ${isActivitySaved(displayActivity) ? 'fill-[#a78bfa] text-[#8b5cf6]' : 'text-[#6f6680]'}`}
                                    strokeWidth={1.9}
                                  />
                                </button>
                              </div>

                              <div className="px-4 pb-3.5 pt-3.5">
                                <div className="min-h-[44px]">
                                  <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.28] text-[#242424]">
                                    {activity.title}
                                  </h3>
                                </div>

                                <div className="mt-3 flex min-h-[30px] items-center rounded-full border border-[#e5dbff] bg-[#f3f0ff]/74 px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                                  <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold leading-none text-[#7150c8]">
                                    <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 translate-y-[-0.5px]" strokeWidth={2} />
                                    <span className="line-clamp-1">{getShortRecommendationReason(reasonText || moodTip)}</span>
                                  </p>
                                </div>

                                <div className="mt-3 space-y-1.5">
                                  <p className="flex items-center text-[12.5px] font-medium leading-[18px] text-[#62616c]">
                                    <span className="flex w-6 flex-shrink-0 items-center justify-center">
                                      <MapPin className="h-3.5 w-3.5 text-[#8b5cf6]" strokeWidth={2} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{getActivityPlaceLabel(activity)}</span>
                                  </p>
                                  <p className="flex items-center text-[12.5px] font-medium leading-[18px] text-[#62616c]">
                                    <span className="flex w-6 flex-shrink-0 items-center justify-center">
                                      <Clock className="h-3.5 w-3.5 text-[#a78bfa]" strokeWidth={2} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{getActivityTimeLabel(activity)}</span>
                                  </p>
                                  <p className="flex items-center text-[12.5px] font-medium leading-[18px] text-[#62616c]">
                                    <span className="flex w-6 flex-shrink-0 items-center justify-center">
                                      <Calendar className="h-3.5 w-3.5 text-[#c084fc]" strokeWidth={2} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{getActivityDateLabel(activity)}</span>
                                  </p>
                                </div>

                                <div className="mt-2.5 flex justify-end">
                                  <span className="rounded-full bg-[#f3f0ff] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#7c3aed]">
                                    {getActivityStatusLabel(activity)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    </div>{/* overflow-x clip wrapper */}

                    <div className="relative z-[60] mt-7 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => moveRecommendation(-1, -1, 'button')}
                        disabled={!canMoveRecommendation || deckTransitionDirection !== null}
                        className="relative z-[61] flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.08)] text-[#8b5cf6] transition-all hover:bg-[rgba(139,92,246,0.15)] active:scale-95 disabled:opacity-30"
                        aria-label="이전 추천 활동"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                      <div className="flex min-w-[92px] items-center justify-center gap-2" aria-label={`${activeRecommendationIndex + 1}번째 추천 활동`}>
                        <div className="flex items-center gap-2">
                          {recommendationDisplayItems.map((item, index) => (
                            <span
                              key={`${item.activity.id || item.activity.title}-indicator`}
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                index === activeRecommendationIndex ? 'w-7 bg-[linear-gradient(90deg,#8b5cf6,#c084fc)]' : 'w-2.5 bg-[#ddd2ff]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => moveRecommendation(1, 1, 'button')}
                        disabled={!canMoveRecommendation || deckTransitionDirection !== null}
                        className="relative z-[61] flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.08)] text-[#8b5cf6] transition-all hover:bg-[rgba(139,92,246,0.15)] active:scale-95 disabled:opacity-30"
                        aria-label="다음 추천 활동"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#e2e6fb] bg-white/78 px-4 py-6 text-center">
                    <p className="text-[14px] font-semibold text-[#303850]">조건에 맞는 활동이 아직 없어요</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#7A7F87]">
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
