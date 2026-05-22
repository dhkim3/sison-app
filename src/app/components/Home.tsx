import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { EnhancedSearchCard } from './EnhancedSearchCard';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { NotificationSheet } from './NotificationSheet';
import type { ActivitySaveRecord } from '../activitySaveState';
import type { SearchState } from '../searchState';

interface HomeProps {
  onNavigate: (screen: string) => void;
  onSearchSubmit: (values: Omit<SearchState, 'hasSearched'>) => void;
  isActivitySaved: (activity: Pick<ActivitySaveRecord, 'title'> & { date?: string }) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

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

export function Home({ onNavigate, onSearchSubmit, isActivitySaved, onToggleSavedActivity }: HomeProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleCountOpen, setIsPeopleCountOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

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

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const formatDateRangeFull = () => {
    if (!startDate || !endDate) return '';
    return `2026.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} - 2026.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;
  };

  const handleSearch = () => {
    onSearchSubmit({
      destination,
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

  const handlePeopleConfirm = (count: number) => {
    setPeopleCount(count);
  };

  const recommendations = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      title: '광안리 해변 환경정화',
      location: '부산 수영구 광안리해수욕장',
      recruitmentStartDate: '2026.05.20',
      recruitmentEndDate: '2026.05.23',
      date: '2026.05.24',
      time: '09:00 - 11:00',
      distance: '도보 10분',
      isRecruiting: true,
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
      location: '부산 수영구 수영 근린공원',
      recruitmentStartDate: '2026.05.20',
      recruitmentEndDate: '2026.05.23',
      date: '2026.05.24',
      time: '14:00 - 16:00',
      distance: '차량 15분',
      isRecruiting: true,
      description: '공원 산책로를 따라 걸으며 간단한 정비 활동을 합니다. 벤치 청소, 꽃길 관리 등 가벼운 활동으로 구성되어 있습니다.',
      materials: '편한 복장',
      capacity: '15명',
      currentParticipants: '8명',
      recommendation: '오후 시간을 활용해 여유롭게 참여할 수 있어요.',
      duration: '2시간',
      difficulty: '쉬움',
      indoorOutdoor: '실외',
    },
  ];

  return (
    <>
      <PageShell>
        {/* Top Navigation */}
        <header className="sticky top-0 z-10 bg-[#fdfcfa]/95 backdrop-blur-sm">
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
              여행 일정에 맞는 지역 봉사활동을 찾아보세요.
            </p>
          </div>
          <div className="absolute bottom-3 right-5 flex items-center gap-1.5" aria-hidden="true">
            {heroImages.map((image, index) => (
              <span
                key={`${image.src}-indicator`}
                className={`h-1 rounded-full bg-white transition-all duration-700 ${
                  index === activeHeroIndex ? 'w-5 opacity-55' : 'w-1 opacity-25'
                }`}
              />
            ))}
          </div>
        </section>

        {/* Enhanced Search Card */}
        <section className="px-5 -mt-4 relative z-10">
          <EnhancedSearchCard
            destination={destination}
            dateRange={formatDateRange()}
            peopleCount={peopleCount}
            onDestinationClick={() => {}}
            onDateClick={() => setIsCalendarOpen(true)}
            onPeopleClick={() => setIsPeopleCountOpen(true)}
            onSearch={handleSearch}
            onDestinationChange={setDestination}
          />
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

        {/* Curated Recommendations */}
        <section className="px-5 mt-9 mb-8">
          <div className="mb-3.5">
            <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-1">여행 중 가볍게 참여하기 좋은 활동</h3>
            <p className="text-[12px] text-[#aaa]">부담 없이 시작할 수 있어요</p>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((rec, index) => (
              <CompactActivityCard
                key={index}
                imageUrl={rec.imageUrl}
                title={rec.title}
                location={rec.location}
                recruitmentStartDate={rec.recruitmentStartDate}
                recruitmentEndDate={rec.recruitmentEndDate}
                date={rec.date}
                time={rec.time}
                showBookmark
                isSaved={isActivitySaved(rec)}
                onBookmarkClick={() => onToggleSavedActivity(rec)}
                onClick={() => { setSelectedActivity(rec); setIsDetailOpen(true); }}
              />
            ))}
          </div>
        </section>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="home" onNavigate={onNavigate} />

      {/* Notifications */}
      <NotificationSheet
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Activity Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={() => { setIsDetailOpen(false); onNavigate('ai-recommendation'); }}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
