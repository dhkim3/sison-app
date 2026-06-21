import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, Calendar, LogOut, Mail, MapPin, User, X } from 'lucide-react';

export type SettingsDetail = 'notifications' | 'account' | 'privacy' | 'contact';

interface SettingsDetailLayoutProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  mood?: 'default' | 'editorial';
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
  density?: 'default' | 'compact';
}

function SettingsDetailLayout({
  title,
  subtitle,
  onBack,
  children,
  mood = 'default',
}: SettingsDetailLayoutProps) {
  const isEditorial = mood === 'editorial';

  return (
    <div className="screen-transition">
      <header className="sison-top-bar sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
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
            <h2 className={`${isEditorial ? 'text-[19px] font-semibold' : 'text-xl font-bold'} text-[#2a2a2a] leading-tight`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`${isEditorial ? 'mt-1.5 leading-5 text-[#7A7F87]' : 'mt-0.5 text-[#7A7F87]'} text-[12px]`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className={`px-5 pb-8 space-y-5 ${isEditorial ? 'pt-5' : 'pt-3'}`}>{children}</div>
    </div>
  );
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section>
      {(title || description) && (
        <div className="mb-3">
          {title && <h3 className="text-[15px] font-semibold text-[#2a2a2a]">{title}</h3>}
          {description && <p className="mt-1 text-[12px] leading-5 text-[#7A7F87]">{description}</p>}
        </div>
      )}
      <div className="rounded-3xl bg-white border border-black/5 shadow-sm overflow-hidden">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  icon,
  right,
  onClick,
  tone = 'default',
  density = 'default',
}: SettingsRowProps) {
  const isCompact = density === 'compact';
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
          {description && (
            <p className={`${isCompact ? 'mt-0.5 leading-[1.35]' : 'mt-1 leading-5'} text-[12px] text-[#5F6368]`}>
              {description}
            </p>
          )}
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

function SoftSwitch({
  checked,
  onChange,
  quiet = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  quiet?: boolean;
}) {
  if (quiet) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-[24px] w-[42px] flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#9fceb1]' : 'bg-[#e8e5de]'
        }`}
        aria-pressed={checked}
      >
        <span
          className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    );
  }

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

function NotificationPreferenceRow({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-black/[0.04] py-3.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f6f7f1]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-snug text-[#333]">
            {label}
          </p>
          <p className="mt-1 text-[12px] font-normal leading-[1.45] text-[#9a9a9a]">
            {description}
          </p>
        </div>
      </div>
      <SoftSwitch checked={checked} onChange={onChange} quiet />
    </div>
  );
}

export function NotificationSettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState({
    reminders: true,
    stories: true,
  });

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <SettingsDetailLayout
      title="알림"
      onBack={onBack}
      mood="editorial"
    >
      <section>
        <div className="rounded-2xl border border-black/[0.04] bg-white/90 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.025)]">
          <NotificationPreferenceRow
            label="여행 일정 리마인드"
            description="저장된 활동 전날에 알려드려요"
            icon={<Calendar className="h-3.5 w-3.5 text-[#8aa8a0]" strokeWidth={1.8} />}
            checked={settings.reminders}
            onChange={(value) => updateSetting('reminders', value)}
          />
          <NotificationPreferenceRow
            label="스토리 업데이트"
            description="내가 남긴 시선과 연결된 소식"
            icon={<BookOpen className="h-3.5 w-3.5 text-[#9ea7bf]" strokeWidth={1.8} />}
            checked={settings.stories}
            onChange={(value) => updateSetting('stories', value)}
          />
        </div>
      </section>
    </SettingsDetailLayout>
  );
}

export function AccountSettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <SettingsDetailLayout
      title="계정 설정"
      subtitle="나의 여행 기록이 머무는 공간"
      onBack={onBack}
    >
      <SettingsSection title="기본 정보">
        <SettingsRow
          label="닉네임"
          description="여행자"
          icon={<User className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          density="compact"
        />
        <SettingsRow
          label="이메일"
          description="traveler@sison.app"
          icon={<Mail className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
          density="compact"
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          label="로그아웃"
          icon={<LogOut className="w-4 h-4 text-[#5F6368]" strokeWidth={2} />}
          tone="muted"
        />
        <SettingsRow
          label="계정 탈퇴"
          description="기록을 천천히 확인한 뒤 결정해 주세요"
          icon={<X className="w-4 h-4 text-[#b76e65]" strokeWidth={2} />}
          tone="danger"
          density="compact"
        />
      </SettingsSection>
    </SettingsDetailLayout>
  );
}

export function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: '수집하는 개인정보',
      body: [
        '회원가입과 서비스 이용 과정에서 이메일, 닉네임, 프로필 사진, 관심 지역, 저장한 활동, 신청·참여 이력, 작성한 스토리와 여행 카드 정보를 수집할 수 있습니다.',
        '문의하기를 이용할 때에는 답변을 위해 이메일 주소, 문의 내용, 기기 정보와 접속 기록이 함께 저장될 수 있습니다.',
      ],
    },
    {
      title: '수집 목적',
      body: [
        '시선은 여행 일정에 맞는 봉사활동 추천, 저장한 활동 관리, 스토리 작성, 여행 카드 생성처럼 서비스의 기본 기능을 제공하기 위해 개인정보를 사용합니다.',
        '또한 관심 지역 기반 알림, 고객 문의 응대, 부정 이용 방지, 서비스 안정성 개선을 위해 필요한 범위 안에서 정보를 활용합니다.',
      ],
    },
    {
      title: '보관 기간',
      body: [
        '회원 정보와 여행 기록은 회원 탈퇴 또는 직접 삭제 요청 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보관이 필요한 정보는 정해진 기간 동안 분리해 보관합니다.',
        '문의 및 고객지원 기록은 처리 완료 후 3년간 보관할 수 있으며, 서비스 이용 기록은 안정적인 운영을 위해 최대 1년간 보관할 수 있습니다.',
      ],
    },
    {
      title: '위치정보 처리',
      body: [
        '시선은 여행지 주변 활동 추천과 현재 위치 기반 스토리 작성을 돕기 위해 사용자가 입력한 여행지, 선택한 지역, 기기에서 허용한 위치정보를 이용할 수 있습니다.',
        '현재 위치(GPS 좌표)는 사용자가 허용한 경우에만 단말기 안에서 처리되어 가장 가까운 지역명으로만 변환되며, 좌표 원본은 시선 서버로 전송하거나 저장하지 않습니다.',
        '위치정보 이용 동의는 기기 설정에서 언제든지 철회할 수 있고, 철회 시 현재 위치 기반 기능만 제한되며 다른 서비스 이용에는 영향이 없습니다.',
      ],
    },
    {
      title: '개인정보 제공 및 위탁',
      body: [
        '시선은 사용자의 동의 없이 개인정보를 외부에 판매하거나 제공하지 않습니다. 활동 신청을 위해 1365 등 외부 서비스로 이동하는 경우, 해당 서비스의 개인정보 처리방침이 별도로 적용됩니다.',
        '서비스 운영을 위해 클라우드 인프라, 알림 발송, 고객지원 도구를 이용할 수 있으며, 위탁이 필요한 경우 필요한 정보만 안전하게 처리하도록 관리합니다.',
      ],
    },
    {
      title: '이용자의 권리',
      body: [
        '사용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있고, 서비스 내 기록 삭제 또는 회원 탈퇴를 요청할 수 있습니다.',
        '개인정보 처리에 대한 동의 철회, 열람, 정정, 삭제 요청은 앱 내 문의하기 또는 아래 문의처를 통해 접수할 수 있습니다.',
      ],
    },
    {
      title: '문의처',
      body: [
        '개인정보와 관련해 궁금한 점이나 불편한 점이 있다면 privacy@sison.app 으로 알려주세요.',
        '시선 개인정보 보호 담당자는 접수된 문의를 확인한 뒤 가능한 빠르게 답변드리겠습니다.',
      ],
    },
  ];

  return (
    <SettingsDetailLayout
      title="개인정보 처리방침"
      subtitle="여행 기록을 다루는 시선의 약속"
      onBack={onBack}
      mood="editorial"
    >
      <article className="space-y-5">
        <section className="rounded-3xl border border-black/[0.04] bg-white/85 px-5 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.025)]">
          <p className="text-[12px] leading-none text-[#7A7F87]">시행일 2026.05.22</p>
          <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#2a2a2a]">
            시선은 여행의 기억을 필요한 만큼만 맡아둡니다.
          </h3>
          <p className="mt-3 text-[13px] leading-6 text-[#777]">
            이 방침은 시선이 어떤 개인정보를 수집하고, 왜 사용하며, 언제까지 보관하는지 사용자가 쉽게 이해할 수 있도록 정리한 안내입니다.
          </p>
        </section>

        <div className="space-y-3">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-black/[0.04] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <h3 className="text-[15px] font-semibold leading-snug text-[#2a2a2a]">{section.title}</h3>
              <div className="mt-3 space-y-2.5">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[13px] font-normal leading-6 text-[#666]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-2xl bg-[#eef7f2]/70 px-4 py-4">
          <p className="text-[12px] leading-5 text-[#6f8b78]">
            이 처리방침은 서비스 변경이나 관련 법령에 따라 업데이트될 수 있으며, 중요한 변경이 있을 때에는 앱 안에서 미리 안내합니다.
          </p>
        </section>
      </article>
    </SettingsDetailLayout>
  );
}

export function ContactSettingsScreen({ onBack }: { onBack: () => void }) {
  const [contactTitle, setContactTitle] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [contactErrors, setContactErrors] = useState({ title: false, body: false });
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const titleValue = contactTitle.trim();
  const bodyValue = contactBody.trim();
  const canSubmit = titleValue.length > 0 && bodyValue.length > 0;
  const showTitleError = contactErrors.title && titleValue.length === 0;
  const showBodyError = contactErrors.body && bodyValue.length === 0;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = () => {
    if (!canSubmit) {
      setContactErrors({
        title: titleValue.length === 0,
        body: bodyValue.length === 0,
      });
      return;
    }

    console.log('contact submitted', {
      title: titleValue,
      body: bodyValue,
    });

    setContactTitle('');
    setContactBody('');
    setContactErrors({ title: false, body: false });
    setIsToastVisible(true);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setIsToastVisible(false);
      toastTimerRef.current = null;
    }, 2200);
  };

  return (
    <SettingsDetailLayout
      title="문의하기"
      subtitle="불편했던 순간을 편하게 남겨주세요"
      onBack={onBack}
    >
      <section className="rounded-3xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
        <div>
          <label className="block mb-2 text-[12px] font-medium text-[#5F6368]" htmlFor="contact-title">
            문의 제목
          </label>
          <input
            id="contact-title"
            type="text"
            value={contactTitle}
            onChange={(event) => {
              setContactTitle(event.target.value);
              setContactErrors((current) => ({ ...current, title: false }));
            }}
            onFocus={() => setContactErrors((current) => ({ ...current, title: false }))}
            placeholder="문의 제목을 입력해주세요"
            aria-invalid={showTitleError}
            className={`w-full rounded-2xl bg-[#f8f8f5] border px-4 py-3.5 text-[14px] outline-none transition-colors placeholder:text-[#9AA0A6] ${
              showTitleError ? 'border-[#d9aaa3]' : 'border-black/5 focus:border-[#a8d5ba]/70'
            }`}
          />
          <p className="mt-1.5 min-h-4 text-[11.5px] leading-4 text-[#b76e65]">
            {showTitleError ? '문의 제목을 입력해주세요.' : ''}
          </p>
        </div>

        <div>
          <label className="block mb-2 text-[12px] font-medium text-[#5F6368]" htmlFor="contact-body">
            문의 내용
          </label>
          <textarea
            id="contact-body"
            value={contactBody}
            onChange={(event) => {
              setContactBody(event.target.value);
              setContactErrors((current) => ({ ...current, body: false }));
            }}
            onFocus={() => setContactErrors((current) => ({ ...current, body: false }))}
            placeholder="궁금한 점이나 불편한 점을 남겨주세요"
            rows={6}
            aria-invalid={showBodyError}
            className={`w-full resize-none rounded-2xl bg-[#f8f8f5] border px-4 py-3.5 text-[14px] leading-6 outline-none transition-colors placeholder:text-[#9AA0A6] ${
              showBodyError ? 'border-[#d9aaa3]' : 'border-black/5 focus:border-[#a8d5ba]/70'
            }`}
          />
          <p className="mt-1.5 min-h-4 text-[11.5px] leading-4 text-[#b76e65]">
            {showBodyError ? '문의 내용을 입력해주세요.' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-[#2a2a2a] py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1a1a1a]"
        >
          보내기
        </button>
      </section>

      <div
        aria-hidden={!isToastVisible}
        className={`pointer-events-none fixed left-1/2 bottom-[92px] z-50 w-[calc(100%-40px)] max-w-[342px] -translate-x-1/2 transition-all duration-300 ${
          isToastVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <section
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="rounded-2xl border border-[#dcece2] bg-[#f4faf6]/95 px-4 py-3.5 shadow-[0_10px_28px_rgba(39,45,40,0.12)] backdrop-blur-md"
        >
          <p className="text-[14px] font-semibold leading-snug text-[#426a50]">문의가 접수되었어요.</p>
          <p className="mt-0.5 text-[12px] leading-5 text-[#6f8b78]">남겨주신 내용을 확인할게요.</p>
        </section>
      </div>

      <SettingsSection>
        <SettingsRow
          label="이메일 문의"
          description="hello@sison.app"
          icon={<Mail className="w-4 h-4 text-[#6fb58a]" strokeWidth={2} />}
        />
      </SettingsSection>
    </SettingsDetailLayout>
  );
}
