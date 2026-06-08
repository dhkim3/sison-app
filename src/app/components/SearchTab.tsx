import { useState } from 'react';
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
  };

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
    {
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '안목해변 아침 플로깅',
      location: '강원 강릉시 안목해변',
      distance: '도보 8분',
      recruitmentStartDate: '2026.05.22',
      recruitmentEndDate: '2026.05.28',
      date: '2026.05.30',
      time: '08:00 - 10:00',
      category: '환경정화',
      reason: '커피거리 산책 전 조용히 참여하기 좋아요.',
      isRecruiting: true,
      description: '안목해변 백사장과 커피거리 주변을 천천히 걸으며 작은 쓰레기를 줍는 아침 플로깅입니다. 바다를 바라보며 여행의 시작을 단정하게 열 수 있어요.',
      materials: '생분해 봉투, 집게 제공',
      capacity: '18명',
      currentParticipants: '9명',
      recommendation: '짧은 일정에도 부담 없이 넣기 좋은 해변 활동이에요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '비자림 숲길 표지 정리',
      location: '제주 제주시 구좌읍 비자림',
      distance: '차량 35분',
      recruitmentStartDate: '2026.06.02',
      recruitmentEndDate: '2026.06.08',
      date: '2026.06.11',
      time: '09:30 - 12:00',
      category: '산책형 활동',
      reason: '숲을 천천히 걷는 여행자에게 잘 맞아요.',
      isRecruiting: true,
      description: '비자림 산책로의 낙엽과 작은 가지를 정리하고 안내 표지를 닦는 활동입니다. 깊은 숲의 고요함 속에서 오래 기억될 시간을 만들 수 있어요.',
      materials: '장갑, 손수건, 편한 신발',
      capacity: '12명',
      currentParticipants: '6명',
      recommendation: '활동 뒤 근처 마을 카페에서 쉬어가기 좋은 일정이에요.',
      duration: '2시간 30분',
      difficulty: '보통',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '경주 황리단길 작은 문화 안내',
      location: '경북 경주시 황남동',
      distance: '도보 12분',
      recruitmentStartDate: '2026.06.12',
      recruitmentEndDate: '2026.06.18',
      date: '2026.06.20',
      time: '13:00 - 16:00',
      category: '교육·문화',
      reason: '느린 오후 일정에 어울리는 지역 문화 활동이에요.',
      isRecruiting: true,
      description: '골목 행사 방문객에게 길 안내와 작은 전시 설명을 돕는 활동입니다. 여행자가 지역의 이야기를 조금 더 가까이 만나는 시간이 됩니다.',
      materials: '안내 리플릿 제공',
      capacity: '10명',
      currentParticipants: '4명',
      recommendation: '경주 산책과 자연스럽게 이어지는 조용한 문화 봉사예요.',
      duration: '3시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '여수 돌산 해안 쓰담 걷기',
      location: '전남 여수시 돌산읍',
      distance: '차량 20분',
      recruitmentStartDate: '2026.07.01',
      recruitmentEndDate: '2026.07.07',
      date: '2026.07.09',
      time: '16:00 - 18:00',
      category: '환경정화',
      reason: '노을 전 해안 산책과 함께하기 좋아요.',
      isRecruiting: true,
      description: '돌산 해안 산책길을 따라 걸으며 해변과 방파제 주변을 정리합니다. 바람이 선선해지는 오후에 여수 바다를 돌보는 활동이에요.',
      materials: '장갑, 집게, 물 제공',
      capacity: '16명',
      currentParticipants: '11명',
      recommendation: '활동 후 해질녘 전망대 코스로 이어가기 좋습니다.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
      title: '전주 한옥마을 골목 행사 도우미',
      location: '전북 전주시 완산구 한옥마을',
      distance: '도보 6분',
      recruitmentStartDate: '2026.07.05',
      recruitmentEndDate: '2026.07.12',
      date: '2026.07.14',
      time: '10:00 - 13:00',
      category: '지역 행사',
      reason: '한옥마을의 아침 분위기를 가까이 느낄 수 있어요.',
      isRecruiting: true,
      description: '작은 마을 장터에서 방문객 동선 안내와 체험 부스 정리를 돕습니다. 여행 중 만나는 지역의 생활감이 은근하게 남는 활동입니다.',
      materials: '활동 명찰, 안내문 제공',
      capacity: '14명',
      currentParticipants: '7명',
      recommendation: '전주 골목 여행과 자연스럽게 이어지는 일정이에요.',
      duration: '3시간',
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
    const searchableText = `${activity.title} ${activity.location}`.toLowerCase();
    const matchesDestination = normalizedDestination ? searchableText.includes(normalizedDestination) : true;
    const activityDate = parseActivityDate(activity.date);
    const matchesDate =
      startDate && endDate && activityDate
        ? activityDate >= startDate && activityDate <= endDate
        : true;
    const capacity = Number.parseInt(activity.capacity, 10) || 0;
    const matchesPeople = peopleCount > 0 && capacity > 0 ? capacity >= peopleCount : true;
    const normalizedCategory = categoryLabelMap[activity.category] || activity.category;
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
