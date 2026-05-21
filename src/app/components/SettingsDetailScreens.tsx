import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Bell, ChevronRight, LogOut, Mail, MapPin, User, X } from 'lucide-react';

export type SettingsDetail = 'notifications' | 'account' | 'privacy' | 'contact';

interface SettingsDetailLayoutProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

interface SettingsRowProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger' | 'muted';
}

function SettingsDetailLayout({ title, subtitle, onBack, children }: SettingsDetailLayoutProps) {
  return (
    <div className="screen-transition">
      <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
        <div className="px-5 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="설정으로 돌아가기"
            className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center hover:bg-[#f8f8f5] transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-[#2a2a2a]" strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">{title}</h2>
            <p className="text-[12px] text-[#aaa] mt-0.5">{subtitle}</p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-3 pb-8 space-y-5">{children}</div>
    </div>
  );
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section>
      {(title || description) && (
        <div className="mb-3">
          {title && <h3 className="text-[15px] font-semibold text-[#2a2a2a]">{title}</h3>}
          {description && <p className="mt-1 text-[12px] leading-5 text-[#aaa]">{description}</p>}
        </div>
      )}
      <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, icon, right, onClick, tone = 'default' }: SettingsRowProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-2xl bg-[#f8f8f5] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <p className={`text-[14px] font-medium ${tone === 'danger' ? 'text-[#b76e65]' : 'text-[#2a2a2a]'}`}>
            {label}
          </p>
          {description && <p className="mt-1 text-[12px] leading-5 text-[#999]">{description}</p>}
        </div>
      </div>
      {right}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left border-b border-black/5 last:border-0 hover:bg-[#fbfbf8] transition-colors"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-black/5 last:border-0">
      {content}
    </div>
  );
}

function SoftSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? 'bg-[#6fb58a]' : 'bg-[#e8e6df]'
      }`}
      aria-pressed={checked}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

export function NotificationSettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState({
    recommendations: true,
    reminders: true,
    savedRegions: false,
    stories: true,
  });

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <SettingsDetailLayout
      title="알림 설정"
      subtitle="여행의 흐름을 방해하지 않는 알림만 남겨요"
      onBack={onBack}
    >
      <SettingsSection description="필요한 순간에만 부드럽게 알려드릴게요.">
        <SettingsRow
          label="활동 추천 알림"
          description="여행지와 일정에 어울리는 활동이 있을 때"
          icon={<Bell className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          right={<SoftSwitch checked={settings.recommendations} onChange={(value) => updateSetting('recommendations', value)} />}
        />
        <SettingsRow
          label="여행 일정 리마인드"
          description="참여 예정 활동 전날 가볍게 알려드려요"
          icon={<Bell className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          right={<SoftSwitch checked={settings.reminders} onChange={(value) => updateSetting('reminders', value)} />}
        />
        <SettingsRow
          label="저장한 지역 새 활동 알림"
          description="관심 지역에 새 활동이 열리면 알려드려요"
          icon={<MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />}
          right={<SoftSwitch checked={settings.savedRegions} onChange={(value) => updateSetting('savedRegions', value)} />}
        />
        <SettingsRow
          label="스토리 업데이트 알림"
          description="내가 남긴 시선과 연결된 소식"
          icon={<Bell className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          right={<SoftSwitch checked={settings.stories} onChange={(value) => updateSetting('stories', value)} />}
        />
      </SettingsSection>
    </SettingsDetailLayout>
  );
}

export function AccountSettingsScreen({ onBack }: { onBack: () => void }) {
  const interestRegions = ['부산', '제주', '강릉'];

  return (
    <SettingsDetailLayout
      title="계정 설정"
      subtitle="나의 여행 기록이 머무는 공간"
      onBack={onBack}
    >
      <section className="rounded-3xl bg-white border border-black/5 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1516962126636-27ad087061cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200"
            alt="프로필 이미지"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <p className="text-[16px] font-semibold text-[#2a2a2a]">여행자</p>
            <p className="mt-1 text-[12px] text-[#999]">여행 속 작은 순간들을 기록하고 있어요</p>
          </div>
        </div>
      </section>

      <SettingsSection title="기본 정보">
        <SettingsRow
          label="닉네임"
          description="여행자"
          icon={<User className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          right={<ChevronRight className="w-4 h-4 text-[#ccc]" strokeWidth={2} />}
        />
        <SettingsRow
          label="이메일"
          description="traveler@sison.app"
          icon={<Mail className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
        />
      </SettingsSection>

      <SettingsSection title="관심 지역" description="자주 떠나는 곳을 중심으로 추천을 정리해요.">
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {interestRegions.map((region) => (
            <button
              key={region}
              type="button"
              className="rounded-full bg-[#eef7f2] px-3 py-2 text-[12px] font-medium text-[#4f8d67]"
            >
              {region}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          label="로그아웃"
          icon={<LogOut className="w-4 h-4 text-[#999]" strokeWidth={2} />}
          tone="muted"
        />
        <SettingsRow
          label="계정 탈퇴"
          description="기록을 천천히 확인한 뒤 결정해 주세요"
          icon={<X className="w-4 h-4 text-[#b76e65]" strokeWidth={2} />}
          tone="danger"
        />
      </SettingsSection>
    </SettingsDetailLayout>
  );
}

export function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: '시선이 기억하는 정보',
      body: '시선은 여행지, 저장한 활동, 작성한 스토리처럼 서비스를 사용하는 데 필요한 정보만 차분히 보관합니다.',
    },
    {
      title: '정보를 사용하는 방식',
      body: '여행 일정에 맞는 활동 추천, 저장한 기록의 정리, 관심 지역 기반 알림처럼 사용자 경험을 부드럽게 이어가기 위해 사용합니다.',
    },
    {
      title: '기록의 관리',
      body: '사용자는 언제든지 자신의 기록을 확인하고 수정할 수 있습니다. 필요하지 않은 기록은 서비스 안에서 삭제할 수 있도록 준비합니다.',
    },
    {
      title: '안전한 보관',
      body: '개인정보는 서비스 운영에 필요한 범위 안에서만 접근하며, 외부 제공이 필요한 경우에는 별도의 안내와 동의를 우선합니다.',
    },
  ];

  return (
    <SettingsDetailLayout
      title="개인정보 처리방침"
      subtitle="시선이 기록을 다루는 조용한 약속"
      onBack={onBack}
    >
      <article className="rounded-3xl bg-white border border-black/5 shadow-sm px-5 py-6">
        <p className="text-[13px] leading-6 text-[#999]">
          마지막 업데이트 2026.05.21
        </p>
        <div className="mt-5 space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-[16px] font-semibold text-[#2a2a2a]">{section.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-[#5a5a5a]">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </SettingsDetailLayout>
  );
}

export function ContactSettingsScreen({ onBack }: { onBack: () => void }) {
  const [wantsReply, setWantsReply] = useState(true);

  return (
    <SettingsDetailLayout
      title="문의하기"
      subtitle="불편했던 순간을 편하게 남겨주세요"
      onBack={onBack}
    >
      <section className="rounded-3xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
        <div>
          <label className="block mb-2 text-[12px] font-medium text-[#999]" htmlFor="contact-title">
            문의 제목
          </label>
          <input
            id="contact-title"
            type="text"
            placeholder="어떤 도움이 필요하신가요?"
            className="w-full rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 py-3.5 text-[14px] outline-none placeholder:text-[#bbb]"
          />
        </div>

        <div>
          <label className="block mb-2 text-[12px] font-medium text-[#999]" htmlFor="contact-body">
            문의 내용
          </label>
          <textarea
            id="contact-body"
            placeholder="상황을 천천히 적어주세요."
            rows={6}
            className="w-full resize-none rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 py-3.5 text-[14px] leading-6 outline-none placeholder:text-[#bbb]"
          />
        </div>

        <div className="rounded-2xl bg-[#f8f8f5] px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-[#2a2a2a]">이메일로 답변 받기</p>
            <p className="mt-1 text-[12px] text-[#999]">답변이 필요한 문의라면 켜두세요</p>
          </div>
          <SoftSwitch checked={wantsReply} onChange={setWantsReply} />
        </div>

        <button
          type="button"
          className="w-full rounded-2xl bg-[#2a2a2a] py-4 text-[15px] font-medium text-white hover:bg-[#1a1a1a] transition-colors"
        >
          보내기
        </button>
      </section>

      <SettingsSection>
        <SettingsRow
          label="자주 묻는 질문 보기"
          description="활동 신청, 스토리, 여행 카드 관련 도움말"
          right={<ChevronRight className="w-4 h-4 text-[#ccc]" strokeWidth={2} />}
        />
        <SettingsRow
          label="이메일 문의"
          description="hello@sison.app"
          icon={<Mail className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
        />
      </SettingsSection>
    </SettingsDetailLayout>
  );
}
