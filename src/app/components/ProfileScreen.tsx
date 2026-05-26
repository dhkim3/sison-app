import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, LogOut, X } from 'lucide-react';
import { ProfileHeader } from './ProfileHeader';
import { TravelSummaryCard } from './TravelSummaryCard';
import { SettingsItem } from './SettingsItem';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { StoryCard } from './story/StoryCard';
import { StoryDetailSheet } from './story/StoryDetailSheet';
import type { StoryItem } from './story/storyTypes';
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
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [profile, setProfile] = useState({
    imageUrl: 'https://images.unsplash.com/photo-1516962126636-27ad087061cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
    nickname: '여행자',
    bio: '여행 속 작은 순간들을 기록하고 있어요',
  });
  const [profileImageObjectUrl, setProfileImageObjectUrl] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [draftImageObjectUrl, setDraftImageObjectUrl] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const draftImageObjectUrlRef = useRef<string | null>(null);
  const bioMaxLength = 72;

  useEffect(() => {
    return () => {
      if (profileImageObjectUrl) {
        URL.revokeObjectURL(profileImageObjectUrl);
      }
    };
  }, [profileImageObjectUrl]);

  useEffect(() => {
    return () => {
      if (draftImageObjectUrlRef.current) {
        URL.revokeObjectURL(draftImageObjectUrlRef.current);
      }
    };
  }, []);

  const travelSummary = [
    { label: '참여한 활동', count: 12 },
    { label: '저장한 활동', count: 24 },
    { label: '여행 카드', count: 8 },
  ];

  const myStories: Array<StoryItem & { date: string }> = [
    {
      id: 301,
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '광안리 해변에서의 아침',
      region: '부산',
      author: profile.nickname,
      likes: 16,
      comments: 4,
      body: '광안리의 아침은 생각보다 조용했어요. 짧은 정화 활동을 마치고 바라본 바다는 여행의 속도를 한 번 늦춰주는 장면처럼 남았습니다.',
      relatedActivity: '광안리 해변 환경정화',
      date: '2026.07.20',
    },
    {
      id: 302,
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '제주 바다의 석양',
      region: '제주',
      author: profile.nickname,
      likes: 11,
      comments: 2,
      body: '하루 끝에 만난 제주 바다는 오래 바라보고 싶은 색이었어요. 작은 활동 뒤에 남은 고요함이 여행의 기억을 더 선명하게 만들어줬습니다.',
      relatedActivity: '함덕해수욕장 해양 환경 정화 봉사',
      date: '2026.06.10',
    },
    {
      id: 303,
      imageUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '비자림의 고요한 산책',
      region: '제주',
      author: profile.nickname,
      likes: 13,
      comments: 3,
      body: '비자림 안쪽으로 들어갈수록 말수가 줄어드는 기분이었어요. 길을 천천히 살피며 걷는 시간이 여행과 봉사 사이를 부드럽게 이어줬습니다.',
      relatedActivity: '제주 숲길 산책로 정비',
      date: '2026.06.12',
    },
    {
      id: 304,
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '안목해변 커피 향 사이로',
      region: '강원',
      author: profile.nickname,
      likes: 9,
      comments: 2,
      body: '해변을 걷고 돌아오는 길에 커피 향이 먼저 다가왔어요. 작은 봉투 하나를 채운 아침이 이상하게 오래 기억났습니다.',
      relatedActivity: '안목해변 아침 플로깅',
      date: '2026.05.30',
    },
    {
      id: 305,
      imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '통영 항구의 느린 오후',
      region: '경남',
      author: profile.nickname,
      likes: 10,
      comments: 2,
      body: '행사 안내판을 세우고 의자를 정리하는 사이 항구의 오후가 천천히 지나갔어요. 낯선 곳을 잠깐 도왔다는 감각이 좋았습니다.',
      relatedActivity: '통영 항구 마을 행사 도우미',
      date: '2026.04.26',
    },
    {
      id: 306,
      imageUrl: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      title: '속초 호숫가의 맑은 바람',
      region: '강원',
      author: profile.nickname,
      likes: 7,
      comments: 1,
      body: '영랑호 산책로를 정리하고 잠시 물가에 앉았어요. 바람이 맑아서 봉사 뒤의 조용한 피로까지 여행처럼 느껴졌습니다.',
      relatedActivity: '속초 영랑호 산책로 정비',
      date: '2026.03.28',
    },
  ];
  const recentStories = [...myStories].sort((a, b) => b.date.localeCompare(a.date));

  const handleBackToProfile = () => {
    setActiveSettingsDetail(null);
  };

  const openProfileEditor = () => {
    setProfileDraft(profile);
    if (draftImageObjectUrl) {
      URL.revokeObjectURL(draftImageObjectUrl);
      draftImageObjectUrlRef.current = null;
      setDraftImageObjectUrl(null);
    }
    setIsProfileEditorOpen(true);
  };

  const closeProfileEditor = () => {
    if (draftImageObjectUrl) {
      URL.revokeObjectURL(draftImageObjectUrl);
      draftImageObjectUrlRef.current = null;
      setDraftImageObjectUrl(null);
    }
    setProfileDraft(profile);
    setIsProfileEditorOpen(false);
  };

  const handleDraftImageChange = (file: File) => {
    const nextImageUrl = URL.createObjectURL(file);

    if (draftImageObjectUrl) {
      URL.revokeObjectURL(draftImageObjectUrl);
    }

    setDraftImageObjectUrl(nextImageUrl);
    draftImageObjectUrlRef.current = nextImageUrl;
    setProfileDraft((currentProfile) => ({
      ...currentProfile,
      imageUrl: nextImageUrl,
    }));
  };

  const handleDraftBioChange = (value: string) => {
    setProfileDraft((currentProfile) => ({
      ...currentProfile,
      bio: value.slice(0, bioMaxLength),
    }));
  };

  const saveProfileDraft = () => {
    const nextProfile = {
      ...profileDraft,
      nickname: profileDraft.nickname.trim() || '여행자',
      bio: profileDraft.bio.trim() || '여행 속 작은 순간들을 기록하고 있어요',
    };

    if (draftImageObjectUrl) {
      if (profileImageObjectUrl) {
        URL.revokeObjectURL(profileImageObjectUrl);
      }
      setProfileImageObjectUrl(draftImageObjectUrl);
      draftImageObjectUrlRef.current = null;
      setDraftImageObjectUrl(null);
    }

    setProfile(nextProfile);
    setProfileDraft(nextProfile);
    setIsProfileEditorOpen(false);
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
                  onEditClick={openProfileEditor}
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

              {/* Recent Stories */}
              <section className="px-5">
                <div className="mb-4">
                  <h3 className="text-[15px] font-semibold text-[#2a2a2a] mb-1">최근 스토리</h3>
                  <p className="text-[12px] text-[#aaa]">여행 속 순간들</p>
                </div>
                <div
                  className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-hide"
                  style={{ scrollSnapType: 'x mandatory' }}
                >
                  {recentStories.map((story) => (
                    <div
                      key={story.id}
                      className="flex-shrink-0"
                      style={{
                        width: 'calc((min(100vw, 430px) - 52px) / 2)',
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <StoryCard
                        story={story}
                        layout="grid"
                        onClick={setSelectedStory}
                      />
                    </div>
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

      {isProfileEditorOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="프로필 편집 닫기"
            onClick={closeProfileEditor}
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[#fdfcfa] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[#2a2a2a]">프로필 편집</h3>
                <p className="mt-1 text-[12px] leading-5 text-[#aaa]">여행자다운 이름과 문장을 함께 다듬어보세요</p>
              </div>
              <button
                type="button"
                onClick={closeProfileEditor}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#777] shadow-sm transition-colors hover:bg-[#f8f8f5]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-[#f0f0eb] shadow-sm">
                  {profileDraft.imageUrl ? (
                    <img src={profileDraft.imageUrl} alt={profileDraft.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#eef5ef] text-[24px] font-semibold text-[#8ab99d]">
                      {profileDraft.nickname.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#2a2a2a]">프로필 사진</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#aaa]">여행의 분위기가 느껴지는 사진을 골라주세요</p>
                  <button
                    type="button"
                    onClick={() => profileImageInputRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#f8f8f5] px-3 py-1.5 text-[12px] font-medium text-[#6f8b78] transition-colors hover:bg-[#f1f6f2]"
                  >
                    <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                    사진 선택
                  </button>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleDraftImageChange(file);
                      }
                      event.target.value = '';
                    }}
                  />
                </div>
              </div>
              <div className="mt-5">
                <label className="text-[12px] font-medium text-[#777]" htmlFor="profile-nickname">
                  닉네임
                </label>
                <input
                  id="profile-nickname"
                  type="text"
                  value={profileDraft.nickname}
                  maxLength={16}
                  onChange={(event) => setProfileDraft((currentProfile) => ({
                    ...currentProfile,
                    nickname: event.target.value,
                  }))}
                  className="mt-2 w-full rounded-2xl bg-[#f8f8f5] px-4 py-3 text-[15px] font-medium text-[#2a2a2a] outline-none ring-1 ring-black/5 transition-shadow focus:ring-[#a8d5ba]/70"
                />
              </div>
              <div className="mt-4">
                <label className="text-[12px] font-medium text-[#777]" htmlFor="profile-bio">
                  소개
                </label>
                <textarea
                  id="profile-bio"
                  value={profileDraft.bio}
                  maxLength={bioMaxLength}
                  onChange={(event) => handleDraftBioChange(event.target.value)}
                  placeholder="조용한 여행의 문장을 적어보세요"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl bg-[#f8f8f5] px-4 py-3 text-[15px] leading-7 text-[#2a2a2a] outline-none ring-1 ring-black/5 transition-shadow placeholder:text-[#bbb] focus:ring-[#a8d5ba]/70"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-[#bbb]">저장하면 프로필에 반영돼요</p>
                <span className="text-[11px] text-[#bbb]">{profileDraft.bio.length} / {bioMaxLength}</span>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={closeProfileEditor}
                  className="flex-1 rounded-2xl bg-[#f8f8f5] py-3 text-[14px] font-medium text-[#777] transition-colors hover:bg-[#f1f1ec]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveProfileDraft}
                  className="flex-1 rounded-2xl bg-[#a8d5ba] py-3 text-[14px] font-semibold text-[#2f5c42] transition-colors hover:bg-[#9bcdae]"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StoryDetailSheet
        story={selectedStory}
        isOpen={selectedStory !== null}
        onClose={() => setSelectedStory(null)}
      />

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="profile" onNavigate={onNavigate} />
    </>
  );
}
