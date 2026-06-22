import { useEffect, useRef, useState } from 'react';
import { X, Bookmark, Share2, MapPin, Clock, Sparkles } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import { getActivityDisplayDate, getActivityPeriod, getActivityStatus, getActivityStatusLabel } from '../activityFormatters';
import { normalizeCapacity } from '../activityCapacity';

const volunteerTargetFallback = '1365 상세 페이지에서 확인해주세요.';

interface VolunteerDetailResponse {
  ok: boolean;
  volunteerTarget?: string | null;
  capacity?: string | null;
  currentParticipants?: string | null;
  description?: string | null;
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

type DetailDescriptionBlock =
  | { type: 'section'; text: string }
  | { type: 'bullet'; marker: string; text: string }
  | { type: 'contact'; label: string; text: string }
  | { type: 'text'; text: string }
  | { type: 'spacer' };

const DETAIL_DESCRIPTION_COLLAPSED_HEIGHT = 8 * 22.75;

const decodeDetailDisplayEntities = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)));

const normalizeDetailDisplayText = (value: string) =>
  decodeDetailDisplayEntities(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const formatDetailDescriptionBlocks = (value: string): DetailDescriptionBlock[] => {
  const normalizedText = normalizeDetailDisplayText(value);
  if (!normalizedText) return [];

  return normalizedText.split('\n').map((rawLine) => {
    const line = rawLine.trim();
    if (!line) return { type: 'spacer' };

    const sectionMatch = line.match(/^([1-5])\.\s*(.+)?$/);
    if (sectionMatch) return { type: 'section', text: line };

    const bulletMatch = line.match(/^([-•※])\s*(.+)?$/);
    if (bulletMatch) {
      return {
        type: 'bullet',
        marker: bulletMatch[1],
        text: bulletMatch[2]?.trim() || '',
      };
    }

    const contactMatch = line.match(/^(문의|전화|담당자)(\s*[:：])\s*(.*)$/);
    if (contactMatch) {
      return {
        type: 'contact',
        label: `${contactMatch[1]}${contactMatch[2]}`,
        text: contactMatch[3]?.trim() || '',
      };
    }

    return { type: 'text', text: line };
  });
};

function DetailDescriptionContent({ text }: { text: string }) {
  const blocks = formatDetailDescriptionBlocks(text);

  if (blocks.length === 0) {
    return <p className="text-sm leading-relaxed text-[#5a5a5a]">자세한 내용은 공식 페이지에서 확인해주세요.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-[#5a5a5a]">
      {blocks.map((block, index) => {
        if (block.type === 'spacer') {
          return <div key={`spacer-${index}`} className="h-1.5" aria-hidden="true" />;
        }

        if (block.type === 'section') {
          return (
            <p key={`${block.type}-${index}`} className="pt-2 text-[14px] font-semibold leading-relaxed text-[#2a2a2a] first:pt-0">
              {block.text}
            </p>
          );
        }

        if (block.type === 'bullet') {
          return (
            <p key={`${block.type}-${index}`} className="flex gap-2">
              <span className="mt-[1px] flex-shrink-0 text-[#8aaa98]">{block.marker}</span>
              <span className="min-w-0 flex-1 break-words">{block.text}</span>
            </p>
          );
        }

        if (block.type === 'contact') {
          return (
            <p key={`${block.type}-${index}`} className="rounded-2xl bg-[#fbfaf6] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#4f5b53]">
              <span className="font-semibold text-[#2a2a2a]">{block.label}</span>
              {block.text && <span> {block.text}</span>}
            </p>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="break-words">
            {block.text}
          </p>
        );
      })}
    </div>
  );
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
  const [detailDescription, setDetailDescription] = useState<string | null>(null);
  const [detailDescriptionStatus, setDetailDescriptionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isDetailDescriptionExpanded, setIsDetailDescriptionExpanded] = useState(false);
  const [canToggleDetailDescription, setCanToggleDetailDescription] = useState(false);
  const detailDescriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const detailDescriptionContentRef = useRef<HTMLDivElement | null>(null);
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
  const buildVolunteerApplyUrl = () => {
    const rawUrl = activity.applyUrl || activity.sourceUrl;
    const trimmedUrl = rawUrl?.trim();

    if (trimmedUrl) {
      if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
      return `https://${trimmedUrl.replace(/^\/+/, '')}`;
    }

    if (!activity.progrmRegistNo) return '';

    const query = new URLSearchParams({
      type: 'show',
      progrmRegistNo: activity.progrmRegistNo,
    });

    return `https://www.1365.go.kr/vols/P9210/partcptn/timeCptn.do?${query.toString()}`;
  };
  const externalApplyUrl = buildVolunteerApplyUrl();

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
  const fallbackDescription = activity.description?.trim() || '자세한 내용은 공식 페이지에서 확인해주세요.';
  const detailedDescription =
    detailDescriptionStatus === 'loading'
      ? '상세 내용을 불러오는 중이에요.'
      : detailDescriptionStatus === 'error'
        ? '상세 내용을 불러오지 못했어요. 공식 페이지에서 확인해 주세요.'
        : detailDescription || fallbackDescription;
  const shouldMeasureDetailDescription =
    detailDescriptionStatus !== 'loading' &&
    detailDescriptionStatus !== 'error' &&
    Boolean(detailedDescription.trim());

  useEffect(() => {
    if (!shareMessage) return;

    const timer = window.setTimeout(() => setShareMessage(''), 1800);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  useEffect(() => {
    setDetailVolunteerTarget(null);
    setDetailCapacity(null);
    setDetailCurrentParticipants(null);
    setDetailDescription(null);
    setDetailDescriptionStatus('idle');
    setIsDetailDescriptionExpanded(false);
    setCanToggleDetailDescription(false);
  }, [activity.progrmRegistNo]);

  useEffect(() => {
    if (!isOpen) {
      setIsDetailDescriptionExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsDetailDescriptionExpanded(false);
  }, [detailedDescription]);

  useEffect(() => {
    const contentElement = detailDescriptionContentRef.current;
    if (!contentElement || !shouldMeasureDetailDescription) {
      setCanToggleDetailDescription(false);
      return;
    }

    const updateToggleVisibility = () => {
      setCanToggleDetailDescription(contentElement.scrollHeight > DETAIL_DESCRIPTION_COLLAPSED_HEIGHT + 1);
    };

    updateToggleVisibility();

    if (typeof ResizeObserver === 'undefined') {
      window.setTimeout(updateToggleVisibility, 0);
      return;
    }

    const resizeObserver = new ResizeObserver(updateToggleVisibility);
    resizeObserver.observe(contentElement);
    return () => resizeObserver.disconnect();
  }, [detailedDescription, shouldMeasureDetailDescription]);

  useEffect(() => {
    if (!isOpen) return;

    if (!activity.progrmRegistNo) {
      setDetailDescriptionStatus('idle');
      return;
    }

    const abortController = new AbortController();
    const params = new URLSearchParams({
      progrmRegistNo: activity.progrmRegistNo,
    });

    const fetchVolunteerDetail = async () => {
      setDetailDescriptionStatus('loading');

      try {
        const response = await fetch(`/api/volunteer/detail?${params.toString()}`, {
          signal: abortController.signal,
        });
        const payload = await response.json() as VolunteerDetailResponse;

        if (!response.ok || !payload.ok) {
          setDetailDescriptionStatus('error');
          return;
        }

        if (payload.volunteerTarget) setDetailVolunteerTarget(payload.volunteerTarget);
        if (payload.capacity) setDetailCapacity(payload.capacity);
        if (payload.currentParticipants) setDetailCurrentParticipants(payload.currentParticipants);
        setDetailDescription(payload.description?.trim() || null);
        setDetailDescriptionStatus('success');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDetailDescriptionStatus('error');
        console.error('1365 volunteer detail fetch failed:', error);
      }
    };

    void fetchVolunteerDetail();

    return () => abortController.abort();
  }, [activity.progrmRegistNo, isOpen]);

  const handleShare = async () => {
    const shareUrl = window.location.href;

    const copyShareUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('링크를 복사했어요.');
        return;
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const didCopy = document.execCommand('copy');
          if (!didCopy) throw new Error('copy command failed');
          setShareMessage('링크를 복사했어요.');
        } catch {
          setShareMessage('링크 복사에 실패했어요.');
          window.alert('링크 복사에 실패했어요.');
        } finally {
          document.body.removeChild(textarea);
        }
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: '시선',
          text: '여행 중 만나는 조용한 선행, 시선',
          url: shareUrl,
        });
        return;
      } catch (error) {
        const err = error as Error;
        if (err.name === 'AbortError') return;
      }
    }

    await copyShareUrl();
  };

  const kakaoMapQuery = volunteerPlace || activity.recruitingOrganization || activity.title;
  const hasMapQuery = Boolean(kakaoMapQuery);

  const handleKakaoMapOpen = () => {
    if (!hasMapQuery) return;

    const kakaoMapUrl = `https://map.kakao.com/?q=${encodeURIComponent(kakaoMapQuery)}`;

    window.open(kakaoMapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDetailDescriptionToggle = () => {
    if (isDetailDescriptionExpanded) {
      setIsDetailDescriptionExpanded(false);
      window.requestAnimationFrame(() => {
        detailDescriptionSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
      return;
    }

    setIsDetailDescriptionExpanded(true);
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
                    : 'cursor-not-allowed bg-[#f5f5f2] text-[#9AA0A6]'
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
                <p className={`${isActiveRecruitmentStatus ? 'font-medium text-[#5f9f74]' : 'text-[#5F6368]'}`}>
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
                    <span className="text-[12.5px] text-[#5F6368]">{label}</span>
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
                    <span className="text-[12.5px] text-[#5F6368]">{label}</span>
                    <span className="text-[13px] leading-relaxed text-[#2a2a2a]">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Detailed Description */}
            <div ref={detailDescriptionSectionRef} className="border-t border-black/5 pt-6">
              <h3 className="mb-3">상세설명</h3>
              <div className="relative">
                <div
                  ref={detailDescriptionContentRef}
                  className="overflow-hidden transition-[max-height] duration-300 ease-out"
                  style={{
                    maxHeight: canToggleDetailDescription && !isDetailDescriptionExpanded
                      ? `${DETAIL_DESCRIPTION_COLLAPSED_HEIGHT}px`
                      : undefined,
                  }}
                >
                  <DetailDescriptionContent text={detailedDescription} />
                </div>
                {canToggleDetailDescription && !isDetailDescriptionExpanded && detailDescriptionStatus !== 'loading' && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-14"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                    }}
                  />
                )}
              </div>
              {canToggleDetailDescription && detailDescriptionStatus !== 'loading' && (
                <button
                  type="button"
                  onClick={handleDetailDescriptionToggle}
                  aria-expanded={isDetailDescriptionExpanded}
                  className="mt-2 inline-flex items-center gap-[4px] rounded-full bg-[#eef6f1] px-3 py-1 text-[13px] text-[#4e8f65] hover:bg-[#e2efe8] transition-colors"
                >
                  <span>{isDetailDescriptionExpanded ? '접기' : '더보기'}</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-200 ${isDetailDescriptionExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 pb-6">
              {/* Primary CTA */}
              {externalApplyUrl ? (
                <a
                  href={externalApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-2xl bg-[#2a2a2a] py-4 text-center text-white transition-all hover:bg-[#1a1a1a]"
                >
                  1365에서 신청하기
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl bg-[#d7d3cc] py-4 text-white"
                >
                  1365 링크 확인 필요
                </button>
              )}

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
