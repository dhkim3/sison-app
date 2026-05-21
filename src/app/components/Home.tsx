import { useState } from 'react';
import { Bell } from 'lucide-react';
import { EnhancedSearchCard } from './EnhancedSearchCard';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { CompactActivityCard } from './CompactActivityCard';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';

interface HomeProps {
  onNavigate: (screen: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleCountOpen, setIsPeopleCountOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    return `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  };

  const handleSearch = () => {
    // Only navigate if at least destination is filled
    if (destination.trim()) {
      onNavigate('search');
    }
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
            <button type="button" className="w-10 h-10 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-[38vh] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1639110844938-1bab2d4024f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxLb3JlYW4lMjB0cmF2ZWwlMjBsYW5kc2NhcGUlMjBlbW90aW9uYWwlMjBjYWxtJTIwcGVhY2VmdWx8ZW58MXx8fHwxNzc5MDgyNjQwfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Korean travel landscape"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
            <h2 className="text-white mb-2 leading-snug drop-shadow-sm">
              여행의 작은 틈에서,<br />새로운 시선을 만나보세요.
            </h2>
            <p className="text-white/90 text-sm drop-shadow-sm">
              여행 일정에 맞는 지역 봉사활동을 찾아보세요.
            </p>
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
                onClick={() => { setSelectedActivity(rec); setIsDetailOpen(true); }}
              />
            ))}
          </div>
        </section>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="home" onNavigate={onNavigate} />

      {/* Activity Detail Bottom Sheet */}
      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={() => { setIsDetailOpen(false); onNavigate('ai-recommendation'); }}
          activity={selectedActivity}
        />
      )}
    </>
  );
}
