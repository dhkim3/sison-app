import { useState } from 'react';
import { SegmentedTabs } from './SegmentedTabs';
import { CompactActivityCard } from './CompactActivityCard';
import { StoryGridCard } from './StoryGridCard';
import { TravelCardCarousel } from './TravelCardCarousel';
import { EmptyState } from './EmptyState';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';

interface SavedArchiveProps {
  onNavigate: (screen: string) => void;
}

export function SavedArchive({ onNavigate }: SavedArchiveProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const savedActivities = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '광안리 해변 환경정화',
      location: '부산 수영구',
      recruitmentStartDate: '2026.07.10',
      recruitmentEndDate: '2026.07.18',
      date: '2026.07.20',
      time: '09:00 - 11:00',
      status: 'recruiting' as const,
      isRecruiting: true,
      distance: '도보 10분',
      description: '광안리 바다를 가까이 느끼며 가볍게 참여할 수 있는 활동이에요. 아침 산책을 겸한 해변 정화 활동으로, 광안리 백사장과 주변 산책로를 따라 걸으며 환경 보호에 참여할 수 있습니다.',
      materials: '장갑, 집게 제공',
      capacity: '20명',
      currentParticipants: '15명',
      recommendation: '여행 일정 안에서 가볍게 참여하기 좋아요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '수영 공원 산책로 정비',
      location: '부산 수영구',
      recruitmentStartDate: '2026.07.12',
      recruitmentEndDate: '2026.07.20',
      date: '2026.07.22',
      time: '14:00 - 16:00',
      status: 'recruiting' as const,
      isRecruiting: true,
      distance: '차량 15분',
      description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다.',
      materials: '편한 복장',
      capacity: '15명',
      currentParticipants: '8명',
      recommendation: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1610093674388-cee0337f2684?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '해운대 바다 지키기',
      location: '부산 해운대구',
      recruitmentStartDate: '2026.06.01',
      recruitmentEndDate: '2026.06.12',
      date: '2026.06.15',
      time: '10:00 - 12:00',
      status: 'completed' as const,
      isRecruiting: false,
      distance: '도보 25분',
      description: '해운대 백사장과 주변 지역의 환경 정화 활동입니다. 바다를 배경으로 뜻깊은 시간을 보낼 수 있습니다.',
      materials: '장갑, 집게 제공',
      capacity: '30명',
      currentParticipants: '22명',
      recommendation: '인기 관광지에서 진행되는 활동이라 여행 코스에 자연스럽게 포함할 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
  ];

  const handleActivityClick = (activity: (typeof savedActivities)[number]) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const stories = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '광안리 해변에서의 아침',
      date: '2026.07.20',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '제주 바다의 석양',
      date: '2026.06.10',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '공원 산책로의 오후',
      date: '2026.05.14',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '비자림의 고요한 산책',
      date: '2026.06.12',
    },
  ];

  const travelCards = [
    {
      photoUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '광안리 해변 환경정화',
      date: '2026.07.20',
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '제주 함덕해수욕장',
      date: '2026.06.10',
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '비자림 산책',
      date: '2026.06.12',
      style: 'polaroid' as const,
    },
  ];

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5">
            <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">보관함</h2>
            <p className="text-[12px] text-[#aaa] mt-0.5">여행 속 작은 순간들</p>
          </div>
        </header>

        {/* Segmented Tabs */}
        <div className="px-5 pt-3 pb-5">
          <SegmentedTabs
            tabs={['저장한 활동', '내 스토리', '여행 카드']}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {/* Saved Activities */}
          {activeTab === 0 && (
            <div className="px-5">
              {savedActivities.length > 0 ? (
                <>
                  <div className="mb-3.5">
                    <p className="text-[12px] text-[#aaa]">
                      {savedActivities.length}개의 활동
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {savedActivities.map((activity, index) => (
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
                        onClick={() => handleActivityClick(activity)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState type="saved" />
              )}
            </div>
          )}

          {/* Stories Grid */}
          {activeTab === 1 && (
            <div className="px-5">
              {stories.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-[12px] text-[#aaa]">
                      여행 중 만난 순간들
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {stories.map((story, index) => (
                      <StoryGridCard key={index} {...story} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState type="stories" />
              )}
            </div>
          )}

          {/* Travel Cards */}
          {activeTab === 2 && (
            <div>
              {travelCards.length > 0 ? (
                <>
                  <div className="px-5 mb-4">
                    <p className="text-[12px] text-[#aaa]">
                      {travelCards.length}개의 카드
                    </p>
                  </div>
                  <TravelCardCarousel cards={travelCards} />
                </>
              ) : (
                <div className="px-5">
                  <EmptyState type="cards" />
                </div>
              )}
            </div>
          )}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="saved" onNavigate={onNavigate} />

      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={() => onNavigate('ai-recommendation')}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
