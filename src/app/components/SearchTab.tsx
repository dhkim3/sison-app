import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { resolveSearchLocation, type ResolvedSearchLocation } from '../travelPlaceAliases';
import { ArrowLeft } from 'lucide-react';
import { DefaultSearchState } from './DefaultSearchState';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { SearchSummaryCard } from './SearchSummaryCard';
import { SearchConditionsBottomSheet } from './SearchConditionsBottomSheet';
import { FilterChips } from './FilterChips';
import { FilterBottomSheet } from './FilterBottomSheet';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';
import { getActivityStatus, isPastActivity } from '../activityFormatters';
import { normalizeCapacity } from '../activityCapacity';
import { avoidConsecutiveActivityImages, logActivityImageMappings, withResolvedActivityImage } from '../utils/activityImage';
import { scrollToTop } from '../utils/scrollToTop';
import {
  addRecentSearch,
  createSearchKey,
  formatSearchDateRangeFull,
  initialSearchApiState,
  selectRecentSearch,
  type RecentSearchItem,
  type SearchCondition,
  type SearchState,
} from '../searchState';

const activityCategoryFilters = [
  '생활편의',
  '주거환경',
  '상담·멘토링',
  '교육',
  '보건·의료',
  '농어촌 봉사',
  '문화·체육·예술·관광',
  '환경·생태계보호',
  '사무행정',
  '지역안전·보호',
  '인권·공익',
  '재난·재해',
  '국제협력·해외봉사',
  '기타',
  '자원봉사 기본교육',
];

const categoryLabelMap: Record<string, string> = {
  환경정화: '환경·생태계보호',
  '지역 행사': '문화·체육·예술·관광',
  '교육·문화': '교육',
  '산책형 활동': '환경·생태계보호',
};

const normalizeActivityCategory = (value?: string | null) => {
  const category = value?.trim() || '';
  if (!category) return '';
  if (categoryLabelMap[category]) return categoryLabelMap[category];

  if (category.includes('생활')) return '생활편의';
  if (category.includes('주거')) return '주거환경';
  if (category.includes('상담') || category.includes('멘토링')) return '상담·멘토링';
  if (category.includes('교육') && category.includes('기본')) return '자원봉사 기본교육';
  if (category.includes('교육')) return '교육';
  if (category.includes('보건') || category.includes('의료')) return '보건·의료';
  if (category.includes('농어촌') || category.includes('농촌') || category.includes('어촌')) return '농어촌 봉사';
  if (category.includes('문화') || category.includes('체육') || category.includes('예술') || category.includes('관광')) {
    return '문화·체육·예술·관광';
  }
  if (category.includes('환경') || category.includes('생태')) return '환경·생태계보호';
  if (category.includes('사무')) return '사무행정';
  if (category.includes('지역안전') || category.includes('지역 안전') || category.includes('보호')) return '지역안전·보호';
  if (category.includes('인권') || category.includes('공익')) return '인권·공익';
  if (category.includes('재난') || category.includes('재해')) return '재난·재해';
  if (category.includes('국제') || category.includes('해외')) return '국제협력·해외봉사';
  if (category.includes('기타')) return '기타';

  return category;
};

interface SearchTabProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  searchState: SearchState;
  entrySource?: 'tab' | 'home-search';
  onHomeSearchBack?: () => void;
  onSearchStateChange: Dispatch<SetStateAction<SearchState>>;
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

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
  capacity: string | number | null;
  currentParticipants: string | number | null;
  volunteerTarget?: string | null;
  status: '모집중' | '지난 활동';
  imageUrl: string;
  applyUrl?: string;
  sourceUrl?: string;
  progrmRegistNo: string;
}

interface VolunteerSearchResponse {
  ok: boolean;
  items: VolunteerActivity[];
  totalCount: number;
  page?: number;
  size?: number;
  error?: string;
}

type DestinationCountState = 'loading' | 'ready' | 'error';

interface DestinationActivityCount {
  status: DestinationCountState;
  count: number | null;
}

const recommendedDestinationNames = ['제주', '강릉', '부산', '여수'];

export function SearchTab({
  onNavigate,
  searchState,
  entrySource = 'tab',
  onHomeSearchBack,
  onSearchStateChange,
  isActivitySaved,
  onToggleSavedActivity,
}: SearchTabProps) {
  const [hasSearched, setHasSearched] = useState(searchState.hasSearched);
  const [destination, setDestination] = useState(searchState.destination);
  const [startDate, setStartDate] = useState<Date | null>(searchState.startDate);
  const [endDate, setEndDate] = useState<Date | null>(searchState.endDate);
  const [peopleCount, setPeopleCount] = useState(searchState.peopleCount);
  const [summaryDateRange, setSummaryDateRange] = useState(searchState.dateRangeLabel);
  const [summaryPeople, setSummaryPeople] = useState(searchState.peopleCount > 0 ? `${searchState.peopleCount}명` : '');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleCountOpen, setIsPeopleCountOpen] = useState(false);
  const [isSearchEditOpen, setIsSearchEditOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [appliedCategoryFilters, setAppliedCategoryFilters] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [destinationActivityCounts, setDestinationActivityCounts] = useState<Record<string, DestinationActivityCount>>({});
  const searchApiState = searchState.api;
  const searchApiStateRef = useRef(searchApiState);
  const resolvedLocationRef = useRef<ResolvedSearchLocation | null>(
    resolveSearchLocation(searchState.destination)
  );

  useEffect(() => {
    searchApiStateRef.current = searchApiState;
  }, [searchApiState]);

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const formatDateRangeFullForDates = (start: Date, end: Date) => {
    return formatSearchDateRangeFull(start, end);
  };

  const formatDateRangeFull = () => {
    if (!startDate || !endDate) return '';
    return formatDateRangeFullForDates(startDate, endDate);
  };

  const formatApiDate = (date: Date | null) => {
    if (!date) return '';

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');
  };

  const mapApiActivityToCardActivity = (activity: VolunteerActivity): ActivitySaveRecord => {
    const activityStatus = getActivityStatus({
      activityStartDate: activity.activityStartDate,
      activityEndDate: activity.activityEndDate,
      time: activity.time,
      recruitmentEndDate: activity.recruitmentEndDate,
    });

    return withResolvedActivityImage({
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
      isRecruiting: activityStatus !== 'past' && activityStatus !== 'closed',
      description: activity.organization
        ? `${activity.organization}에서 모집하는 1365 봉사활동입니다.`
        : '1365에서 제공한 봉사활동입니다.',
      materials: '1365 상세 페이지에서 확인해주세요.',
      capacity: normalizeCapacity(activity.capacity),
      currentParticipants: normalizeCapacity(activity.currentParticipants),
      recommendation: '여행 일정과 가까운 시간에 참여할 수 있는 활동인지 살펴보세요.',
      category: activity.category,
      volunteerPeriod:
        activity.activityStartDate && activity.activityEndDate
          ? `${activity.activityStartDate} - ${activity.activityEndDate}`
          : activity.activityStartDate,
      volunteerTime: activity.time || '시간 확인 필요',
      volunteerField: activity.category || '봉사분야 확인 필요',
      volunteerTarget: activity.volunteerTarget || '1365 상세 페이지에서 확인해주세요.',
      recruitingOrganization: activity.organization || '모집기관 확인 필요',
      volunteerPlace: activity.location || activity.region || '장소 확인 필요',
      applyUrl: activity.applyUrl || activity.sourceUrl,
      sourceUrl: activity.sourceUrl,
      progrmRegistNo: activity.progrmRegistNo,
    });
  };

  const isSearchVisibleActivity = (activity: ActivitySaveRecord) => {
    const rawStatus = String(activity.status || '').trim();
    if (/모집완료|모집마감|종료|신청불가|지난 활동/.test(rawStatus)) return false;

    const activityStatus = getActivityStatus({
      date: activity.date,
      activityDate: activity.activityDate,
      activityStartDate: activity.activityStartDate,
      activityEndDate: activity.activityEndDate,
      time: activity.time,
      recruitmentEndDate: activity.recruitmentEndDate,
      volunteerPeriod: activity.volunteerPeriod,
      volunteerTime: activity.volunteerTime,
    });

    return activityStatus !== 'past' && activityStatus !== 'closed';
  };

  const buildSearchCondition = (
    nextDestination: string,
    nextStartDate: Date | null,
    nextEndDate: Date | null,
    nextPeopleCount: number,
  ): SearchCondition => ({
    destination: nextDestination,
    startDate: nextStartDate,
    endDate: nextEndDate,
    peopleCount: nextPeopleCount,
    page: 1,
  });

  const updateSearchShellState = (nextState: Partial<Omit<SearchState, 'api' | 'recentSearches'>>) => {
    onSearchStateChange((currentState) => ({
      ...currentState,
      ...nextState,
      api: currentState.api,
    }));
  };

  useLayoutEffect(() => {
    scrollToTop();
  }, [hasSearched]);

  const runSearch = (values: {
    destination: string;
    startDate: Date | null;
    endDate: Date | null;
    dateRangeLabel: string;
    peopleCount: number;
    resolvedSidoCd?: string | null;
    resolvedGugunCd?: string | null;
    resolvedKeywords?: string[] | null;
  }) => {
    scrollToTop();
    const nextDestination = values.destination.trim();
    const nextPeopleCount = values.peopleCount;

    if (!nextDestination) {
      setDestination('');
      setStartDate(values.startDate);
      setEndDate(values.endDate);
      setSummaryDateRange(values.dateRangeLabel);
      setPeopleCount(nextPeopleCount);
      setSummaryPeople(nextPeopleCount > 0 ? `${nextPeopleCount}명` : '');
      setHasSearched(true);
      setVisibleCount(15);
      resolvedLocationRef.current = null;
      searchApiStateRef.current = initialSearchApiState;

      onSearchStateChange((currentState) => ({
        ...currentState,
        destination: '',
        startDate: values.startDate,
        endDate: values.endDate,
        dateRangeLabel: values.dateRangeLabel,
        peopleCount: nextPeopleCount,
        hasSearched: true,
        api: initialSearchApiState,
      }));
      return;
    }

    // 저장된 resolved 정보 사용 (최근 검색 클릭) 또는 새로 resolve
    const resolved = (values.resolvedSidoCd !== undefined)
      ? (values.resolvedSidoCd
          ? {
              sidoCd: values.resolvedSidoCd,
              gugunCd: values.resolvedGugunCd ?? null,
              keywords: values.resolvedKeywords ?? [],
            } as ResolvedSearchLocation
          : null)
      : resolveSearchLocation(nextDestination);

    setDestination(nextDestination);
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    setSummaryDateRange(values.dateRangeLabel);
    setPeopleCount(nextPeopleCount);
    setSummaryPeople(nextPeopleCount > 0 ? `${nextPeopleCount}명` : '');
    setHasSearched(true);
    setVisibleCount(15);

    onSearchStateChange((currentState) => ({
      ...currentState,
      destination: nextDestination,
      startDate: values.startDate,
      endDate: values.endDate,
      dateRangeLabel: values.dateRangeLabel,
      peopleCount: nextPeopleCount,
      hasSearched: true,
      recentSearches: addRecentSearch(currentState.recentSearches ?? [], {
        destination: nextDestination,
        startDate: values.startDate,
        endDate: values.endDate,
        peopleCount: nextPeopleCount,
        resolvedSidoCd: resolved?.sidoCd ?? null,
        resolvedGugunCd: resolved?.gugunCd ?? null,
        resolvedKeywords: resolved?.keywords ?? null,
      }),
      api: currentState.api,
    }));

    void fetchVolunteerActivities(nextDestination, values.startDate, values.endDate, nextPeopleCount, resolved);
  };

  const runFreshRegionSearch = (regionKeyword: string) => {
    const nextDestination = regionKeyword.trim();
    if (!nextDestination) return;

    const resolved = resolveSearchLocation(nextDestination);
    const resetApiState = { ...initialSearchApiState };

    scrollToTop();
    setDestination(nextDestination);
    setStartDate(null);
    setEndDate(null);
    setSummaryDateRange('');
    setPeopleCount(0);
    setSummaryPeople('');
    setHasSearched(true);
    setVisibleCount(15);
    setAppliedCategoryFilters([]);
    setIsFilterOpen(false);
    setIsSearchEditOpen(false);
    resolvedLocationRef.current = resolved;
    searchApiStateRef.current = resetApiState;

    onSearchStateChange((currentState) => ({
      ...currentState,
      destination: nextDestination,
      startDate: null,
      endDate: null,
      dateRangeLabel: '',
      peopleCount: 0,
      hasSearched: true,
      recentSearches: addRecentSearch(currentState.recentSearches ?? [], {
        destination: nextDestination,
        startDate: null,
        endDate: null,
        peopleCount: 0,
        resolvedSidoCd: resolved?.sidoCd ?? null,
        resolvedGugunCd: resolved?.gugunCd ?? null,
        resolvedKeywords: resolved?.keywords ?? null,
      }),
      api: resetApiState,
    }));

    void fetchVolunteerActivities(nextDestination, null, null, 0, resolved);
  };

  const SEARCH_PAGE_SIZE = 15;
  const INITIAL_SEARCH_MAX_PAGE = 5;

  const getActivityUniqueKey = (activity: ActivitySaveRecord) =>
    activity.progrmRegistNo || activity.id || `${activity.title}-${activity.activityStartDate || activity.date}-${activity.location}`;

  const mergeUniqueActivities = (baseActivities: ActivitySaveRecord[], nextActivities: ActivitySaveRecord[]) => {
    const seenKeys = new Set(baseActivities.map(getActivityUniqueKey));
    const mergedActivities = [...baseActivities];

    nextActivities.forEach((activity) => {
      const key = getActivityUniqueKey(activity);
      if (!key || seenKeys.has(key)) return;

      seenKeys.add(key);
      mergedActivities.push(activity);
    });

    return mergedActivities;
  };

  const buildVolunteerSearchParams = (
    keyword: string,
    nextStartDate: Date | null,
    nextEndDate: Date | null,
    resolved: ResolvedSearchLocation | null,
  ) => {
    const params = new URLSearchParams({
      keyword: keyword.trim(),
      page: '1',
      size: String(SEARCH_PAGE_SIZE),
    });
    const apiStartDate = formatApiDate(nextStartDate);
    const apiEndDate = formatApiDate(nextEndDate);

    if (apiStartDate) params.set('startDate', apiStartDate);
    if (apiEndDate) params.set('endDate', apiEndDate);
    if (resolved?.sidoCd) params.set('sidoCd', resolved.sidoCd);
    if (resolved?.gugunCd) params.set('gugunCd', resolved.gugunCd);
    if (resolved?.keywords && resolved.keywords.length > 0) {
      params.set('fallbackKeyword', resolved.keywords[resolved.keywords.length - 1]);
    }

    return params;
  };

  const fetchVisibleSearchPage = async (params: URLSearchParams, page: number, logLabel: string) => {
    params.set('page', String(page));
    const pageRequestUrl = `/api/volunteer/search?${params.toString()}`;
    const response = await fetch(pageRequestUrl);
    const responseText = await response.text();
    let payload: VolunteerSearchResponse | null = null;

    try {
      payload = JSON.parse(responseText) as VolunteerSearchResponse;
    } catch {
      console.error(`${logLabel} returned non-JSON response:`, {
        requestUrl: pageRequestUrl,
        status: response.status,
        responseText: responseText.slice(0, 1000),
      });
      throw new Error('검색 API가 JSON이 아닌 응답을 반환했어요.');
    }

    if (!response.ok || !payload.ok) {
      console.error(`${logLabel} failed:`, {
        requestUrl: pageRequestUrl,
        status: response.status,
        responseText: responseText.slice(0, 1000),
        errorMessage: payload.error,
      });
      throw new Error(payload.error || '1365 검색 요청에 실패했어요.');
    }

    return {
      payload,
      activities: Array.isArray(payload.items)
        ? avoidConsecutiveActivityImages(payload.items.map(mapApiActivityToCardActivity).filter(isSearchVisibleActivity))
        : [],
    };
  };

  const fetchVisibleSearchResults = async (
    keyword: string,
    nextStartDate: Date | null,
    nextEndDate: Date | null,
    resolved: ResolvedSearchLocation | null,
    logLabel: string,
    pageLimit = INITIAL_SEARCH_MAX_PAGE,
  ) => {
    const params = buildVolunteerSearchParams(keyword, nextStartDate, nextEndDate, resolved);
    const firstPage = await fetchVisibleSearchPage(params, 1, logLabel);
    let activities = firstPage.activities;
    let totalCount = firstPage.payload.totalCount ?? activities.length;
    let lastFetchedPage = 1;

    while (
      lastFetchedPage < pageLimit &&
      lastFetchedPage * SEARCH_PAGE_SIZE < totalCount
    ) {
      lastFetchedPage += 1;
      const nextPage = await fetchVisibleSearchPage(params, lastFetchedPage, logLabel);
      activities = avoidConsecutiveActivityImages(mergeUniqueActivities(activities, nextPage.activities));
      totalCount = Math.max(totalCount, nextPage.payload.totalCount ?? totalCount);
    }

    return {
      activities: avoidConsecutiveActivityImages(activities),
      totalCount,
      lastFetchedPage,
    };
  };

  const fetchVolunteerActivities = async (
    keyword: string,
    nextStartDate: Date | null,
    nextEndDate: Date | null,
    nextPeopleCount: number,
    preResolvedLocation?: ResolvedSearchLocation | null,
  ) => {
    if (!keyword.trim()) return;

    const searchCondition = buildSearchCondition(keyword, nextStartDate, nextEndDate, nextPeopleCount);
    const searchKey = createSearchKey(searchCondition);
    const currentApiState = searchApiStateRef.current;

    if (
      (currentApiState.hasSearched && currentApiState.lastSearchKey === searchKey) ||
      (currentApiState.isLoading && currentApiState.pendingSearchKey === searchKey)
    ) {
      return;
    }

    // resolved 위치 정보 결정 (전달받은 값 우선, 없으면 keyword로 resolve)
    const resolved = preResolvedLocation !== undefined
      ? preResolvedLocation
      : resolveSearchLocation(keyword);
    resolvedLocationRef.current = resolved;

    searchApiStateRef.current = {
      ...currentApiState,
      pendingSearchKey: searchKey,
      failedSearchKey: null,
      isLoading: true,
      isLoadingMore: false,
      currentPage: 1,
      error: null,
    };
    onSearchStateChange((currentState) => ({
      ...currentState,
      api: {
        ...currentState.api,
        pendingSearchKey: searchKey,
        failedSearchKey: null,
        isLoading: true,
        isLoadingMore: false,
        currentPage: 1,
        error: null,
      },
    }));

    const requestUrl = `/api/volunteer/search?${buildVolunteerSearchParams(keyword, nextStartDate, nextEndDate, resolved).toString()}`;

    try {
      const {
        activities: nextActivities,
        totalCount,
        lastFetchedPage,
      } = await fetchVisibleSearchResults(
        keyword,
        nextStartDate,
        nextEndDate,
        resolved,
        'Volunteer search API',
      );

      logActivityImageMappings('search-results', nextActivities);
      if (searchApiStateRef.current.pendingSearchKey !== searchKey) return;

      const nextApiState = {
        ...searchApiStateRef.current,
        lastSearchKey: searchKey,
        pendingSearchKey: null,
        failedSearchKey: null,
        lastSuccessfulSearchCondition: searchCondition,
        results: nextActivities,
        totalCount,
        currentPage: lastFetchedPage,
        hasSearched: true,
        isLoading: false,
        error: null,
      };
      searchApiStateRef.current = nextApiState;
      onSearchStateChange((currentState) => ({
        ...currentState,
        api: nextApiState,
      }));
    } catch (error) {
      console.error('Volunteer search failed:', {
        requestUrl,
        status: 'request-error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (searchApiStateRef.current.pendingSearchKey !== searchKey) return;

      const nextApiState = {
        ...searchApiStateRef.current,
        pendingSearchKey: null,
        failedSearchKey: searchKey,
        isLoading: false,
        error: '검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
      };
      searchApiStateRef.current = nextApiState;
      onSearchStateChange((currentState) => ({
        ...currentState,
        api: nextApiState,
      }));
    }
  };

  const fetchRecommendedDestinationCount = async (destinationName: string) => {
    const resolved = resolveSearchLocation(destinationName);
    const { activities } = await fetchVisibleSearchResults(
      destinationName,
      null,
      null,
      resolved,
      'Recommended destination count',
    );

    return activities.length;
  };

  const loadMoreActivities = async () => {
    const currentApiState = searchApiStateRef.current;
    if (currentApiState.isLoadingMore || currentApiState.isLoading) return;

    const nextPage = currentApiState.currentPage + 1;
    const resolved = resolvedLocationRef.current;
    const params = new URLSearchParams({
      keyword: destination.trim(),
      page: String(nextPage),
      size: String(SEARCH_PAGE_SIZE),
    });
    const apiStartDate = formatApiDate(startDate);
    const apiEndDate = formatApiDate(endDate);

    if (apiStartDate) params.set('startDate', apiStartDate);
    if (apiEndDate) params.set('endDate', apiEndDate);

    // 초기 검색과 동일한 지역코드 사용
    if (resolved?.sidoCd) params.set('sidoCd', resolved.sidoCd);
    if (resolved?.gugunCd) params.set('gugunCd', resolved.gugunCd);
    if (resolved?.keywords && resolved.keywords.length > 0) {
      params.set('fallbackKeyword', resolved.keywords[resolved.keywords.length - 1]);
    }

    searchApiStateRef.current = { ...currentApiState, isLoadingMore: true };
    onSearchStateChange((currentState) => ({
      ...currentState,
      api: { ...currentState.api, isLoadingMore: true },
    }));

    const requestUrl = `/api/volunteer/search?${params.toString()}`;

    try {
      const response = await fetch(requestUrl);
      const responseText = await response.text();
      let payload: VolunteerSearchResponse | null = null;

      try {
        payload = JSON.parse(responseText) as VolunteerSearchResponse;
      } catch {
        throw new Error('검색 API가 JSON이 아닌 응답을 반환했어요.');
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || '1365 검색 요청에 실패했어요.');
      }

      const moreActivities = Array.isArray(payload.items)
        ? avoidConsecutiveActivityImages([
            ...searchApiStateRef.current.results.slice(-1),
            ...payload.items.map(mapApiActivityToCardActivity).filter(isSearchVisibleActivity),
          ]).slice(1)
        : [];

      onSearchStateChange((currentState) => ({
        ...currentState,
        api: {
          ...currentState.api,
          results: mergeUniqueActivities(currentState.api.results, moreActivities),
          totalCount: payload!.totalCount ?? currentState.api.totalCount,
          currentPage: nextPage,
          isLoadingMore: false,
        },
      }));
      const mergedResults = mergeUniqueActivities(searchApiStateRef.current.results, moreActivities);
      searchApiStateRef.current = {
        ...searchApiStateRef.current,
        results: mergedResults,
        totalCount: payload.totalCount ?? searchApiStateRef.current.totalCount,
        currentPage: nextPage,
        isLoadingMore: false,
      };
    } catch (error) {
      console.error('Volunteer load more failed:', {
        requestUrl,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      onSearchStateChange((currentState) => ({
        ...currentState,
        api: { ...currentState.api, isLoadingMore: false },
      }));
      searchApiStateRef.current = { ...searchApiStateRef.current, isLoadingMore: false };
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const missingDestinations = recommendedDestinationNames.filter(
      (name) => !destinationActivityCounts[name],
    );

    if (missingDestinations.length === 0) return;

    setDestinationActivityCounts((currentCounts) => {
      const nextCounts = { ...currentCounts };
      missingDestinations.forEach((name) => {
        nextCounts[name] = { status: 'loading', count: null };
      });
      return nextCounts;
    });

    missingDestinations.forEach((name) => {
      void fetchRecommendedDestinationCount(name)
        .then((count) => {
          if (isCancelled) return;
          setDestinationActivityCounts((currentCounts) => ({
            ...currentCounts,
            [name]: { status: 'ready', count },
          }));
        })
        .catch(() => {
          if (isCancelled) return;
          setDestinationActivityCounts((currentCounts) => ({
            ...currentCounts,
            [name]: { status: 'error', count: null },
          }));
        });
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setHasSearched(searchState.hasSearched);
    setDestination(searchState.destination);
    setStartDate(searchState.startDate);
    setEndDate(searchState.endDate);
    setPeopleCount(searchState.peopleCount);
    setSummaryDateRange(searchState.dateRangeLabel);
    setSummaryPeople(searchState.peopleCount > 0 ? `${searchState.peopleCount}명` : '');

    if (!searchState.hasSearched) {
      setAppliedCategoryFilters([]);
      setIsFilterOpen(false);
      setIsSearchEditOpen(false);
      setIsDetailOpen(false);
      setSelectedActivity(null);
      return;
    }

    if (!searchState.destination.trim()) {
      resolvedLocationRef.current = null;
      searchApiStateRef.current = initialSearchApiState;
      onSearchStateChange((currentState) => ({
        ...currentState,
        api: initialSearchApiState,
      }));
      return;
    }

    void fetchVolunteerActivities(
      searchState.destination,
      searchState.startDate,
      searchState.endDate,
      searchState.peopleCount,
      // preResolvedLocation 미전달 → fetch 내부에서 resolve
    );
  }, [
    searchState.dateRangeLabel,
    searchState.destination,
    searchState.endDate,
    searchState.hasSearched,
    searchState.peopleCount,
    searchState.startDate,
  ]);

  const handleSearch = (dest: string, dates: string, people: number) => {
    const shouldKeepSelectedDates = Boolean(dates.trim());
    const shouldResetFilters = !shouldKeepSelectedDates && people === 0;

    if (shouldResetFilters) {
      setAppliedCategoryFilters([]);
    }

    runSearch({
      destination: dest,
      startDate: shouldKeepSelectedDates ? startDate : null,
      endDate: shouldKeepSelectedDates ? endDate : null,
      dateRangeLabel: shouldKeepSelectedDates ? dates : '',
      peopleCount: people,
    });
  };

  const handlePopularRegionSearch = (region: string) => {
    runFreshRegionSearch(region);
  };

  const handleRecentSearchSelect = (item: RecentSearchItem) => {
    runSearch(selectRecentSearch(item));
  };

  const handleBackToExploration = () => {
    if (entrySource === 'home-search') {
      onHomeSearchBack?.();
      return;
    }

    setHasSearched(false);
    updateSearchShellState({
      destination,
      startDate,
      endDate,
      dateRangeLabel: currentSummaryDateRange,
      peopleCount,
      hasSearched: false,
    });
  };

  const handleDateConfirm = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    const nextDateRange = formatDateRangeFullForDates(start, end);
    setSummaryDateRange(nextDateRange);
    updateSearchShellState({
      destination,
      startDate: start,
      endDate: end,
      dateRangeLabel: nextDateRange,
      peopleCount,
      hasSearched,
    });
  };

  const handleDateClear = () => {
    setStartDate(null);
    setEndDate(null);
    setSummaryDateRange('');
    updateSearchShellState({
      destination,
      startDate: null,
      endDate: null,
      dateRangeLabel: '',
      peopleCount,
      hasSearched,
    });
  };

  const handlePeopleConfirm = (count: number) => {
    setPeopleCount(count);
    setSummaryPeople(count > 0 ? `${count}명` : '');
    updateSearchShellState({
      destination,
      startDate,
      endDate,
      dateRangeLabel: currentSummaryDateRange,
      peopleCount: count,
      hasSearched,
    });
  };

  const handlePeopleClear = () => {
    setPeopleCount(0);
    setSummaryPeople('');
    updateSearchShellState({
      destination,
      startDate,
      endDate,
      dateRangeLabel: currentSummaryDateRange,
      peopleCount: 0,
      hasSearched,
    });
  };

  const handleSearchConditionsApply = (values: {
    destination: string;
    dateRange: string;
    peopleCount: number;
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    setIsSearchEditOpen(false);
    runSearch({
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      dateRangeLabel: values.dateRange,
      peopleCount: values.peopleCount,
    });
  };

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const normalizedDestination = destination.trim().toLowerCase();
  const currentSearchKey = createSearchKey(buildSearchCondition(destination, startDate, endDate, peopleCount));
  const hasCachedResultsForCurrentSearch =
    searchApiState.hasSearched && searchApiState.lastSearchKey === currentSearchKey;
  const rawResults = hasCachedResultsForCurrentSearch ? searchApiState.results : [];
  const isLoadingResults =
    searchApiState.isLoading && searchApiState.pendingSearchKey === currentSearchKey;
  const searchError =
    !isLoadingResults && searchApiState.failedSearchKey === currentSearchKey
      ? searchApiState.error || ''
      : '';
  const isMissingDestinationSearch = hasSearched && destination.trim().length === 0;
  const filteredResults = avoidConsecutiveActivityImages(rawResults.filter((activity) => {
    const searchableText = `${activity.title} ${activity.location}`.toLowerCase();
    // alias 지역코드 검색 시 백엔드가 이미 지역 필터링 → 클라이언트 destination 필터 생략
    const resolvedKeywords = resolvedLocationRef.current?.keywords ?? [];
    const matchesDestination = resolvedLocationRef.current !== null
      ? true
      : normalizedDestination
        ? searchableText.includes(normalizedDestination) ||
          resolvedKeywords.some((k) => searchableText.includes(k.toLowerCase()))
        : true;
    const capacity = Number.parseInt(activity.capacity, 10) || 0;
    const matchesPeople = peopleCount > 0 && capacity > 0 ? capacity >= peopleCount : true;
    const normalizedCategory = normalizeActivityCategory(activity.category || activity.volunteerField);
    const matchesCategory =
      appliedCategoryFilters.length === 0 || appliedCategoryFilters.includes(normalizedCategory);

    return matchesDestination && matchesPeople && matchesCategory;
  }));
  const visibleResults = filteredResults.slice(0, visibleCount);
  const hasAppliedCategoryFilters = appliedCategoryFilters.length > 0;
  const resultCount = filteredResults.length;
  const shouldShowResultCount = !isMissingDestinationSearch && (isLoadingResults || (!searchError && filteredResults.length > 0));
  const hasMoreClientResults = filteredResults.length > visibleCount;
  const hasMoreApiResults = hasCachedResultsForCurrentSearch &&
    filteredResults.length > 0 &&
    searchApiState.currentPage * SEARCH_PAGE_SIZE < searchApiState.totalCount;
  const hasMoreResults = hasMoreClientResults || (!hasAppliedCategoryFilters && hasMoreApiResults);

  const currentSummaryDateRange = summaryDateRange || formatDateRangeFull();
  const currentPeopleCount = summaryPeople ? Number.parseInt(summaryPeople, 10) || peopleCount : peopleCount;
  const shouldShowBackButton = hasSearched || entrySource === 'home-search';
  const destinationActivityLabels = recommendedDestinationNames.reduce<Record<string, string>>((labels, name) => {
    const countState = destinationActivityCounts[name];

    if (!countState || countState.status === 'loading') {
      labels[name] = '활동 확인 중';
      return labels;
    }

    if (countState.status === 'error' || countState.count === null) {
      labels[name] = '활동 확인 필요';
      return labels;
    }

    labels[name] = countState.count === 0 ? '활동 없음' : `${countState.count}개 활동`;
    return labels;
  }, {});

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sison-top-bar sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              {shouldShowBackButton && (
                <button
                  type="button"
                  onClick={handleBackToExploration}
                  className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
                </button>
              )}
              <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">{hasSearched ? '검색 결과' : '검색'}</h2>
            </div>
            {!hasSearched && (
              <p className="text-[12px] text-[#7A7F87] mt-0.5">여행지에서 참여할 활동 찾기</p>
            )}
          </div>

          {/* Search Summary - Only in result state */}
          {hasSearched && (
            <div className="px-5 pb-4">
              <SearchSummaryCard
                destination={destination}
                dateRange={currentSummaryDateRange}
                people={summaryPeople}
                onEdit={() => setIsSearchEditOpen(true)}
              />
            </div>
          )}
        </header>

        {/* Default Exploration State */}
        {!hasSearched && (
          <div className="px-5 pt-3 pb-6">
            <DefaultSearchState
              onSearch={handleSearch}
              onDateClick={() => setIsCalendarOpen(true)}
              onPeopleClick={() => setIsPeopleCountOpen(true)}
              destination={destination}
              dateRange={formatDateRange()}
              peopleCount={peopleCount}
              recentSearches={searchState.recentSearches}
              onDestinationChange={setDestination}
              onRecentSearchSelect={handleRecentSearchSelect}
              onPopularRegionSelect={handlePopularRegionSearch}
              onDateConfirm={handleDateConfirm}
              onDateClear={handleDateClear}
              onPeopleClear={handlePeopleClear}
              onPeopleConfirm={handlePeopleConfirm}
              destinationActivityLabels={destinationActivityLabels}
            />
          </div>
        )}

        {/* Search Result State */}
        {hasSearched && (
          <>
            {/* Filters */}
            {!isMissingDestinationSearch && (
            <div className="px-5 py-3">
              <div className="flex items-center">
                <FilterChips selectedFilters={appliedCategoryFilters} onOpen={() => setIsFilterOpen(true)} />
              </div>
            </div>
            )}

            {/* Results Count */}
            {shouldShowResultCount && (
              <div className="px-5 py-3">
                <p className="text-[13px] text-[#5F6368]">
                  {isLoadingResults ? (
                    '1365에서 활동을 찾고 있어요'
                  ) : (
                    <>
                      총 <span className="text-[#2a2a2a] font-semibold">{resultCount}개</span>의 활동을 찾았어요
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Activity Cards */}
            <div className="px-5 space-y-2.5 pb-8">
              {isLoadingResults && (
                <div className="rounded-3xl bg-white border border-black/5 px-5 py-8 text-center shadow-sm">
                  <p className="text-[15px] font-medium text-[#2a2a2a]">활동을 불러오는 중이에요</p>
                  <p className="mt-1.5 text-[13px] text-[#5F6368]">잠시만 기다려주세요</p>
                </div>
              )}
              {!isLoadingResults && searchError && (
                <div className="rounded-3xl bg-white border border-black/5 px-5 py-8 text-center shadow-sm">
                  <p className="text-[15px] font-medium text-[#2a2a2a]">{searchError}</p>
                  <p className="mt-1.5 text-[13px] text-[#5F6368]">검색어나 일정을 조금 바꿔 다시 시도해보세요</p>
                </div>
              )}
              {!isMissingDestinationSearch && !isLoadingResults && !searchError && visibleResults.map((activity) => (
                <CompactActivityCard
                  key={activity.id || `${activity.title}-${activity.date}`}
                  variant="searchResult"
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
                  isPastActivity={isPastActivity(activity)}
                  showBookmark={true}
                  isSaved={isActivitySaved(activity)}
                  onBookmarkClick={() => onToggleSavedActivity(activity)}
                  onClick={() => handleActivityClick(activity)}
                />
              ))}
              {!isLoadingResults && !searchError && filteredResults.length === 0 && (
                <div className="rounded-3xl bg-white border border-black/5 px-5 py-8 text-center shadow-sm">
                  <p className="text-[15px] font-medium text-[#2a2a2a]">
                    {isMissingDestinationSearch ? '여행지를 입력해 주세요' : '조건에 맞는 활동이 아직 없어요'}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#5F6368]">
                    {isMissingDestinationSearch
                      ? '가고 싶은 지역을 입력하면 근처 활동을 찾아드릴게요.'
                      : '다른 여행지나 일정을 선택해 다시 찾아보세요.'}
                  </p>
                </div>
              )}

              {/* 더보기 */}
              {!isLoadingResults && !searchError && hasMoreResults && (
                <div className="pt-2 pb-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasMoreClientResults) {
                        setVisibleCount((prev) => prev + 15);
                      } else {
                        void loadMoreActivities().then(() => setVisibleCount((prev) => prev + 15));
                      }
                    }}
                    disabled={searchApiState.isLoadingMore}
                    className="px-6 py-2.5 rounded-full border border-black/10 bg-white text-[13px] text-[#555] font-medium disabled:opacity-50 transition-opacity active:bg-black/5"
                  >
                    {searchApiState.isLoadingMore ? '불러오는 중…' : '더보기'}
                  </button>
                </div>
              )}

            </div>
          </>
        )}
      </PageShell>

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

      <SearchConditionsBottomSheet
        isOpen={isSearchEditOpen}
        destination={destination}
        dateRange={currentSummaryDateRange}
        peopleCount={currentPeopleCount}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setIsSearchEditOpen(false)}
        onApply={handleSearchConditionsApply}
      />

      <FilterBottomSheet
        isOpen={isFilterOpen}
        options={activityCategoryFilters}
        selectedFilters={appliedCategoryFilters}
        onClose={() => setIsFilterOpen(false)}
        onApply={setAppliedCategoryFilters}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="search" onNavigate={onNavigate} />

      {/* Enhanced Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={(activity) => onNavigate('ai-recommendation', { activity, returnScreen: 'search' })}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
