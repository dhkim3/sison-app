import { useEffect, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { ProfileHeader } from './ProfileHeader';
import { TravelSummaryCard } from './TravelSummaryCard';
import { MemoryCard } from './MemoryCard';
import { SettingsItem } from './SettingsItem';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import {
  AccountSettingsScreen,
  ContactSettingsScreen,
  NotificationSettingsScreen,
  PrivacyPolicyScreen,
  type SettingsDetail,
} from './SettingsDetailScreens';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const [activeSettingsDetail, setActiveSettingsDetail] = useState<SettingsDetail | null>(null);
  const [profile, setProfile] = useState({
    imageUrl: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    nickname: '여행자',
    bio: '여행 속 작은 순간들을 기록하고 있어요',
  });
  const [profileImageObjectUrl, setProfileImageObjectUrl] = useState<string | null>(null);
  const [isBioEditorOpen, setIsBioEditorOpen] = useState(false);
  const bioMaxLength = 72;

  useEffect(() => {
    return () => {
      if (profileImageObjectUrl) {
        URL.revokeObjectURL(profileImageObjectUrl);
      }
    };
  }, [profileImageObjectUrl]);

  const travelSummary = [
    { label: '참여한 활동', count: 12 },
    { label: '저장한 활동', count: 24 },
    { label: '여행 카드', count: 8 },
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

  const handleBackToProfile = () => {
    setActiveSettingsDetail(null);
  };

  const handleProfileImageChange = (file: File) => {
    const nextImageUrl = URL.createObjectURL(file);

    if (profileImageObjectUrl) {
      URL.revokeObjectURL(profileImageObjectUrl);
    }

    setProfileImageObjectUrl(nextImageUrl);
    setProfile((currentProfile) => ({
      ...currentProfile,
      imageUrl: nextImageUrl,
    }));
  };

  const handleNicknameChange = (value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      nickname: value,
    }));
  };

  const handleBioChange = (value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      bio: value.slice(0, bioMaxLength),
    }));
  };

  const renderSettingsDetail = () => {
    if (activeSettingsDetail === 'notifications') {
      return <NotificationSettingsScreen onBack={handleBackToProfile} />;
    }

    if (activeSettingsDetail === 'account') {
      return <AccountSettingsScreen onBack={handleBackToProfile} />;
    }

    if (activeSettingsDetail === 'privacy') {
      return <PrivacyPolicyScreen onBack={handleBackToProfile} />;
    }

    if (activeSettingsDetail === 'contact') {
      return <ContactSettingsScreen onBack={handleBackToProfile} />;
    }

    return null;
  };

  return (
    <>
      <PageShell>
        {activeSettingsDetail ? (
          renderSettingsDetail()
        ) : (
          <>
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
                <ProfileHeader
                  {...profile}
                  onImageChange={handleProfileImageChange}
                  onNicknameChange={handleNicknameChange}
                  onBioClick={() => setIsBioEditorOpen(true)}
                />
              </section>

              {/* Travel Summary */}
              <section className="px-5">
                <div className="grid grid-cols-3 gap-2">
                  {travelSummary.map((item, index) => (
                    <TravelSummaryCard key={index} {...item} />
                  ))}
                </div>
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
                <div className="bg-white rounded-2xl px-5 py-2 shadow-sm border border-black/5">
                  <SettingsItem label="알림 설정" onClick={() => setActiveSettingsDetail('notifications')} />
                  <SettingsItem label="계정 설정" onClick={() => setActiveSettingsDetail('account')} />
                  <SettingsItem label="개인정보 처리방침" onClick={() => setActiveSettingsDetail('privacy')} />
                  <SettingsItem label="문의하기" onClick={() => setActiveSettingsDetail('contact')} />
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
          </>
        )}
      </PageShell>

      {isBioEditorOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="소개 편집 닫기"
            onClick={() => setIsBioEditorOpen(false)}
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-[#fdfcfa] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[#2a2a2a]">나의 한 줄</h3>
                <p className="mt-1 text-[12px] leading-5 text-[#aaa]">여행의 속도를 닮은 문장을 남겨보세요</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBioEditorOpen(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#777] shadow-sm transition-colors hover:bg-[#f8f8f5]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <textarea
                value={profile.bio}
                maxLength={bioMaxLength}
                onChange={(event) => handleBioChange(event.target.value)}
                placeholder="조용한 여행의 문장을 적어보세요"
                rows={4}
                className="w-full resize-none bg-transparent text-[15px] leading-7 text-[#2a2a2a] outline-none placeholder:text-[#bbb]"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-[#bbb]">바로 프로필에 반영돼요</p>
                <span className="text-[11px] text-[#bbb]">{profile.bio.length} / {bioMaxLength}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="profile" onNavigate={onNavigate} />
    </>
  );
}
