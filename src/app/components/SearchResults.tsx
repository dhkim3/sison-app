import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SearchSummaryCard } from './SearchSummaryCard';
import { FilterChips } from './FilterChips';
import { SortDropdown } from './SortDropdown';
import { SearchHistory } from './SearchHistory';
import { SearchResultCard } from './SearchResultCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';

interface SearchResultsProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  isActivitySaved?: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity?: (activity: ActivitySaveRecord) => void;
}

export function SearchResults({
  onNavigate,
  isActivitySaved = () => false,
  onToggleSavedActivity,
}: SearchResultsProps) {
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filters = ['오전', '오후', '실내', '실외', '2시간 이하', '모집중', '환경정화'];
  const sortOptions = ['추천순', '가까운순', '마감순', '최신순'];

  const historyItems = [
    { location: '광안리', dates: '7/20~7/22', people: '2명' },
    { location: '제주', dates: '6/10~6/12', people: '1명' },
    { location: '강릉', dates: '5/14~5/16', people: '2명' },
  ];

  const activities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxLb3JlYW4lMjBiZWFjaCUyMGNsZWFudXAlMjB2b2x1bnRlZXIlMjBlbnZpcm9ubWVudGFsfGVufDF8fHx8MTc3OTA4MzAyMXww&ixlib=rb-4.1.0&q=80&w=1080',
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      distance: '도보 10분',
      time: '09:00 - 11:00',
      reason: '여행 일정 안에서 가볍게 참여하기 좋아요.',
      isRecruiting: true,
      description: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 아침 산책을 겸한 해변 정화 활동으로, 광안리 백사장과 주변 산책로를 따라 걸으며 환경 보호에 참여할 수 있습니다. 여행의 첫 아침을 의미있게 시작해보세요. 활동 후에는 근처 카페에서 오션뷰를 즐기며 여유로운 시간을 보낼 수 있어요.',
      materials: '장갑, 집게 제공',
      capacity: '20명',
      currentParticipants: '15명',
      recommendation: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 여행 중 부담 없이 새로운 경험을 만들기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxLb3JlYW4lMjBwYXJrJTIwbmF0dXJlJTIwd2Fsa2luZyUyMHBlYWNlZnVsfGVufDF8fHx8MTc3OTA4MzAyMnww&ixlib=rb-4.1.0&q=80&w=1080',
      title: '수영 공원 산책로 정비',
      location: '부산 수영구 수영 근린공원',
      distance: '차량 15분',
      time: '14:00 - 16:00',
      reason: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
      isRecruiting: true,
      description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다. 도심 속 자연을 가꾸며 지역 커뮤니티에 기여할 수 있는 활동이에요.',
      materials: '편한 복장',
      capacity: '15명',
      currentParticipants: '8명',
      recommendation: '공원 산책을 즐기면서 자연스럽게 봉사할 수 있는 활동입니다. 여유로운 오후 시간을 의미있게 보낼 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1610093674388-cee0337f2684?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxLb3JlYW4lMjBiZWFjaCUyMGNsZWFudXAlMjB2b2x1bnRlZXIlMjBlbnZpcm9ubWVudGFsfGVufDF8fHx8MTc3OTA4MzAyMXww&ixlib=rb-4.1.0&q=80&w=1080',
      title: '해운대 바다 지키기',
      location: '부산 해운대구 해운대 해수욕장',
      distance: '도보 25분',
      time: '10:00 - 12:00',
      reason: '해변 풍경을 즐기며 환경 보호에 참여해보세요.',
      isRecruiting: true,
      description: '해운대 백사장과 주변 지역의 환경 정화 활동입니다. 바다를 배경으로 뜻깊은 시간을 보낼 수 있습니다. 활동 후에는 해운대 구석구석을 탐험하며 여행을 이어갈 수 있어요.',
      materials: '장갑, 집게 제공',
      capacity: '30명',
      currentParticipants: '22명',
      recommendation: '인기 관광지에서 진행되는 활동이라 여행 코스에 자연스럽게 포함할 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1636625093308-e29128dbbc08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxLb3JlYW4lMjBjb21tdW5pdHklMjBnYXJkZW4lMjBsaWJyYXJ5JTIwY3VsdHVyYWwlMjBjZW50ZXJ8ZW58MXx8fHwxNzc5MDgzMDIyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      title: '지역 문화센터 행사 도우미',
      location: '부산 중구 부산 문화회관',
      distance: '차량 20분',
      time: '15:00 - 18:00',
      reason: '부산의 문화 행사를 직접 체험할 수 있어요.',
      isRecruiting: false,
      description: '지역 문화 행사를 돕는 활동입니다. 관람객 안내, 간단한 운영 지원 등을 담당합니다. 부산의 문화 활동을 가까이서 경험할 수 있는 특별한 기회예요.',
      materials: '편한 복장',
      capacity: '10명',
      currentParticipants: '10명',
      recommendation: '부산의 문화 활동을 가까이서 경험할 수 있는 특별한 기회입니다.',
      duration: '3시간',
      difficulty: '보통',
      indoorOutdoor: '실내',
    },
  ];

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => onNavigate('home')}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
            </button>
            <h2>검색 결과</h2>
          </div>

          {/* Sticky Search Summary */}
          <div className="px-6 pb-4">
            <SearchSummaryCard
              destination="광안리"
              dateRange="2026.07.20 - 2026.07.22"
              people="2명"
            />
          </div>
        </header>

        {/* Filters & Sort */}
        <div className="px-6 py-4 space-y-4 border-b border-black/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 overflow-hidden">
              <FilterChips filters={filters} />
            </div>
            <SortDropdown options={sortOptions} defaultOption="추천순" />
          </div>
        </div>

        {/* Search History */}
        <div className="px-6 py-6 border-b border-black/5">
          <SearchHistory items={historyItems} />
        </div>

        {/* Results Count */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#5a5a5a]">
            총 <span className="text-[#2a2a2a] font-medium">{activities.length}개</span>의 활동을 찾았어요
          </p>
        </div>

        {/* Activity Cards */}
        <div className="px-6 space-y-4 pb-8">
          {activities.map((activity, index) => (
            <SearchResultCard
              key={index}
              {...activity}
              isSaved={isActivitySaved(activity)}
              onBookmarkClick={() => onToggleSavedActivity?.(activity)}
              onClick={() => handleActivityClick(activity)}
            />
          ))}
        </div>
      </PageShell>
      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="search" onNavigate={onNavigate} />

      {/* Enhanced Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={(activity) => onNavigate('ai-recommendation', { activity, returnScreen: 'search' })}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity?.(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
