import { LogOut } from 'lucide-react';
import { ProfileHeader } from './ProfileHeader';
import { TravelSummaryCard } from './TravelSummaryCard';
import { TravelStyleTags } from './TravelStyleTags';
import { MemoryCard } from './MemoryCard';
import { SettingsItem } from './SettingsItem';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const profile = {
    imageUrl: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    nickname: '여행자',
    bio: '여행 속 작은 순간들을 기록하고 있어요',
  };

  const travelSummary = [
    { label: '참여한 활동', count: 12 },
    { label: '저장한 활동', count: 24 },
    { label: '여행 카드', count: 8 },
  ];

  const travelStyleTags = [
    '바다 여행',
    '환경정화',
    '오전 활동',
    '조용한 여행',
    '산책 좋아함',
  ];

  const recentMemories = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '광안리 해변 환경정화',
      date: '2026.07.20',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '제주 함덕해수욕장',
      date: '2026.06.10',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '비자림 산책',
      date: '2026.06.12',
    },
  ];

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5">
            <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">내 정보</h2>
            <p className="text-[12px] text-[#aaa] mt-0.5">나의 여행 기록</p>
          </div>
        </header>

        <div className="pt-3 pb-6 space-y-9">
          {/* Profile Section */}
          <section className="px-5">
            <ProfileHeader {...profile} />
          </section>

          {/* Travel Summary */}
          <section className="px-5">
            <div className="grid grid-cols-3 gap-2">
              {travelSummary.map((item, index) => (
                <TravelSummaryCard key={index} {...item} />
              ))}
            </div>
          </section>

          {/* Travel Style */}
          <section className="px-5">
            <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-4">여행 스타일</h3>
            <TravelStyleTags tags={travelStyleTags} />
          </section>

          {/* Recent Memories */}
          <section>
            <div className="px-5 mb-4">
              <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-1">최근 기록</h3>
              <p className="text-[12px] text-[#aaa]">여행 속 순간들</p>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-hide">
              {recentMemories.map((memory, index) => (
                <MemoryCard key={index} {...memory} />
              ))}
            </div>
          </section>

          {/* Settings */}
          <section className="px-5">
            <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-4">설정</h3>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
              <SettingsItem label="알림 설정" />
              <SettingsItem label="계정 설정" />
              <SettingsItem label="개인정보 처리방침" />
              <SettingsItem label="문의하기" />
            </div>
          </section>

          {/* Logout */}
          <section className="px-5">
            <button type="button" className="w-full py-3 text-sm text-[#999] hover:text-[#5a5a5a] transition-colors flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" strokeWidth={2} />
              <span>로그아웃</span>
            </button>
          </section>
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="profile" onNavigate={onNavigate} />
    </>
  );
}
