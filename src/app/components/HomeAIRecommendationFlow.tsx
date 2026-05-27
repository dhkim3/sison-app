import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { CompactActivityCard } from './CompactActivityCard';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import { filterLocationSuggestions, locationSuggestions } from '../locationSuggestions';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';

interface HomeAIRecommendationFlowProps {
  isOpen: boolean;
  activities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onClose: () => void;
  onOpenActivity: (activity: ActivitySaveRecord) => void;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

const timeSuggestions = ['1~2시간', '3~4시간', '4시간 이상'];
const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
const activityMoodSuggestions = [
  '조용히 걸으며 할 수 있는',
  '바다 근처에서 할 수 있는',
  '혼자 참여해도 부담 없는',
  '아이와 함께할 수 있는',
];
const loadingMessages = [
  '여행지 주변 활동을 살펴보고 있어요',
  '일정에 맞는 시간을 비교하고 있어요',
  '분위기에 어울리는 활동을 고르고 있어요',
  '딱 맞는 활동 3개를 정리하고 있어요',
];

const aiInputClassName =
  'mb-4 w-full rounded-2xl border border-[#c9d5ff] bg-white/86 px-4 py-4 text-[16px] text-[#28324a] outline-none shadow-[0_8px_22px_rgba(96,124,210,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] transition-all placeholder:text-[#9aa4bd] focus:border-[#9c8cff] focus:bg-white focus:shadow-[0_0_0_4px_rgba(118,107,255,0.10),0_10px_26px_rgba(96,124,210,0.10)]';

const aiChipClassName =
  'rounded-full border border-[#d9ddff] bg-[#f6f8ff]/88 px-3.5 py-2 text-[12.5px] font-medium text-[#52607d] shadow-[0_8px_18px_rgba(94,110,180,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all active:scale-[0.98] active:border-[#aaa2ff] active:bg-[#f0efff]';

const aiPrimaryButtonClassName =
  'w-full rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#6fb4ff,#7b7cff_52%,#b763ec)] py-4 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(112,126,255,0.24)] transition-all active:scale-[0.99] disabled:border-transparent disabled:bg-[#e5e8f3] disabled:text-[#a8afc2] disabled:shadow-none';

const aiFlowOpenTransitionDuration = 420;
const aiFlowCloseTransitionDuration = 340;
const aiFlowOpenTransitionEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
const aiFlowCloseTransitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';

const getMonthDay = (value?: string) => {
  const match = value?.match(/^\d{4}[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return '';

  return `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}`;
};

const formatDateLabel = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;

const formatDateRangeLabel = (startDate: Date, endDate: Date) => {
  if (startDate.toDateString() === endDate.toDateString()) return formatDateLabel(startDate);

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
};

const getDateFromActivity = (value?: string) => {
  const match = value?.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const getDurationHours = (value?: string) => {
  if (!value) return 2;
  if (value.includes('반나절')) return 4;
  if (value.includes('4시간 이상')) return 4;

  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 2;
};

const getActivityHours = (activity: ActivitySaveRecord) => {
  const durationMatch = activity.duration?.match(/(\d+)/);
  if (durationMatch) return Number(durationMatch[1]);

  const timeMatch = activity.time.match(/^(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}$/);
  if (!timeMatch) return 2;

  return Math.max(1, Number(timeMatch[2]) - Number(timeMatch[1]));
};

const isWeekendActivity = (activity: ActivitySaveRecord) => {
  if (!activity.date) return false;

  const match = activity.date.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return false;

  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay();
  return day === 0 || day === 6;
};

export function HomeAIRecommendationFlow({
  isOpen,
  activities,
  isActivitySaved,
  onClose,
  onOpenActivity,
  onToggleSavedActivity,
}: HomeAIRecommendationFlowProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPresented, setIsPresented] = useState(false);
  useBottomSheetScrollLock(shouldRender);

  const [step, setStep] = useState(0);
  const [draftRegion, setDraftRegion] = useState('');
  const [region, setRegion] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeLabel, setTimeLabel] = useState('');
  const [mood, setMood] = useState('');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const calendarAdvanceTimerRef = useRef<number | null>(null);
  const loadingMessageTimerRef = useRef<number | null>(null);
  const loadingCompleteTimerRef = useRef<number | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);

  const clearLoadingTimers = () => {
    if (loadingMessageTimerRef.current) {
      window.clearInterval(loadingMessageTimerRef.current);
      loadingMessageTimerRef.current = null;
    }
    if (loadingCompleteTimerRef.current) {
      window.clearTimeout(loadingCompleteTimerRef.current);
      loadingCompleteTimerRef.current = null;
    }
  };

  const clearCalendarAdvanceTimer = () => {
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
      calendarAdvanceTimerRef.current = null;
    }
  };

  const resetRecommendationSession = () => {
    clearLoadingTimers();
    clearCalendarAdvanceTimer();

    setDraftRegion('');
    setRegion('');
    setDateLabel('');
    setDateValue('');
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setCurrentMonth(new Date());
    setTimeLabel('');
    setMood('');
    setLoadingMessageIndex(0);
  };

  const resetAndClose = () => {
    setIsPresented(false);
    onClose();
    clearLoadingTimers();
    clearCalendarAdvanceTimer();
    window.setTimeout(() => {
      setStep(0);
      resetRecommendationSession();
    }, aiFlowCloseTransitionDuration);
  };

  useEffect(() => {
    if (!isOpen) return;

    setShouldRender(true);
    // Double rAF: first frame lets the DOM node appear with its initial
    // translate-y-full state; second frame triggers the CSS transition.
    let outerFrameId: number;
    let innerFrameId: number;
    outerFrameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        setIsPresented(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrameId);
      window.cancelAnimationFrame(innerFrameId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !shouldRender) return undefined;

    setIsPresented(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, aiFlowCloseTransitionDuration);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  useEffect(() => () => {
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
    }
    clearLoadingTimers();
  }, []);

  const selectedSummary = [
    region && { label: `${region}에서`, targetStep: 0 },
    dateLabel && { label: dateLabel, targetStep: 1 },
    timeLabel && { label: timeLabel, targetStep: 2 },
    mood && { label: `${mood} 활동`, targetStep: 3 },
  ].filter(Boolean) as Array<{ label: string; targetStep: number }>;
  const aiRegionSuggestions = useMemo(() => {
    const filteredSuggestions = filterLocationSuggestions(draftRegion);

    return draftRegion.trim() ? filteredSuggestions : locationSuggestions.slice(0, 5);
  }, [draftRegion]);

  const resetAfterStep = (targetStep: number) => {
    clearLoadingTimers();
    clearCalendarAdvanceTimer();
    setLoadingMessageIndex(0);

    if (targetStep <= 1) {
      setDateLabel('');
      setDateValue('');
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setCurrentMonth(new Date());
    }

    if (targetStep <= 2) {
      setTimeLabel('');
    }

    if (targetStep <= 3) {
      setMood('');
    }
  };

  const goToStep = (targetStep: number) => {
    resetAfterStep(targetStep);
    setStep(targetStep);
  };

  const recommendedActivities = useMemo(() => {
    const normalizedRegion = region.trim().toLowerCase();
    const normalizedMood = mood.trim().toLowerCase();
    const desiredHours = getDurationHours(timeLabel);

    return activities
      .map((activity, index) => {
        const sourceText = `${activity.title} ${activity.location} ${activity.description} ${activity.recommendation} ${activity.category ?? ''}`.toLowerCase();
        const activityMonthDay = getMonthDay(activity.date);
        const activityDate = getDateFromActivity(activity.date);
        const activityHours = getActivityHours(activity);
        let score = 0;

        if (normalizedRegion && sourceText.includes(normalizedRegion)) score += 8;
        if (selectedStartDate && selectedEndDate && activityDate) {
          const dateInRange = activityDate >= selectedStartDate && activityDate <= selectedEndDate;
          if (dateInRange) score += 5;
        } else if (dateValue && activityMonthDay === dateValue) {
          score += 5;
        }
        if (selectedStartDate && selectedEndDate && isWeekendActivity(activity)) score += 1;
        if (activityHours <= desiredHours) score += 3;
        if (Math.abs(activityHours - desiredHours) <= 1) score += 1;

        if (normalizedMood) {
          if (normalizedMood.includes('바다') && /바다|해변|해안|방파제/.test(sourceText)) score += 4;
          if (normalizedMood.includes('조용') && /조용|숲|산책|작은|아침/.test(sourceText)) score += 4;
          if (normalizedMood.includes('혼자') && /가볍|부담|산책|쉬움/.test(sourceText)) score += 3;
          if (normalizedMood.includes('아이') && /공원|마을|행사|안내|쉬움/.test(sourceText)) score += 3;
        }

        return { activity, score, index };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 3)
      .map(({ activity }) => activity);
  }, [activities, dateValue, mood, region, selectedEndDate, selectedStartDate, timeLabel]);

  const confirmRegion = (value = draftRegion) => {
    const nextRegion = value.trim();
    if (!nextRegion) return;

    setRegion(nextRegion);
    setDraftRegion(nextRegion);
    setStep(1);
  };

  const handleBack = () => {
    if (step === 0) {
      resetAndClose();
      return;
    }

    goToStep(step >= 4 ? 3 : step - 1);
  };

  const confirmDateRange = (startDate: Date, endDate: Date) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setDateLabel(formatDateRangeLabel(startDate, endDate));
    setDateValue(getMonthDay(`${startDate.getFullYear()}.${startDate.getMonth() + 1}.${startDate.getDate()}`));
    if (calendarAdvanceTimerRef.current) {
      window.clearTimeout(calendarAdvanceTimerRef.current);
    }
    calendarAdvanceTimerRef.current = window.setTimeout(() => {
      setStep(2);
      calendarAdvanceTimerRef.current = null;
    }, 420);
  };

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const nextDays: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) {
      nextDays.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      nextDays.push(new Date(year, month, day));
    }

    return nextDays;
  }, [currentMonth]);

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateInSelectedRange = (date: Date) => (
    Boolean(selectedStartDate && selectedEndDate && date >= selectedStartDate && date <= selectedEndDate)
  );

  const isSelectedStartDate = (date: Date) => (
    Boolean(selectedStartDate && date.toDateString() === selectedStartDate.toDateString())
  );

  const isSelectedEndDate = (date: Date) => (
    Boolean(selectedEndDate && date.toDateString() === selectedEndDate.toDateString())
  );

  const handleInlineDateClick = (date: Date) => {
    if (isPastDate(date)) return;

    if (!selectedStartDate || selectedEndDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setDateLabel('');
      setDateValue('');
      return;
    }

    if (date < selectedStartDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(null);
      setDateLabel('');
      setDateValue('');
      return;
    }

    confirmDateRange(selectedStartDate, date);
  };

  const handleSummaryClick = (targetStep: number) => {
    if (targetStep === step) return;

    goToStep(targetStep);
  };

  const startRecommendationLoading = (nextMood = mood) => {
    const trimmedMood = nextMood.trim();
    if (!trimmedMood) return;

    clearLoadingTimers();
    setMood(trimmedMood);
    setLoadingMessageIndex(0);
    setStep(4);
    loadingMessageTimerRef.current = window.setInterval(() => {
      setLoadingMessageIndex((currentIndex) => Math.min(currentIndex + 1, loadingMessages.length - 1));
    }, 520);
    loadingCompleteTimerRef.current = window.setTimeout(() => {
      clearLoadingTimers();
      setStep(5);
    }, 2100);
  };

  const restartRecommendation = () => {
    sheetScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setStep(0);
    resetRecommendationSession();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden">
      <div
        className={`absolute inset-0 bg-[#eef3ff]/62 backdrop-blur-[3px] transition-opacity ${
          isPresented ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transitionDuration: `${isPresented ? aiFlowOpenTransitionDuration : aiFlowCloseTransitionDuration}ms`,
          transitionTimingFunction: isPresented ? aiFlowOpenTransitionEasing : aiFlowCloseTransitionEasing,
        }}
        aria-hidden="true"
      />
      <div
        className={`bottom-sheet-panel relative flex h-[92vh] h-[min(92svh,92dvh)] max-h-[92vh] max-h-[calc(100dvh-env(safe-area-inset-top)-8px)] min-h-[82vh] min-h-[min(82svh,82dvh)] w-full max-w-[430px] transform-gpu flex-col overflow-hidden rounded-t-[28px] border border-[#e2e8f7] bg-[#fbfcff] shadow-[0_-18px_48px_rgba(87,101,145,0.16)] transition-[transform,opacity] will-change-transform ${
          isPresented ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{
          transitionDuration: `${isPresented ? aiFlowOpenTransitionDuration : aiFlowCloseTransitionDuration}ms`,
          transitionTimingFunction: isPresented ? aiFlowOpenTransitionEasing : aiFlowCloseTransitionEasing,
        }}
      >
        <div className="sison-ai-gradient-base pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_6%,rgba(130,112,255,0.13),transparent_30%),radial-gradient(circle_at_12%_10%,rgba(107,184,255,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,255,0.98))]" />
        <div
          className="sison-ai-gradient-breathe pointer-events-none absolute inset-[-18%] bg-[radial-gradient(ellipse_at_18%_18%,rgba(118,187,255,0.22),transparent_34%),radial-gradient(ellipse_at_82%_14%,rgba(169,142,255,0.18),transparent_32%),radial-gradient(ellipse_at_48%_76%,rgba(160,232,255,0.14),transparent_38%)] blur-2xl"
        />
        <div
          className="sison-ai-gradient-drift pointer-events-none absolute inset-[-10%] bg-[linear-gradient(115deg,transparent_16%,rgba(116,172,255,0.08)_34%,transparent_52%,rgba(178,143,255,0.08)_70%,transparent_88%)] blur-xl"
        />
        <div className="sison-ai-gradient-halo pointer-events-none absolute right-[-50px] top-[-54px] h-40 w-40 rounded-full bg-[#a39bff]/14 blur-3xl" />
        <header className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b border-[#eef1fb] bg-white/72 px-5 pb-3 pt-4 backdrop-blur-md">
          <button
            type="button"
            onClick={handleBack}
            aria-label={step > 0 ? '이전 질문' : '닫기'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e3e7f4] bg-white/86 text-[#3f4a63] shadow-[0_6px_16px_rgba(84,96,140,0.08)]"
          >
            {step > 0 ? <ArrowLeft className="h-4 w-4" strokeWidth={2} /> : <X className="h-4 w-4" strokeWidth={2} />}
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-[#dfd7ff] bg-[#f4f1ff]/88 px-3 py-1 text-[11px] font-medium text-[#7662d8] shadow-[0_8px_18px_rgba(124,104,220,0.08)]">
            <Sparkles className="h-3 w-3 text-[#7f72ff]" strokeWidth={2} />
            AI 추천
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="h-9 rounded-full px-2 text-[12px] font-medium text-[#777f94]"
          >
            닫기
          </button>
        </header>

        <div
          ref={sheetScrollRef}
          className="bottom-sheet-scrollable relative flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]"
          data-bottom-sheet-scrollable="true"
        >
          <div className="mb-5 flex gap-1.5">
            {[0, 1, 2, 3].map((item) => (
              <span
                key={item}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                  item <= Math.min(step, 3)
                    ? 'bg-[linear-gradient(90deg,#6da8ff,#9888ff)]'
                    : 'bg-[#e5e8f2]'
                }`}
              />
            ))}
          </div>

          {selectedSummary.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {selectedSummary.map((item) => (
                <button
                  key={`${item.targetStep}-${item.label}`}
                  type="button"
                  onClick={() => handleSummaryClick(item.targetStep)}
                  disabled={item.targetStep === step}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium shadow-[0_8px_18px_rgba(94,110,180,0.07)] transition-all active:scale-[0.98] ${
                    item.targetStep === step
                      ? 'cursor-default border-[#e5e8f6] bg-white/56 text-[#9aa2b7]'
                      : 'border-[#dce2fb] bg-white/82 text-[#5d6a86] hover:border-[#cbd4fb] hover:bg-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div key={step} style={{ animation: 'sisonAiFlowIn 220ms ease-out both' }}>
            {step === 0 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">1/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  어디에서 활동을<br />찾아볼까요?
                </h2>
                <input
                  value={draftRegion}
                  onChange={(event) => setDraftRegion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') confirmRegion();
                  }}
                  autoFocus
                  placeholder="어디에서 활동을 찾을까요?"
                  className={aiInputClassName}
                />
                <p className="mb-2 text-[12px] font-medium text-[#7a8499]">
                  {draftRegion.trim() ? '여행지 제안' : '자주 찾는 여행지'}
                </p>
                <div className="mb-4 flex min-h-[70px] flex-wrap content-start gap-2">
                  {aiRegionSuggestions.length > 0 ? (
                    aiRegionSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          confirmRegion(item);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => confirmRegion(item)}
                        className={aiChipClassName}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <span className="rounded-full border border-[#e2e6fb] bg-white/60 px-3 py-2 text-[12px] font-medium text-[#98a1b8]">
                      어울리는 여행지를 찾고 있어요
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!draftRegion.trim()}
                  onClick={() => confirmRegion()}
                  className={aiPrimaryButtonClassName}
                >
                  다음
                </button>
              </section>
            )}

            {step === 1 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">2/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  언제 시간이<br />괜찮으세요?
                </h2>
                <div className="rounded-[1.5rem] border border-[#dfe5fb] bg-white/84 p-3.5 shadow-[0_12px_28px_rgba(91,105,170,0.09),inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-4" style={{ animation: 'sisonAiFlowIn 240ms ease-out both' }}>
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f8ff] text-[#68738f] transition-colors active:bg-[#eef1ff]"
                      aria-label="이전 달"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <div className="text-center">
                      <h3 className="text-[16px] font-semibold text-[#303850]">
                        {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                      </h3>
                      <p className="mt-1 text-[11.5px] text-[#8b94aa]">
                        시작일과 마지막 날을 차례로 골라주세요
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f8ff] text-[#68738f] transition-colors active:bg-[#eef1ff]"
                      aria-label="다음 달"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="mb-1.5 grid grid-cols-7 gap-1 sm:mb-2 sm:gap-1.5">
                    {weekDays.map((day, index) => (
                      <div
                        key={day}
                        className={`py-1.5 text-center text-[11px] font-medium ${
                          index === 0 ? 'text-[#d98c8c]' : index === 6 ? 'text-[#7c97c8]' : 'text-[#a2a7b5]'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {days.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const isPast = isPastDate(date);
                      const isStart = isSelectedStartDate(date);
                      const isEnd = isSelectedEndDate(date);
                      const inRange = isDateInSelectedRange(date);
                      const isSunday = date.getDay() === 0;
                      const isSaturday = date.getDay() === 6;

                      return (
                        <button
                          type="button"
                          key={date.toISOString()}
                          onClick={() => handleInlineDateClick(date)}
                          disabled={isPast}
                          className={`
                            aspect-square rounded-xl text-[12px] font-medium transition-all sm:rounded-2xl sm:text-[12.5px]
                            ${isPast ? 'cursor-not-allowed text-[#d7dbe6]' : 'active:scale-95'}
                            ${isStart || isEnd ? 'scale-[1.03] bg-[#7d8dff] text-white shadow-[0_9px_18px_rgba(125,141,255,0.24),0_0_0_4px_rgba(125,141,255,0.08)]' : ''}
                            ${inRange && !isStart && !isEnd ? 'bg-[#edf0ff] text-[#44506e] shadow-[inset_0_0_0_1px_rgba(125,141,255,0.04)]' : ''}
                            ${!inRange && !isStart && !isEnd && !isPast ? 'bg-white/70 text-[#44506e] hover:bg-[#f4f6ff]' : ''}
                            ${!isPast && isSunday && !isStart && !isEnd && !inRange ? 'text-[#d98c8c]' : ''}
                            ${!isPast && isSaturday && !isStart && !isEnd && !inRange ? 'text-[#7c97c8]' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`mt-4 flex min-h-[28px] items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] transition-all ${
                      selectedStartDate && selectedEndDate
                        ? 'bg-[#f2f4ff] text-[#5964a8] shadow-[inset_0_0_0_1px_rgba(125,141,255,0.08)]'
                        : 'bg-transparent text-[#7a8499]'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#7d8dff]" strokeWidth={2} />
                    <span>
                      {selectedStartDate
                        ? selectedEndDate
                          ? `${formatDateRangeLabel(selectedStartDate, selectedEndDate)}로 정했어요`
                          : `${formatDateLabel(selectedStartDate)}부터 언제까지 가능할까요?`
                        : '가능한 시작일을 먼저 골라주세요'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">3/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  얼마나 참여할 수<br />있나요?
                </h2>
                <div className="space-y-2.5">
                  {timeSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTimeLabel(item);
                        setStep(3);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[14px] font-semibold transition-all active:scale-[0.99] ${
                        timeLabel === item
                          ? 'border-[#aaa2ff] bg-[linear-gradient(135deg,rgba(244,245,255,0.96),rgba(255,255,255,0.88))] text-[#303851] shadow-[0_12px_28px_rgba(124,130,232,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]'
                          : 'border-[#e2e6fb] bg-white/86 text-[#303851] shadow-[0_10px_24px_rgba(97,111,176,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] active:border-[#aaa2ff] active:bg-[#f4f5ff]'
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[12px] font-medium text-[#7c82e8]">선택</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">4/4</p>
                <h2 className="mb-6 text-[24px] font-semibold leading-tight text-[#303850]">
                  어떤 활동이면<br />좋을까요?
                </h2>
                <input
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && mood.trim()) startRecommendationLoading();
                  }}
                  autoFocus
                  placeholder="어떤 활동이면 좋을까요?"
                  className={aiInputClassName}
                />
                <div className="mb-5 space-y-2">
                  {activityMoodSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        startRecommendationLoading(item);
                      }}
                      className="block w-full rounded-2xl border border-[#e2e6fb] bg-white/84 px-4 py-3.5 text-left text-[13px] font-medium text-[#56647f] shadow-[0_8px_20px_rgba(97,111,176,0.07)] transition-all active:scale-[0.99] active:border-[#aaa2ff] active:bg-[#f4f5ff]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!mood.trim()}
                  onClick={() => startRecommendationLoading()}
                  className={aiPrimaryButtonClassName}
                >
                  추천 결과 보기
                </button>
              </section>
            )}

            {step === 4 && (
              <section className="flex min-h-[470px] flex-col justify-center">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-[#dfe5fb] bg-white/82 px-5 py-8 shadow-[0_16px_38px_rgba(91,105,170,0.10),inset_0_1px_0_rgba(255,255,255,0.82)]">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(109,168,255,0.08),rgba(152,136,255,0.11),rgba(255,255,255,0.0))]" />
                  <div
                    className="pointer-events-none absolute inset-y-0 left-[-34%] w-[72%] bg-[linear-gradient(90deg,transparent,rgba(125,141,255,0.18),transparent)] blur-xl"
                    style={{ animation: 'sisonAiLoadingSweep 2.4s ease-in-out infinite' }}
                  />

                  <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-[#e2e6fb] bg-[#f7f9ff]/90 shadow-[0_18px_34px_rgba(112,126,255,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <Sparkles className="h-7 w-7 text-[#7f72ff]" strokeWidth={1.8} />
                    {[0, 1, 2].map((item) => (
                      <span
                        key={item}
                        className="absolute h-2 w-2 rounded-full bg-[#8cc7ee]"
                        style={{
                          left: `${22 + item * 27}px`,
                          bottom: `${18 + (item % 2) * 48}px`,
                          animation: `sisonAiLoadingPulse ${1.7 + item * 0.18}s ease-in-out ${item * 0.18}s infinite`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative text-center">
                    <p className="mb-2 text-[12px] font-medium text-[#7f72ff]">추천을 정리하는 중</p>
                    <h2 className="min-h-[58px] text-[22px] font-semibold leading-snug text-[#303850]">
                      {loadingMessages[loadingMessageIndex]}
                    </h2>
                    <p className="mx-auto mt-4 max-w-[250px] text-[13px] leading-6 text-[#7a8499]">
                      {region}의 일정과 {timeLabel || '가능한 시간'}에 맞춰 가볍게 이어질 활동을 고르고 있어요.
                    </p>

                    <div className="mt-7 flex justify-center gap-2">
                      {loadingMessages.map((message, index) => (
                        <span
                          key={message}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index <= loadingMessageIndex ? 'w-6 bg-[#8d8fff]' : 'w-1.5 bg-[#dce2fb]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">AI 큐레이션</p>
                <h2 className="mb-6 text-[22px] font-semibold leading-tight text-[#303850]">
                  지금 일정에 어울리는<br />활동이에요
                </h2>
                <div className="space-y-3">
                  {recommendedActivities.map((activity) => (
                    <CompactActivityCard
                      key={`${activity.title}-${activity.date}`}
                      variant="aiRecommendation"
                      imageUrl={activity.imageUrl}
                      title={activity.title}
                      location={activity.location}
                      recruitmentStartDate={activity.recruitmentStartDate}
                      recruitmentEndDate={activity.recruitmentEndDate}
                      date={activity.date}
                      time={activity.time}
                      showBookmark
                      isSaved={isActivitySaved(activity)}
                      onBookmarkClick={() => onToggleSavedActivity(activity)}
                      onClick={() => onOpenActivity(activity)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={restartRecommendation}
                  className="mt-5 w-full rounded-2xl border border-[#dfe4fa] bg-white/84 py-3.5 text-[13px] font-semibold text-[#69718d] transition-all active:bg-[#f4f5ff]"
                >
                  다시 고르기
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
