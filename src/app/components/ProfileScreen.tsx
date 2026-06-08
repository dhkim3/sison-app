import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image as ImageIcon, LogOut, X } from 'lucide-react';
import { ProfileHeader } from './ProfileHeader';
import { TravelSummaryCard } from './TravelSummaryCard';
import { SettingsItem } from './SettingsItem';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import {
  AccountSettingsScreen,
  ContactSettingsScreen,
  NotificationSettingsScreen,
  PrivacyPolicyScreen,
  type SettingsDetail,
} from './SettingsDetailScreens';
import type { SavedArchiveTab } from './SavedArchive';

interface ProfileScreenProps {
  onNavigate: (screen: string, options?: { savedTab?: SavedArchiveTab }) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const [activeSettingsDetail, setActiveSettingsDetail] = useState<SettingsDetail | null>(null);
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
  useBottomSheetScrollLock(isProfileEditorOpen);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeSettingsDetail]);

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
    { label: '저장한 활동', count: 24, savedTab: 0 as const },
    { label: '내 스토리', count: 7, savedTab: 1 as const },
    { label: '여행 카드', count: 8, savedTab: 2 as const },
  ];

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
            <header className="sison-top-bar sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
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
                    <TravelSummaryCard
                      key={index}
                      label={item.label}
                      count={item.count}
                      onClick={() => onNavigate('saved', { savedTab: item.savedTab })}
                    />
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
        <div className="bottom-sheet-viewport z-40">
          <button
            type="button"
            aria-label="프로필 편집 닫기"
            onClick={closeProfileEditor}
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
          />
          <div
            className="bottom-sheet-panel absolute bottom-0 left-0 right-0 overflow-y-auto rounded-t-[28px] bg-[#fdfcfa] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
            data-bottom-sheet-scrollable="true"
          >
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

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="profile" onNavigate={onNavigate} />
    </>
  );
}
