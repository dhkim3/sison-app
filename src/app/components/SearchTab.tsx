import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DefaultSearchState } from './DefaultSearchState';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { SearchSummaryCard } from './SearchSummaryCard';
import { SearchConditionsBottomSheet } from './SearchConditionsBottomSheet';
import { FilterChips } from './FilterChips';
import { SortDropdown } from './SortDropdown';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import type { ActivitySaveRecord } from '../activitySaveState';
import type { SearchState } from '../searchState';

interface SearchTabProps {
  onNavigate: (screen: string) => void;
  searchState: SearchState;
  onSearchStateChange: (state: SearchState) => void;
  isActivitySaved: (activity: Pick<ActivitySaveRecord, 'title'> & { date?: string }) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

export function SearchTab({
  onNavigate,
  searchState,
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
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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
  };

  const handleBackToExploration = () => {
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
  };

  const filters = ['환경정화', '지역 행사', '교육·문화', '산책형 활동', '오전', '오후', '실내', '실외', '2시간 이하', '모집중'];
  const sortOptions = ['추천순', '가까운순', '마감순', '최신순'];
  const categoryFilters = ['환경정화', '지역 행사', '교육·문화', '산책형 활동'];

  const activities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      distance: '도보 10분',
      recruitmentStartDate: '2026.05.20',
      recruitmentEndDate: '2026.05.23',
      date: '2026.05.24',
      time: '09:00 - 11:00',
      category: '환경정화',
      reason: '여행 일정 안에서 가볍게 참여하기 좋아요.',
      isRecruiting: true,
      description: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 아침 산책을 겸한 해변 정화 활동으로, 광안리 백사장과 주변 산책로를 따라 걸으며 환경 보호에 참여할 수 있습니다.',
      materials: '장갑, 집게 제공',
      capacity: '20명',
      currentParticipants: '15명',
      recommendation: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 여행 중 부담 없이 새로운 경험을 만들기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '수영 공원 산책로 정비',
      location: '부산 수영구 수영 근린공원',
      distance: '차량 15분',
      recruitmentStartDate: '2026.05.20',
      recruitmentEndDate: '2026.05.23',
      date: '2026.05.24',
      time: '14:00 - 16:00',
      category: '산책형 활동',
      reason: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
      isRecruiting: true,
      description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다.',
      materials: '편한 복장',
      capacity: '15명',
      currentParticipants: '8명',
      recommendation: '공원 산책을 즐기면서 자연스럽게 봉사할 수 있는 활동입니다. 여유로운 오후 시간을 의미있게 보낼 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
  ];

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
    const selectedCategories = selectedFilters.filter((filter) => categoryFilters.includes(filter));
    const searchableText = `${activity.title} ${activity.location}`.toLowerCase();
    const matchesDestination = normalizedDestination ? searchableText.includes(normalizedDestination) : true;
    const activityDate = parseActivityDate(activity.date);
    const matchesDate =
      startDate && endDate && activityDate
        ? activityDate >= startDate && activityDate <= endDate
        : true;
    const capacity = Number.parseInt(activity.capacity, 10) || 0;
    const matchesPeople = peopleCount > 0 && capacity > 0 ? capacity >= peopleCount : true;
    const matchesFilters = selectedFilters.every((filter) => {
      if (categoryFilters.includes(filter)) return true;
      if (filter === '오전') return activity.time.includes('09:') || activity.time.includes('10:') || activity.time.includes('11:');
      if (filter === '오후') return activity.time.includes('12:') || activity.time.includes('13:') || activity.time.includes('14:') || activity.time.includes('15:') || activity.time.includes('16:') || activity.time.includes('17:');
      if (filter === '실내' || filter === '실외') return activity.indoorOutdoor === filter;
      if (filter === '2시간 이하') return activity.duration.includes('2시간') || activity.duration.includes('1시간');
      if (filter === '모집중') return activity.isRecruiting;

      return true;
    });
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(activity.category);

    return matchesDestination && matchesDate && matchesPeople && matchesFilters && matchesCategory;
  });

  const currentSummaryDateRange = summaryDateRange || formatDateRangeFull();
  const currentPeopleCount = summaryPeople ? Number.parseInt(summaryPeople, 10) || peopleCount : peopleCount;

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              {hasSearched && (
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
            {/* Filters & Sort */}
            <div className="px-5 py-3 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                  <FilterChips filters={filters} selectedFilters={selectedFilters} onFilterChange={setSelectedFilters} />
                </div>
                <SortDropdown options={sortOptions} defaultOption="추천순" />
              </div>
            </div>

            {/* Results Count */}
            <div className="px-5 py-3">
              <p className="text-[13px] text-[#999]">
                총 <span className="text-[#2a2a2a] font-semibold">{displayedActivities.length}개</span>의 활동을 찾았어요
              </p>
            </div>

            {/* Activity Cards */}
            <div className="px-5 space-y-2.5 pb-8">
              {displayedActivities.map((activity, index) => (
                <CompactActivityCard
                  key={index}
                  imageUrl={activity.imageUrl}
                  title={activity.title}
                  location={activity.location}
                  recruitmentStartDate={activity.recruitmentStartDate}
                  recruitmentEndDate={activity.recruitmentEndDate}
                  date={activity.date}
                  time={activity.time}
                  showBookmark={true}
                  isSaved={isActivitySaved(activity)}
                  onBookmarkClick={() => onToggleSavedActivity(activity)}
                  onClick={() => handleActivityClick(activity)}
                />
              ))}
              {displayedActivities.length === 0 && (
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

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="search" onNavigate={onNavigate} />

      {/* Enhanced Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={() => onNavigate('ai-recommendation')}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
