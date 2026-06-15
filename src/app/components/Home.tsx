import { useEffect, useState } from 'react';
import { Bell, Bookmark, Calendar, Clock, MapPin } from 'lucide-react';
import { formatActivityDate, getActivityStatus, getRecruitmentDday } from '../activityFormatters';
import { normalizeCapacity } from '../activityCapacity';
import { avoidConsecutiveActivityImages, logActivityImageMappings, withResolvedActivityImage } from '../utils/activityImage';
import { EnhancedSearchCard } from './EnhancedSearchCard';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { NotificationSheet } from './NotificationSheet';
import { HomeAIRecommendationFlow } from './HomeAIRecommendationFlow';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';
import type { RecentSearchItem, SearchFormState } from '../searchState';

interface HomeProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  onSearchSubmit: (values: SearchFormState) => void;
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
  recentSearches: RecentSearchItem[];
}

type RecentActivity = ActivitySaveRecord & {
  recentLabel?: string;
  recentSortDate?: string;
};

interface VolunteerApiActivity {
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
  recentSortBasis?: 'registration' | 'recruitmentStart' | 'responseOrder';
  recentSortDate?: string;
  progrmRegistNo: string;
}

interface VolunteerApiResponse {
  ok: boolean;
  items: VolunteerApiActivity[];
  error?: string;
}

interface HomeVolunteerApiResponse {
  ok: boolean;
  cacheStatus?: 'hit' | 'fallback' | 'error';
  generatedAt: string | null;
  sections: {
    lightweight: VolunteerApiActivity[];
    monthly: VolunteerApiActivity[];
    festival: VolunteerApiActivity[];
  };
  error?: string;
}

type ActivitySectionState = 'loading' | 'error' | 'empty' | 'success';

const activityStateMessages: Record<Exclude<ActivitySectionState, 'success'>, { title: string; description?: string }> = {
  loading: {
    title: '활동을 불러오는 중이에요',
  },
  error: {
    title: '활동을 불러오지 못했어요',
    description: '잠시 후 다시 시도해주세요',
  },
  empty: {
    title: '조건에 맞는 활동이 없어요',
    description: '다른 지역이나 날짜로 찾아보세요',
  },
};

const getActivitySectionState = (
  isLoading: boolean,
  hasError: boolean,
  activities: ActivitySaveRecord[],
): ActivitySectionState => {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (activities.length === 0) return 'empty';
  return 'success';
};

const getRecruitingLabel = (activity: VolunteerApiActivity) =>
  activity.category || '기타';

const isWeeklySection = (sectionTitle: string) => sectionTitle === '이달의 활동';
const isFestivalSection = (sectionTitle: string) => sectionTitle === '축제 · 행사 활동';

function ActivityState({
  state,
  emptyTitle,
}: {
  state: Exclude<ActivitySectionState, 'success'>;
  emptyTitle?: string;
}) {
  const message = activityStateMessages[state];

  return (
    <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-5 text-center shadow-[0_2px_12px_rgba(39,45,40,0.035)]">
      <p className="text-[13px] font-medium text-[#8f8f8f]">{state === 'empty' && emptyTitle ? emptyTitle : message.title}</p>
      {message.description && (
        <p className="mt-1.5 text-[12px] font-normal text-[#aaa]">{message.description}</p>
      )}
    </div>
  );
}

const mapVolunteerApiActivityToRecentActivity = (activity: VolunteerApiActivity): RecentActivity =>
  withResolvedActivityImage({
    id: activity.id || activity.progrmRegistNo,
    imageUrl: activity.imageUrl,
    title: activity.title || '제목 확인 필요',
    location: activity.location || activity.region || '장소 확인 필요',
    recruitmentStartDate: activity.recruitmentStartDate,
    recruitmentEndDate: activity.recruitmentEndDate,
    activityStartDate: activity.activityStartDate,
    activityEndDate: activity.activityEndDate,
    activityDate: activity.activityStartDate === activity.activityEndDate ? activity.activityStartDate : undefined,
    date: activity.activityStartDate,
    time: activity.time || '시간 확인 필요',
    status: activity.status,
    isRecruiting: ['recruiting', 'todayDeadline'].includes(getActivityStatus({
      date: activity.activityStartDate,
      time: activity.time,
      recruitmentEndDate: activity.recruitmentEndDate,
    })),
    description: activity.organization
      ? `${activity.organization}에서 모집하는 1365 봉사활동입니다.`
      : '1365에서 제공한 봉사활동입니다.',
    materials: '1365 상세 페이지에서 확인해주세요.',
    capacity: normalizeCapacity(activity.capacity),
    currentParticipants: normalizeCapacity(activity.currentParticipants),
    volunteerTarget: activity.volunteerTarget || undefined,
    volunteerType: activity.volunteerType || undefined,
    recommendation: '현재 모집중인 1365 활동 중 여행 흐름에 맞는지 살펴보세요.',
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
    recentLabel: getRecruitingLabel(activity),
    recentSortDate: activity.recentSortDate,
  });

const HOME_CACHE_TTL = 5 * 60 * 1000;
interface HomeActivityCache {
  timestamp: number;
  lightweight: RecentActivity[];
  monthly: RecentActivity[];
  festival: RecentActivity[];
}
let homeActivityCache: HomeActivityCache | null = null;

const heroImages = [
  {
    src: '/home-hero-1.png',
    alt: '봄날 강변 산책길을 따라 여행하는 사람들',
  },
  {
    src: '/home-hero-2.png',
    alt: '바닷가에서 함께 해변을 정리하는 사람들',
  },
  {
    src: '/home-hero-3.png',
    alt: '숲길을 걸으며 자연을 정리하는 사람들',
  },
];

interface HiddenPlaceActivityCardProps {
  activity: ActivitySaveRecord;
  isSaved: boolean;
  onBookmarkClick: () => void;
  onClick: () => void;
}

function HiddenPlaceActivityCard({
  activity,
  isSaved,
  onBookmarkClick,
  onClick,
}: HiddenPlaceActivityCardProps) {
  const dateTime = [formatActivityDate(activity.date), activity.time].filter(Boolean).join(' · ');
  const recruitmentMetadata = getRecruitmentDday(activity);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="group relative h-[144px] w-full cursor-pointer overflow-hidden rounded-[1.75rem] bg-[#f2f0ea] shadow-[0_8px_24px_rgba(40,45,42,0.08)] transition-all active:scale-[0.985]"
    >
      <img
        src={activity.imageUrl}
        alt={activity.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,25,23,0.72)_0%,rgba(21,25,23,0.46)_44%,rgba(21,25,23,0.10)_78%,rgba(21,25,23,0.04)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,22,20,0.16)_0%,rgba(18,22,20,0.02)_42%,rgba(18,22,20,0.20)_100%)]" />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBookmarkClick();
        }}
        aria-label={isSaved ? '저장 취소' : '활동 저장'}
        className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-[#5a5a5a] shadow-[0_6px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:bg-white active:scale-95"
      >
        <Bookmark
          className={`h-4 w-4 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
          strokeWidth={2}
        />
      </button>

      <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center px-4 py-4 text-white">
        <h4 className="line-clamp-2 pr-[52px] text-[15px] font-medium leading-[1.3] text-white drop-shadow-sm">
          {activity.title}
        </h4>
        <div className="mt-2 space-y-1.5">
          {dateTime && (
            <div className="flex w-full min-w-0 items-center gap-1.5 text-[11.5px] font-normal leading-none text-white/78">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-white/74" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">{dateTime}</span>
            </div>
          )}
          {activity.location && (
            <div className="flex w-full min-w-0 items-center gap-1.5 text-[11.5px] font-normal leading-none text-white/78">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-white/72" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">{activity.location}</span>
            </div>
          )}
          {recruitmentMetadata && (
            <span className="inline-flex w-fit rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-normal leading-none text-white/78 backdrop-blur-sm">
              {recruitmentMetadata}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface RecentTimelineActivityCardProps {
  activity: RecentActivity;
  isSaved: boolean;
  index: number;
  isLast: boolean;
  onBookmarkClick: () => void;
  onClick: () => void;
}

function RecentTimelineActivityCard({
  activity,
  isSaved,
  index,
  isLast,
  onBookmarkClick,
  onClick,
}: RecentTimelineActivityCardProps) {
  const dotColors = ['bg-[#6fa985]', 'bg-[#5f9fc9]', 'bg-[#8270bd]'];
  const registeredTextColors = ['text-[#6fa985]', 'text-[#5f9fc9]', 'text-[#8270bd]'];
  const registeredLabel = activity.recentLabel || '새로 열린 일정';
  const registeredTextColor = registeredTextColors[index % registeredTextColors.length];
  const dateTime = [formatActivityDate(activity.date), activity.time].filter(Boolean).join(' · ');
  const recruitmentMetadata = getRecruitmentDday(activity);

  return (
    <div className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center pt-2">
        <span className={`relative z-10 h-2.5 w-2.5 rounded-full ${dotColors[index % dotColors.length]} shadow-[0_0_0_4px_rgba(255,255,255,0.92)]`} />
        {!isLast && <span className="absolute top-5 bottom-[-18px] w-px bg-[#e4e1da]" />}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className="w-full cursor-pointer rounded-2xl border border-black/[0.04] bg-white px-4 pb-3 pt-2.5 shadow-[0_2px_12px_rgba(39,45,40,0.035)] transition-all active:scale-[0.985]"
      >
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className={`text-[12px] font-medium leading-none ${registeredTextColor}`}>
            {registeredLabel}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBookmarkClick();
            }}
            aria-label={isSaved ? '저장 취소' : '활동 저장'}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#5a5a5a] transition-colors hover:bg-[#f8f8f5] active:scale-95"
          >
            <Bookmark
              className={`h-4 w-4 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
              strokeWidth={2}
            />
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-3">
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-[15px] font-medium leading-[1.3] text-[#2a2a2a]">
              {activity.title}
            </h4>

            <div className="mt-3 space-y-1.5">
              {dateTime && (
                <div className="flex items-center gap-2 text-[12.5px] font-normal leading-none text-[#8f8f8f]">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#a8d5ba]" strokeWidth={2} />
                  <span className="line-clamp-1">{dateTime}</span>
                </div>
              )}
              {activity.location && (
                <div className="flex items-center gap-2 text-[12.5px] font-normal leading-none text-[#8f8f8f]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#c9897e]" strokeWidth={2} />
                  <span className="line-clamp-1">{activity.location}</span>
                </div>
              )}
              {recruitmentMetadata && (
                <div className="flex items-center gap-2 text-[12px] font-normal leading-none text-[#8f8f8f]">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#b8b2aa]" strokeWidth={1.8} />
                  <span>{recruitmentMetadata}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-[82px] overflow-hidden rounded-xl bg-[#f3f0ea]">
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Home({ onNavigate, onSearchSubmit, isActivitySaved, onToggleSavedActivity, recentSearches }: HomeProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleCountOpen, setIsPeopleCountOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAIRecommendationFlowOpen, setIsAIRecommendationFlowOpen] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [apiLightweightActivities, setApiLightweightActivities] = useState<RecentActivity[]>([]);
  const [isLightweightActivitiesLoading, setIsLightweightActivitiesLoading] = useState(true);
  const [hasLightweightActivitiesError, setHasLightweightActivitiesError] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isRecentActivitiesLoading, setIsRecentActivitiesLoading] = useState(true);
  const [hasRecentActivitiesError, setHasRecentActivitiesError] = useState(false);
  const [hiddenActivities, setHiddenActivities] = useState<RecentActivity[]>([]);
  const [isHiddenActivitiesLoading, setIsHiddenActivitiesLoading] = useState(true);
  const [hasHiddenActivitiesError, setHasHiddenActivitiesError] = useState(false);

  useEffect(() => {
    heroImages.forEach((image) => {
      const preloadImage = new Image();
      preloadImage.src = image.src;
    });
  }, []);

  useEffect(() => {
    const heroTimer = window.setInterval(() => {
      setActiveHeroIndex((currentIndex) => (currentIndex + 1) % heroImages.length);
    }, 7000);

    return () => window.clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    const cached = homeActivityCache;
    if (cached && Date.now() - cached.timestamp < HOME_CACHE_TTL) {
      setApiLightweightActivities(cached.lightweight);
      setRecentActivities(cached.monthly);
      setHiddenActivities(cached.festival);
      setIsLightweightActivitiesLoading(false);
      setIsRecentActivitiesLoading(false);
      setIsHiddenActivitiesLoading(false);
      return;
    }

    const abortController = new AbortController();

    const mapHomeSectionActivities = (items: VolunteerApiActivity[] | undefined): RecentActivity[] =>
      Array.isArray(items)
        ? avoidConsecutiveActivityImages(items.map(mapVolunteerApiActivityToRecentActivity).slice(0, 3))
        : [];

    const fetchSection = async (sort: string, size: string): Promise<RecentActivity[]> => {
      const params = new URLSearchParams({ keyword: '', page: '1', size, sort });
      const response = await fetch(`/api/volunteer/search?${params.toString()}`, {
        signal: abortController.signal,
      });
      const payload = await response.json() as VolunteerApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || '활동을 불러오지 못했어요.');
      return mapHomeSectionActivities(payload.items);
    };

    const fetchCachedHomeSections = async () => {
      const response = await fetch('/api/volunteer/home', {
        signal: abortController.signal,
      });
      const payload = await response.json() as HomeVolunteerApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || '홈 활동을 불러오지 못했어요.');

      return {
        lightweight: mapHomeSectionActivities(payload.sections?.lightweight),
        monthly: mapHomeSectionActivities(payload.sections?.monthly),
        festival: mapHomeSectionActivities(payload.sections?.festival),
      };
    };

    const fetchAllHomeActivities = async () => {
      try {
        const cachedSections = await fetchCachedHomeSections();
        if (abortController.signal.aborted) return;

        setApiLightweightActivities(cachedSections.lightweight);
        setRecentActivities(cachedSections.monthly);
        setHiddenActivities(cachedSections.festival);
        setHasLightweightActivitiesError(false);
        setHasRecentActivitiesError(false);
        setHasHiddenActivitiesError(false);
        homeActivityCache = { timestamp: Date.now(), ...cachedSections };
        setIsLightweightActivitiesLoading(false);
        setIsRecentActivitiesLoading(false);
        setIsHiddenActivitiesLoading(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }

      const [lightweightResult, monthlyResult, festivalResult] = await Promise.allSettled([
        fetchSection('lightweight', '30'),
        fetchSection('monthly', '30'),
        fetchSection('festival', '50'),
      ]);

      if (abortController.signal.aborted) return;

      const lightweight = lightweightResult.status === 'fulfilled' ? lightweightResult.value : [];
      const monthly = monthlyResult.status === 'fulfilled' ? monthlyResult.value : [];
      const festival = festivalResult.status === 'fulfilled' ? festivalResult.value : [];

      if (lightweightResult.status === 'fulfilled') {
        setApiLightweightActivities(lightweight);
        setHasLightweightActivitiesError(false);
      } else if (!(lightweightResult.reason instanceof DOMException && lightweightResult.reason.name === 'AbortError')) {
        setApiLightweightActivities([]);
        setHasLightweightActivitiesError(true);
      }

      if (monthlyResult.status === 'fulfilled') {
        setRecentActivities(monthly);
        setHasRecentActivitiesError(false);
      } else if (!(monthlyResult.reason instanceof DOMException && monthlyResult.reason.name === 'AbortError')) {
        setRecentActivities([]);
        setHasRecentActivitiesError(true);
      }

      if (festivalResult.status === 'fulfilled') {
        setHiddenActivities(festival);
        setHasHiddenActivitiesError(false);
      } else if (!(festivalResult.reason instanceof DOMException && festivalResult.reason.name === 'AbortError')) {
        setHiddenActivities([]);
        setHasHiddenActivitiesError(true);
      }

      if (
        lightweightResult.status === 'fulfilled' &&
        monthlyResult.status === 'fulfilled' &&
        festivalResult.status === 'fulfilled'
      ) {
        homeActivityCache = { timestamp: Date.now(), lightweight, monthly, festival };
      }

      setIsLightweightActivitiesLoading(false);
      setIsRecentActivitiesLoading(false);
      setIsHiddenActivitiesLoading(false);
    };

    void fetchAllHomeActivities();
    return () => abortController.abort();
  }, []);

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const formatDateRangeFull = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} - ${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;
  };

  const handleSearch = () => {
    onSearchSubmit({
      destination: destination.trim(),
      startDate,
      endDate,
      dateRangeLabel: formatDateRangeFull(),
      peopleCount,
    });
  };

  const handleDateConfirm = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleDateClear = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handlePeopleConfirm = (count: number) => {
    setPeopleCount(count);
  };

  const lightweightSectionActivities: ActivitySaveRecord[] = isLightweightActivitiesLoading
    ? []
    : apiLightweightActivities;
  const weeklySectionActivities = recentActivities.slice(0, 3);
  const hiddenSectionActivities = hiddenActivities.slice(0, 3);

  const activitySections = [
    {
      title: '가벼운 활동',
      description: '여행 중 산책하듯 참여하기 좋아요',
      activities: lightweightSectionActivities,
      state: getActivitySectionState(
        isLightweightActivitiesLoading,
        hasLightweightActivitiesError,
        lightweightSectionActivities,
      ),
    },
    {
      title: '이달의 활동',
      description: '이번 달에 참여할 수 있는 활동이에요',
      activities: weeklySectionActivities,
      state: getActivitySectionState(
        isRecentActivitiesLoading,
        hasRecentActivitiesError,
        weeklySectionActivities,
      ),
      emptyTitle: '이달에 참여할 수 있는 활동이 없어요',
    },
    {
      title: '축제 · 행사 활동',
      description: '여행지의 특별한 순간에 함께해요',
      activities: hiddenSectionActivities,
      state: getActivitySectionState(
        isHiddenActivitiesLoading,
        hasHiddenActivitiesError,
        hiddenSectionActivities,
      ),
      emptyTitle: '축제 · 행사 활동이 아직 없어요',
    },
  ];
  const allHomeActivities = [
    ...lightweightSectionActivities,
    ...recentActivities,
    ...hiddenActivities,
  ];

  return (
    <>
      <PageShell>
        {/* Top Navigation */}
        <header className="sison-top-bar sticky top-0 z-10 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#2a2a2a] leading-tight">시선</h1>
              <p className="text-[12px] text-[#aaa] mt-0.5">새로운 시선을 만나는 여행</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNotificationOpen(true)}
              aria-label="알림 열기"
              className="relative w-10 h-10 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              <span className="absolute right-[9px] top-[8px] h-[5px] w-[5px] rounded-full bg-[#a8d5ba]" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-[33vh] overflow-hidden">
          {heroImages.map((image, index) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
                index === activeHeroIndex ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={index !== activeHeroIndex}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <h2 className="text-white mb-2 leading-snug drop-shadow-sm">
              여행의 작은 틈에서,<br />새로운 시선을 만나보세요.
            </h2>
            <p className="text-white/90 text-sm drop-shadow-sm">
              여행지 가까이의 작은 활동을 찾아보세요.
            </p>
          </div>
        </section>

        {/* Enhanced Search Card */}
        <section className="px-5 -mt-4 relative z-10">
          <EnhancedSearchCard
            destination={destination}
            dateRange={formatDateRange()}
            peopleCount={peopleCount}
            onDateClick={() => setIsCalendarOpen(true)}
            onPeopleClick={() => setIsPeopleCountOpen(true)}
            onSearch={handleSearch}
            onDestinationChange={setDestination}
            onDateClear={handleDateClear}
            recentSearches={recentSearches}
          />
        </section>

        {/* AI Recommendation Entry */}
        <section className="px-5 mt-4">
          <button
            type="button"
            onClick={() => setIsAIRecommendationFlowOpen(true)}
            aria-label="AI 일정 추천받기"
            className="relative block w-full cursor-pointer overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-[0_10px_26px_rgba(36,31,78,0.14),0_2px_8px_rgba(36,31,78,0.08)] ring-1 ring-black/[0.035] transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8d5ba] active:scale-[0.985] active:opacity-95"
          >
            <img
              src="/ai_recommend_card_03.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="block h-auto w-full select-none object-contain"
            />

            {/* Orb glow overlay — float animation */}
            <span
              aria-hidden="true"
              className="sison-ai-orb pointer-events-none absolute"
              style={{
                animation: 'sison-ai-orb-float 5s ease-in-out infinite',
                right: '5%',
                top: '8%',
                width: '40%',
                height: '84%',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 44% 40%, rgba(190,170,255,0.11) 0%, rgba(120,95,225,0.06) 50%, transparent 72%)',
              }}
            />

            {/* Star sparkles — 4개, 왼쪽 텍스트 영역 근처 분산 */}
            <span
              aria-hidden="true"
              className="sison-ai-star pointer-events-none absolute"
              style={{
                animation: 'sison-ai-star-twinkle 2.8s ease-in-out infinite',
                animationDelay: '0s',
                opacity: 0.45,
                top: '16%', left: '54%',
                width: '4px', height: '4px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.90)',
              }}
            />
            <span
              aria-hidden="true"
              className="sison-ai-star pointer-events-none absolute"
              style={{
                animation: 'sison-ai-star-twinkle 3.2s ease-in-out infinite',
                animationDelay: '0.85s',
                opacity: 0.45,
                top: '68%', left: '11%',
                width: '3px', height: '3px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.82)',
              }}
            />
            <span
              aria-hidden="true"
              className="sison-ai-star pointer-events-none absolute"
              style={{
                animation: 'sison-ai-star-twinkle 2.4s ease-in-out infinite',
                animationDelay: '1.5s',
                opacity: 0.45,
                top: '38%', left: '46%',
                width: '3.5px', height: '3.5px',
                borderRadius: '50%',
                background: 'rgba(220,210,255,0.92)',
              }}
            />
            <span
              aria-hidden="true"
              className="sison-ai-star pointer-events-none absolute"
              style={{
                animation: 'sison-ai-star-twinkle 3.8s ease-in-out infinite',
                animationDelay: '0.4s',
                opacity: 0.45,
                top: '80%', left: '32%',
                width: '2.5px', height: '2.5px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.72)',
              }}
            />

            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-[60%] flex-col justify-center pl-5 text-left">
              <span className="text-[21px] font-bold leading-none text-white">
                AI 활동 추천
              </span>
              <span className="mt-1.5 text-[12.5px] font-medium leading-snug text-white/75 whitespace-nowrap">
                내 일정에 맞는 활동을 추천해드려요
              </span>
            </span>
          </button>
        </section>

        {/* Calendar Bottom Sheet */}
        <CalendarBottomSheet
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          onConfirm={handleDateConfirm}
          initialStartDate={startDate || undefined}
          initialEndDate={endDate || undefined}
        />

        {/* People Count Modal */}
        <PeopleCountModal
          isOpen={isPeopleCountOpen}
          onClose={() => setIsPeopleCountOpen(false)}
          onConfirm={handlePeopleConfirm}
          initialCount={peopleCount || 1}
        />

        {/* Home Activity Sections */}
        <div className="px-5 mt-5 mb-8 space-y-8">
          {activitySections.map((section) => (
            <section key={section.title}>
              <div className="mb-3.5">
                <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-1">{section.title}</h3>
                <p className="text-[12px] text-[#aaa]">{section.description}</p>
              </div>
              <div className="space-y-2.5">
                {section.state !== 'success' && <ActivityState state={section.state} emptyTitle={section.emptyTitle} />}
                {section.activities.map((activity, activityIndex) => (
                  isWeeklySection(section.title) ? (
                    <RecentTimelineActivityCard
                      key={`${section.title}-${activity.title}`}
                      activity={activity}
                      index={activityIndex}
                      isLast={activityIndex === section.activities.length - 1}
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  ) : isFestivalSection(section.title) ? (
                    <HiddenPlaceActivityCard
                      key={`${section.title}-${activity.title}`}
                      activity={activity}
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  ) : (
                    <CompactActivityCard
                      key={`${section.title}-${activity.title}`}
                      variant="home"
                      imageUrl={activity.imageUrl}
                      title={activity.title}
                      location={activity.location}
                      recruitmentStartDate={activity.recruitmentStartDate}
                      recruitmentEndDate={activity.recruitmentEndDate}
                      activityDate={activity.activityDate}
                      activityStartDate={activity.activityStartDate}
                      activityEndDate={activity.activityEndDate}
                      volunteerPeriod={activity.volunteerPeriod}
                      date={activity.date}
                      time={activity.time}
                      showBookmark
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => { setSelectedActivity(activity); setIsDetailOpen(true); }}
                    />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="home" onNavigate={onNavigate} />

      {/* Notifications */}
      <NotificationSheet
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <HomeAIRecommendationFlow
        isOpen={isAIRecommendationFlowOpen}
        activities={allHomeActivities}
        isActivitySaved={isActivitySaved}
        onClose={() => setIsAIRecommendationFlowOpen(false)}
        onToggleSavedActivity={onToggleSavedActivity}
        onOpenActivity={(activity) => {
          setIsAIRecommendationFlowOpen(false);
          setSelectedActivity(activity);
          setIsDetailOpen(true);
        }}
      />

      {/* Activity Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={(activity) => { setIsDetailOpen(false); onNavigate('ai-recommendation', { activity, returnScreen: 'home' }); }}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
