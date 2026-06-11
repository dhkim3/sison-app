import { useEffect, useState } from 'react';
import { X, Bookmark, Share2, MapPin, Clock, Sparkles } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import { getActivityDisplayDate, getActivityPeriod, getActivityStatus, getActivityStatusLabel } from '../activityFormatters';
import { hasKnownCapacity, normalizeCapacity } from '../activityCapacity';

const volunteerTargetFallback = '1365 상세 페이지에서 확인해주세요.';

const needsVolunteerTargetFetch = (value?: string) => {
  const trimmedValue = value?.trim();
  return !trimmedValue || trimmedValue === volunteerTargetFallback;
};

interface VolunteerDetailResponse {
  ok: boolean;
  volunteerTarget?: string | null;
  capacity?: string | null;
  currentParticipants?: string | null;
}

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
    activityDate?: string;
    activityStartDate?: string;
    activityEndDate?: string;
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
    volunteerType?: string;
    recruitingOrganization?: string;
    registrationOrganization?: string;
    volunteerPlace?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    applyUrl?: string;
    sourceUrl?: string;
    progrmRegistNo?: string;
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
  const [detailVolunteerTarget, setDetailVolunteerTarget] = useState<string | null>(null);
  const [detailCapacity, setDetailCapacity] = useState<string | null>(null);
  const [detailCurrentParticipants, setDetailCurrentParticipants] = useState<string | null>(null);
  useBottomSheetScrollLock(isOpen);
  const formatShortDate = (value?: string) => {
    if (!value) return '';

    const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    if (!match) return value;

    return `${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}`;
  };

  const formatShortPeriod = (start?: string, end?: string, fallback?: string) => {
    if (start && end) return `${formatShortDate(start)} - ${formatShortDate(end)}`;
    if (fallback) return fallback.replace(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/g, (_, _year, month, day) => (
      `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
    ));

    return '신청기간 확인 필요';
  };

  const activityDateInput = {
    date: activity.date,
    activityDate: activity.activityDate,
    activityStartDate: activity.activityStartDate,
    activityEndDate: activity.activityEndDate,
    volunteerPeriod: activity.volunteerPeriod,
  };
  const activityPeriod = getActivityPeriod(activityDateInput);
  const volunteerPeriod = getActivityDisplayDate(activityDateInput) || '활동일 확인 필요';
  const volunteerPeriodLabel = activityPeriod.isPeriodActivity ? '활동기간' : '활동일';
  const recruitmentPeriod =
    formatShortPeriod(activity.recruitmentStartDate, activity.recruitmentEndDate, activity.recruitmentPeriod);
  const volunteerTime = activity.volunteerTime || activity.time || '확인 필요';
  const capacity = normalizeCapacity(detailCapacity ?? activity.capacity);
  const volunteerTarget = detailVolunteerTarget || activity.volunteerTarget || volunteerTargetFallback;
  const volunteerField = activity.volunteerField || activity.category || '확인 필요';
  const recruitingOrganization = activity.recruitingOrganization || '지역 자원봉사센터';
  const volunteerPlace = activity.volunteerPlace || activity.location;
  const activityStatus = getActivityStatus({
    date: activity.date,
    activityDate: activity.activityDate,
    activityStartDate: activity.activityStartDate,
    activityEndDate: activity.activityEndDate,
    time: volunteerTime,
    recruitmentEndDate: activity.recruitmentEndDate,
    volunteerPeriod: activity.volunteerPeriod,
    volunteerTime,
  });
  const recruitmentStatus = getActivityStatusLabel({
    date: activity.date,
    activityDate: activity.activityDate,
    activityStartDate: activity.activityStartDate,
    activityEndDate: activity.activityEndDate,
    time: volunteerTime,
    recruitmentEndDate: activity.recruitmentEndDate,
    volunteerPeriod: activity.volunteerPeriod,
    volunteerTime,
  });
  const isActiveRecruitmentStatus =
    activityStatus === 'recruiting' ||
    activityStatus === 'todayDeadline' ||
    activityStatus === 'periodActive';
  const externalApplyUrl = activity.applyUrl || activity.sourceUrl;

  const currentParticipantsRaw = normalizeCapacity(detailCurrentParticipants ?? activity.currentParticipants);
  const currentParticipantsNum = currentParticipantsRaw
    ? Number.parseInt(currentParticipantsRaw.replace(/[^0-9]/g, ''), 10)
    : NaN;
  const hasCurrentParticipants = Number.isFinite(currentParticipantsNum) && currentParticipantsNum > 0;

  const basicInfoRows = [
    ['신청기간', recruitmentPeriod],
    [volunteerPeriodLabel, volunteerPeriod],
    ['활동시간', volunteerTime],
    ['모집인원', capacity],
    ...(hasCurrentParticipants ? [['신청인원', currentParticipantsRaw]] : []),
    ...(volunteerTarget !== volunteerTargetFallback ? [['봉사대상', volunteerTarget]] : []),
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

  useEffect(() => {
    setDetailVolunteerTarget(null);
    setDetailCapacity(null);
    setDetailCurrentParticipants(null);
  }, [activity.progrmRegistNo]);

  useEffect(() => {
    const shouldFetchVolunteerTarget = needsVolunteerTargetFetch(activity.volunteerTarget);
    const shouldFetchCapacity = !hasKnownCapacity(activity.capacity);
    const shouldFetchCurrentParticipants = !hasKnownCapacity(activity.currentParticipants);

    if (
      !isOpen ||
      !activity.progrmRegistNo ||
      (!shouldFetchVolunteerTarget && !shouldFetchCapacity && !shouldFetchCurrentParticipants)
    ) return;

    const abortController = new AbortController();
    const params = new URLSearchParams({
      progrmRegistNo: activity.progrmRegistNo,
    });

    const fetchVolunteerTarget = async () => {
      try {
        const response = await fetch(`/api/volunteer/detail?${params.toString()}`, {
          signal: abortController.signal,
        });
        const payload = await response.json() as VolunteerDetailResponse;

        if (!response.ok || !payload.ok) return;

        if (payload.volunteerTarget) setDetailVolunteerTarget(payload.volunteerTarget);
        if (payload.capacity) setDetailCapacity(payload.capacity);
        if (payload.currentParticipants) setDetailCurrentParticipants(payload.currentParticipants);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('1365 volunteer target detail fetch failed:', error);
      }
    };

    void fetchVolunteerTarget();

    return () => abortController.abort();
  }, [activity.capacity, activity.currentParticipants, activity.progrmRegistNo, activity.volunteerTarget, isOpen]);

  const handleShare = async () => {
    const shareUrl = activity.applyUrl || activity.sourceUrl || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: activity.title,
          text: `${activity.title}\n${activity.location}`,
          url: shareUrl,
        });
      } catch {
        // 사용자가 공유창을 닫거나 취소한 경우 무시
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('링크를 복사했어요.');
    } catch {
      setShareMessage('링크 복사에 실패했어요.');
      window.alert('링크 복사에 실패했어요.');
    }
  };

  const kakaoMapQuery = volunteerPlace || activity.recruitingOrganization || activity.title;
  const hasMapQuery = Boolean(kakaoMapQuery);

  const handleKakaoMapOpen = () => {
    if (!hasMapQuery) return;

    let kakaoMapUrl: string;
    if (activity.latitude != null && activity.longitude != null) {
      kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(volunteerPlace || activity.title)},${activity.latitude},${activity.longitude}`;
    } else {
      kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(kakaoMapQuery)}`;
    }

    window.open(kakaoMapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSourceOpen = () => {
    if (!externalApplyUrl) return;

    window.open(externalApplyUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-viewport z-[90] flex items-end justify-center">
      {/*
        iOS Safari bug: backdrop-filter creates a compositing layer that can
        intercept touch events even when the panel is visually above it.
        Fix: split into a pointer-events:none blur layer + a separate click target.
      */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />
      <div className="absolute inset-0" onClick={onClose} />

      {shareMessage && (
        <div className="fixed left-1/2 top-6 z-[100] -translate-x-1/2 rounded-full bg-[#2a2a2a] px-4 py-2 text-[13px] text-white shadow-lg">
          {shareMessage}
        </div>
      )}

      <div
        className={`bottom-sheet-panel relative z-[1] flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl ${
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
          className="bottom-sheet-scrollable scrollbar-hide min-h-0 flex-1 overflow-y-scroll pb-safe"
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
                disabled={!hasMapQuery}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  hasMapQuery
                    ? 'bg-[#f8f8f5] text-[#5a5a5a] hover:bg-[#e8f5ed] hover:text-[#2a2a2a]'
                    : 'cursor-not-allowed bg-[#f5f5f2] text-[#bbb]'
                }`}
              >
                {hasMapQuery ? '카카오맵' : '지도 확인 필요'}
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
                    isActiveRecruitmentStatus ? 'recruiting-status-dot bg-[#6fa985]' : 'bg-[#999]'
                  }`}
                />
              </div>
              <div className="flex-1 flex items-center">
                <p className={`${isActiveRecruitmentStatus ? 'font-medium text-[#5f9f74]' : 'text-[#999]'}`}>
                  {recruitmentStatus}
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
                    <span className="min-w-0 break-words text-[13px] leading-relaxed text-[#2a2a2a]">{value}</span>
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
              <button
                type="button"
                onClick={handleSourceOpen}
                disabled={!externalApplyUrl}
                className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:bg-[#d7d3cc]"
              >
                {externalApplyUrl ? '1365에서 신청하기' : '1365 링크 확인 필요'}
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAIRecommendation?.({ ...activity, volunteerTarget });
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
