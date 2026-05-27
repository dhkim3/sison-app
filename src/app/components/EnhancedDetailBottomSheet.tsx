import { useEffect, useState } from 'react';
import { X, Bookmark, Share2, MapPin, Clock, Sparkles } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface EnhancedDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAIRecommendation?: (activity: EnhancedDetailBottomSheetProps['activity']) => void;
  isSaved?: boolean;
  onToggleSaved?: () => void;
  disableEntryAnimation?: boolean;
  activity: {
    imageUrl: string;
    title: string;
    location: string;
    date?: string;
    time: string;
    description: string;
    materials: string;
    capacity: string;
    currentParticipants: string;
    recommendation: string;
    isRecruiting: boolean;
    distance?: string;
    duration?: string;
    difficulty?: string;
    indoorOutdoor?: string;
    recruitmentStartDate?: string;
    recruitmentEndDate?: string;
    volunteerPeriod?: string;
    recruitmentPeriod?: string;
    volunteerTime?: string;
    volunteerField?: string;
    volunteerTarget?: string;
    recruitingOrganization?: string;
    registrationOrganization?: string;
    volunteerPlace?: string;
    category?: string;
  };
}

export function EnhancedDetailBottomSheet({
  isOpen,
  onClose,
  onAIRecommendation,
  isSaved = false,
  onToggleSaved,
  disableEntryAnimation = false,
  activity,
}: EnhancedDetailBottomSheetProps) {
  const [shareMessage, setShareMessage] = useState('');
  useBottomSheetScrollLock(isOpen);
  const formatShortDate = (value?: string) => {
    if (!value) return '';

    const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    if (!match) return value;

    return `${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}`;
  };

  const formatDateWithWeekday = (value?: string) => {
    if (!value) return '';

    const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    if (!match) return value;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    return `${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')} (${weekdays[date.getDay()]})`;
  };

  const formatShortPeriod = (start?: string, end?: string, fallback?: string) => {
    if (start && end) return `${formatShortDate(start)} - ${formatShortDate(end)}`;
    if (fallback) return fallback.replace(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/g, (_, _year, month, day) => (
      `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
    ));

    return '신청기간 확인 필요';
  };

  const formatVolunteerPeriod = (period?: string, date?: string) => {
    if (date) return formatDateWithWeekday(date);
    if (period) {
      const singleDateMatch = period.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
      if (singleDateMatch) return formatDateWithWeekday(period);

      return period;
    }

    return '활동일 확인 필요';
  };

  const volunteerPeriod = formatVolunteerPeriod(activity.volunteerPeriod, activity.date);
  const recruitmentPeriod =
    formatShortPeriod(activity.recruitmentStartDate, activity.recruitmentEndDate, activity.recruitmentPeriod);
  const volunteerTime = activity.volunteerTime || activity.time;
  const volunteerField = activity.volunteerField || activity.category || '지역사회 봉사';
  const volunteerTarget = activity.volunteerTarget || '지역 주민 및 여행지 환경';
  const recruitingOrganization = activity.recruitingOrganization || '지역 자원봉사센터';
  const volunteerPlace = activity.volunteerPlace || activity.location;
  const recruitmentStatus = activity.isRecruiting ? '모집중' : '지난 활동';

  const basicInfoRows = [
    ['신청기간', recruitmentPeriod],
    ['활동일', volunteerPeriod],
    ['활동시간', volunteerTime],
    ['봉사대상', volunteerTarget],
    ['봉사분야', volunteerField],
  ];

  const organizationInfoRows = [
    ['모집기관', recruitingOrganization],
  ];

  useEffect(() => {
    if (!shareMessage) return;

    const timer = window.setTimeout(() => setShareMessage(''), 1800);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  const copyShareUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: activity.title,
      text: `${activity.title} - ${activity.location}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyShareUrl(shareUrl);
      setShareMessage('링크를 복사했어요.');
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return;

      try {
        await copyShareUrl(shareUrl);
        setShareMessage('링크를 복사했어요.');
      } catch {
        setShareMessage('링크 복사에 실패했어요.');
        window.alert('링크 복사에 실패했어요.');
      }
    }
  };

  const handleKakaoMapOpen = () => {
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(volunteerPlace)}`;
    window.open(kakaoMapUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-viewport z-[90] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {shareMessage && (
        <div className="fixed left-1/2 top-6 z-[100] -translate-x-1/2 rounded-full bg-[#2a2a2a] px-4 py-2 text-[13px] text-white shadow-lg">
          {shareMessage}
        </div>
      )}

      <div
        className={`bottom-sheet-panel relative flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl ${
          disableEntryAnimation ? '' : 'animate-slide-up'
        }`}
        style={{ height: 'var(--sison-sheet-max-height)' }}
      >
        <div className="flex-shrink-0 bg-white">
          {/* Drag Handle */}
          <div className="pt-3 pb-4">
            <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto" />
          </div>

          {/* Top Actions */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
            >
              <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleSaved}
                aria-label={isSaved ? '저장 취소' : '활동 저장'}
                className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] active:scale-95 transition-all"
              >
                <Bookmark
                  className={`w-5 h-5 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
                  strokeWidth={2}
                />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="활동 공유"
                className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div
          className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto pb-safe"
          data-bottom-sheet-scrollable="true"
        >
          {/* Compact Hero Image */}
          <div className="relative aspect-[2/1] mx-6 rounded-2xl overflow-hidden mb-6">
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="px-6 space-y-6">
            {/* 1. Activity Title */}
            <div>
              <h2 className="mb-1">{activity.title}</h2>
            </div>

            {/* Summary */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#5a5a5a] mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-[#2a2a2a] leading-relaxed">{volunteerPlace}</p>
              </div>
              <button
                type="button"
                onClick={handleKakaoMapOpen}
                className="flex-shrink-0 rounded-full bg-[#f8f8f5] px-3 py-1.5 text-[12px] font-medium text-[#5a5a5a] transition-colors hover:bg-[#e8f5ed] hover:text-[#2a2a2a]"
              >
                카카오맵
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#5a5a5a] flex-shrink-0" strokeWidth={2} />
              <p className="text-[#2a2a2a]">{volunteerPeriod} · {volunteerTime}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activity.isRecruiting ? 'recruiting-status-dot bg-[#a8d5ba]' : 'bg-[#999]'
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className={`${activity.isRecruiting ? 'text-[#a8d5ba]' : 'text-[#999]'}`}>
                  {recruitmentStatus}
                </p>
                <p className="text-sm text-[#999] mt-1">
                  모집인원 {activity.capacity} · 신청인원 {activity.currentParticipants}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-black/5" />

            {/* Basic Information */}
            <section>
              <h3 className="mb-3 text-[16px] font-semibold text-[#2a2a2a]">기본 정보</h3>
              <div className="rounded-2xl bg-[#fbfaf6] px-4 py-1">
                {basicInfoRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 border-b border-black/[0.04] py-3 last:border-b-0"
                  >
                    <span className="text-[12.5px] text-[#999]">{label}</span>
                    <span className="text-[13px] leading-relaxed text-[#2a2a2a]">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Organization Information */}
            <section>
              <h3 className="mb-3 text-[16px] font-semibold text-[#2a2a2a]">기관 정보</h3>
              <div className="rounded-2xl bg-[#fbfaf6] px-4 py-1">
                {organizationInfoRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 border-b border-black/[0.04] py-3 last:border-b-0"
                  >
                    <span className="text-[12.5px] text-[#999]">{label}</span>
                    <span className="text-[13px] leading-relaxed text-[#2a2a2a]">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Detailed Description */}
            {activity.description && (
              <>
                <div className="border-t border-black/5 pt-6">
                  <h3 className="mb-3">상세 설명</h3>
                  <p className="text-sm text-[#5a5a5a] leading-relaxed">{activity.description}</p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[#999]">
                    자세한 내용은 공식 페이지에서 확인해주세요.
                  </p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 pb-6">
              {/* Primary CTA */}
              <button type="button" className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]">
                1365에서 신청하기
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAIRecommendation?.(activity);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#6fb4ff,#7b7cff_52%,#b763ec)] py-4 text-white shadow-[0_14px_30px_rgba(112,126,255,0.22)] transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" strokeWidth={2} />
                <span>AI 일정 추천 받기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
