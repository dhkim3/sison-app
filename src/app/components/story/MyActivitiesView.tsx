import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { CompactActivityCard } from '../CompactActivityCard';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';

interface Activity {
  id: number;
  title: string;
  location: string;
  region: string;
  recruitmentStartDate: string;
  recruitmentEndDate: string;
  date: string;
  time: string;
  status: string;
  participants: string;
  imageUrl: string;
}

interface MyActivitiesViewProps {
  activities: Activity[];
  onBack: () => void;
  onSelectActivity: (activity: Activity) => void;
  onNavigate: (screen: string) => void;
}

export function MyActivitiesView({
  activities,
  onBack,
  onSelectActivity,
  onNavigate,
}: MyActivitiesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('전체');

  const tabOptions = ['전체', '완료한 활동', '보관한 활동'];

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      searchQuery === '' ||
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.region.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    if (activeTab === '완료한 활동') {
      matchesTab = activity.status === '참여 완료';
    } else if (activeTab === '보관한 활동') {
      matchesTab = activity.status === '종료됨';
    }

    return matchesSearch && matchesTab;
  });

  const isPastActivity = (activity: Activity) => {
    const match = activity.date.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    const activityDate = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activity.status === '참여 완료' || activity.status === '종료됨' || (activityDate !== null && activityDate < today);
  };

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-6 py-3.5">
            <div className="flex items-center gap-3 mb-0.5">
              <button
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
              </button>
              <h2>어떤 활동의 기록을 남길까요?</h2>
            </div>
            <p className="text-[13px] text-[#bbb] pl-11">지난 여행의 활동을 선택해보세요</p>
          </div>

          {/* Search Bar */}
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" strokeWidth={2} />
              <input
                type="text"
                placeholder="활동이나 장소를 검색해보세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f8f5] rounded-xl text-[13px] placeholder:text-[#bbb] outline-none focus:bg-white focus:ring-1 focus:ring-[#a8d5ba]/40 transition-all"
              />
            </div>
          </div>

          {/* Content Tabs */}
          <div className="px-6 pb-3">
            <div className="flex gap-2">
              {tabOptions.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[14px] font-medium rounded-xl transition-all ${
                    activeTab === tab
                      ? 'bg-[#2a2a2a] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                      : 'bg-[#f8f8f5] text-[#999] hover:bg-[#e8f5ed] hover:text-[#5a5a5a]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Activities List */}
        <div className="px-6 py-4">
          {filteredActivities.length > 0 ? (
            <div className="space-y-2.5">
              {filteredActivities.map((activity) => (
                <CompactActivityCard
                  key={activity.id}
                  imageUrl={activity.imageUrl}
                  title={activity.title}
                  location={activity.location}
                  recruitmentStartDate={activity.recruitmentStartDate}
                  recruitmentEndDate={activity.recruitmentEndDate}
                  date={activity.date}
                  time={activity.time}
                  isPastActivity={isPastActivity(activity)}
                  onClick={() => onSelectActivity(activity)}
                />
              ))}
            </div>
          ) : (
            // Empty State
            <div className="text-center py-16">
              <p className="text-[13px] text-[#999] mb-1">
                {searchQuery || activeTab !== '전체'
                  ? '검색 결과가 없어요'
                  : '아직 기록할 활동이 없어요'}
              </p>
              <p className="text-[11px] text-[#bbb]">
                {searchQuery || activeTab !== '전체'
                  ? '다른 조건으로 검색해보세요'
                  : '참여를 마친 활동이 생기면 이곳에 모아둘게요'}
              </p>
              {!searchQuery && activeTab === '전체' && (
                <button
                  onClick={() => onNavigate('search')}
                  className="mt-5 px-5 py-2.5 bg-[#2a2a2a] text-white rounded-xl text-[13px] hover:bg-[#1a1a1a] transition-colors"
                >
                  활동 찾아보기
                </button>
              )}
            </div>
          )}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
