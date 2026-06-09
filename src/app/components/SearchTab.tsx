import { useEffect, useState } from 'react';
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
import type { SearchState } from '../searchState';

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

interface SearchTabProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  searchState: SearchState;
  entrySource?: 'tab' | 'home-search';
  onHomeSearchBack?: () => void;
  onSearchStateChange: (state: SearchState) => void;
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
  capacity: number | null;
  currentParticipants: number | null;
  status: '모집중' | '지난 활동';
  imageUrl: string;
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
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivitySaveRecord[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState('');

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const formatDateRangeFullForDates = (start: Date, end: Date) => {
    return `2026.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')} - 2026.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
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

  const formatCapacityLabel = (value: number | null) => (value === null ? '확인 필요' : `${value}명`);

  const mapApiActivityToCardActivity = (activity: VolunteerActivity): ActivitySaveRecord => ({
    id: activity.id || activity.progrmRegistNo,
    imageUrl: activity.imageUrl,
    title: activity.title || '제목 확인 필요',
    location: activity.location || activity.region || '장소 확인 필요',
    recruitmentStartDate: activity.recruitmentStartDate,
    recruitmentEndDate: activity.recruitmentEndDate,
    date: activity.activityStartDate,
    time: activity.time || '시간 확인 필요',
    status: activity.status,
    isRecruiting: activity.status === '모집중',
    description: activity.organization
      ? `${activity.organization}에서 모집하는 1365 봉사활동입니다.`
      : '1365에서 제공한 봉사활동입니다.',
    materials: '1365 상세 페이지에서 확인해주세요.',
    capacity: formatCapacityLabel(activity.capacity),
    currentParticipants: formatCapacityLabel(activity.currentParticipants),
    recommendation: '여행 일정과 가까운 시간에 참여할 수 있는 활동인지 살펴보세요.',
    category: activity.category,
    volunteerPeriod:
      activity.activityStartDate && activity.activityEndDate
        ? `${activity.activityStartDate} - ${activity.activityEndDate}`
        : activity.activityStartDate,
    volunteerTime: activity.time || '시간 확인 필요',
    volunteerField: activity.category || '봉사분야 확인 필요',
    volunteerTarget: '1365 상세 페이지에서 확인해주세요.',
    recruitingOrganization: activity.organization || '모집기관 확인 필요',
    volunteerPlace: activity.location || activity.region || '장소 확인 필요',
    sourceUrl: activity.sourceUrl,
    progrmRegistNo: activity.progrmRegistNo,
  });

  const fetchVolunteerActivities = async (keyword: string, nextStartDate: Date | null, nextEndDate: Date | null) => {
    const params = new URLSearchParams({
      keyword: keyword.trim(),
      page: '1',
      size: '10',
    });
    const apiStartDate = formatApiDate(nextStartDate);
    const apiEndDate = formatApiDate(nextEndDate);

    if (apiStartDate) params.set('startDate', apiStartDate);
    if (apiEndDate) params.set('endDate', apiEndDate);

    setIsLoadingResults(true);
    setSearchError('');

    const requestUrl = `/api/volunteer/search?${params.toString()}`;

    try {
      const response = await fetch(requestUrl);
      const responseText = await response.text();
      let payload: VolunteerSearchResponse | null = null;

      try {
        payload = JSON.parse(responseText) as VolunteerSearchResponse;
      } catch {
        console.error('Volunteer search returned non-JSON response:', {
          requestUrl,
          status: response.status,
          responseText: responseText.slice(0, 1000),
        });
        throw new Error('검색 API가 JSON이 아닌 응답을 반환했어요.');
      }

      if (!response.ok || !payload.ok) {
        console.error('Volunteer search API failed:', {
          requestUrl,
          status: response.status,
          responseText: responseText.slice(0, 1000),
          errorMessage: payload.error,
        });
        throw new Error(payload.error || '1365 검색 요청에 실패했어요.');
      }

      const nextActivities = Array.isArray(payload.items)
        ? payload.items.map(mapApiActivityToCardActivity)
        : [];

      setActivities(nextActivities);
    } catch (error) {
      console.error('Volunteer search failed:', {
        requestUrl,
        status: 'request-error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      setActivities([]);
      setSearchError('검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoadingResults(false);
    }
  };

  useEffect(() => {
    if (!searchState.hasSearched) return;

    void fetchVolunteerActivities(searchState.destination, searchState.startDate, searchState.endDate);
  }, []);

  const handleSearch = (dest: string, dates: string, people: number) => {
    setDestination(dest);
    setSummaryDateRange(dates);
    setPeopleCount(people);
    setSummaryPeople(people > 0 ? `${people}명` : '');
    setHasSearched(true);
    onSearchStateChange({
      destination: dest,
      startDate,
      endDate,
      dateRangeLabel: dates,
      peopleCount: people,
      hasSearched: true,
    });
    void fetchVolunteerActivities(dest, startDate, endDate);
  };

  const handleBackToExploration = () => {
    if (entrySource === 'home-search') {
      onHomeSearchBack?.();
      return;
    }

    setHasSearched(false);
    onSearchStateChange({
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
    onSearchStateChange({
      destination,
      startDate: start,
      endDate: end,
      dateRangeLabel: nextDateRange,
      peopleCount,
      hasSearched,
    });
  };

  const handlePeopleConfirm = (count: number) => {
    setPeopleCount(count);
    setSummaryPeople(count > 0 ? `${count}명` : '');
    onSearchStateChange({
      destination,
      startDate,
      endDate,
      dateRangeLabel: currentSummaryDateRange,
      peopleCount: count,
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
    setDestination(values.destination);
    setSummaryDateRange(values.dateRange);
    setPeopleCount(values.peopleCount);
    setSummaryPeople(values.peopleCount > 0 ? `${values.peopleCount}명` : '');
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    setIsSearchEditOpen(false);
    setHasSearched(true);
    onSearchStateChange({
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      dateRangeLabel: values.dateRange,
      peopleCount: values.peopleCount,
      hasSearched: true,
    });
    void fetchVolunteerActivities(values.destination, values.startDate, values.endDate);
  };

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const parseActivityDate = (value: string) => {
    const [year, month, day] = value.split('.').map(Number);
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
  };

  const normalizedDestination = destination.trim().toLowerCase();
  const displayedActivities = activities.filter((activity) => {
    const searchableText = `${activity.title} ${activity.location}`.toLowerCase();
    const matchesDestination = normalizedDestination ? searchableText.includes(normalizedDestination) : true;
    const activityDate = parseActivityDate(activity.date || '');
    const matchesDate =
      startDate && endDate && activityDate
        ? activityDate >= startDate && activityDate <= endDate
        : true;
    const capacity = Number.parseInt(activity.capacity, 10) || 0;
    const matchesPeople = peopleCount > 0 && capacity > 0 ? capacity >= peopleCount : true;
    const activityCategory = activity.category || '';
    const normalizedCategory = categoryLabelMap[activityCategory] || activityCategory;
    const matchesCategory = selectedFilters.length === 0 || selectedFilters.includes(normalizedCategory);

    return matchesDestination && matchesDate && matchesPeople && matchesCategory;
  });

  const currentSummaryDateRange = summaryDateRange || formatDateRangeFull();
  const currentPeopleCount = summaryPeople ? Number.parseInt(summaryPeople, 10) || peopleCount : peopleCount;
  const shouldShowBackButton = hasSearched || entrySource === 'home-search';

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
              <p className="text-[12px] text-[#aaa] mt-0.5">여행지에서 참여할 활동 찾기</p>
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
              onDestinationChange={setDestination}
              onDateConfirm={handleDateConfirm}
              onPeopleConfirm={handlePeopleConfirm}
            />
          </div>
        )}

        {/* Search Result State */}
        {hasSearched && (
          <>
            {/* Filters */}
            <div className="px-5 py-3">
              <div className="flex items-center">
                <FilterChips selectedFilters={selectedFilters} onOpen={() => setIsFilterOpen(true)} />
              </div>
            </div>

            {/* Results Count */}
            {!searchError && (
              <div className="px-5 py-3">
                <p className="text-[13px] text-[#999]">
                  {isLoadingResults ? (
                    '1365에서 활동을 찾고 있어요'
                  ) : (
                    <>
                      총 <span className="text-[#2a2a2a] font-semibold">{displayedActivities.length}개</span>의 활동을 찾았어요
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
                  <p className="mt-1.5 text-[13px] text-[#999]">잠시만 기다려주세요</p>
                </div>
              )}
              {!isLoadingResults && searchError && (
                <div className="rounded-3xl bg-white border border-black/5 px-5 py-8 text-center shadow-sm">
                  <p className="text-[15px] font-medium text-[#2a2a2a]">{searchError}</p>
                  <p className="mt-1.5 text-[13px] text-[#999]">검색어나 일정을 조금 바꿔 다시 시도해보세요</p>
                </div>
              )}
              {!isLoadingResults && !searchError && displayedActivities.map((activity) => (
                <CompactActivityCard
                  key={activity.id || `${activity.title}-${activity.date}`}
                  imageUrl={activity.imageUrl}
                  title={activity.title}
                  location={activity.location}
                  recruitmentStartDate={activity.recruitmentStartDate}
                  recruitmentEndDate={activity.recruitmentEndDate}
                  date={activity.date}
                  time={activity.time}
                  isPastActivity={!activity.isRecruiting}
                  showBookmark={true}
                  isSaved={isActivitySaved(activity)}
                  onBookmarkClick={() => onToggleSavedActivity(activity)}
                  onClick={() => handleActivityClick(activity)}
                />
              ))}
              {!isLoadingResults && !searchError && displayedActivities.length === 0 && (
                <div className="rounded-3xl bg-white border border-black/5 px-5 py-8 text-center shadow-sm">
                  <p className="text-[15px] font-medium text-[#2a2a2a]">조건에 맞는 활동이 아직 없어요</p>
                  <p className="mt-1.5 text-[13px] text-[#999]">여행지나 일정을 조금 넓혀 다시 찾아보세요</p>
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
        selectedFilters={selectedFilters}
        onClose={() => setIsFilterOpen(false)}
        onApply={setSelectedFilters}
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
