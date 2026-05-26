import { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Sparkles, X } from 'lucide-react';
import { CompactActivityCard } from './CompactActivityCard';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import type { ActivitySaveLookup, ActivitySaveRecord } from '../activitySaveState';

interface HomeAIRecommendationFlowProps {
  isOpen: boolean;
  activities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onClose: () => void;
  onOpenActivity: (activity: ActivitySaveRecord) => void;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
}

const regionSuggestions = ['광안리', '안목해변', '애월', '해운대'];
const timeSuggestions = ['1시간', '2시간', '3시간', '반나절'];
const activityMoodSuggestions = [
  '조용히 걸으며 할 수 있는',
  '바다 근처에서 할 수 있는',
  '혼자 참여해도 부담 없는',
  '아이와 함께할 수 있는',
];

const aiInputClassName =
  'mb-4 w-full rounded-2xl border border-[#c9d5ff] bg-white/86 px-4 py-4 text-[16px] text-[#28324a] outline-none shadow-[0_8px_22px_rgba(96,124,210,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] transition-all placeholder:text-[#9aa4bd] focus:border-[#9c8cff] focus:bg-white focus:shadow-[0_0_0_4px_rgba(118,107,255,0.10),0_10px_26px_rgba(96,124,210,0.10)]';

const aiChipClassName =
  'rounded-full border border-[#d9ddff] bg-[#f6f8ff]/88 px-3.5 py-2 text-[12.5px] font-medium text-[#52607d] shadow-[0_8px_18px_rgba(94,110,180,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all active:scale-[0.98] active:border-[#aaa2ff] active:bg-[#f0efff]';

const aiPrimaryButtonClassName =
  'w-full rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#6fb4ff,#7b7cff_52%,#b763ec)] py-4 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(112,126,255,0.24)] transition-all active:scale-[0.99] disabled:border-transparent disabled:bg-[#e5e8f3] disabled:text-[#a8afc2] disabled:shadow-none';

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
  const [step, setStep] = useState(0);
  const [draftRegion, setDraftRegion] = useState('');
  const [region, setRegion] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timeLabel, setTimeLabel] = useState('');
  const [mood, setMood] = useState('');

  const resetAndClose = () => {
    onClose();
    window.setTimeout(() => {
      setStep(0);
      setDraftRegion('');
      setRegion('');
      setDateLabel('');
      setDateValue('');
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      setIsCalendarOpen(false);
      setTimeLabel('');
      setMood('');
    }, 220);
  };

  const selectedSummary = [
    region && `${region}에서`,
    dateLabel && dateLabel,
    timeLabel && timeLabel,
    mood && `${mood} 활동`,
  ].filter(Boolean);

  const resultSentence = `${region || '여행지'}에서 ${dateLabel || '원하는 날'} ${timeLabel || '2시간'} 동안 어울리는 활동을 골랐어요.`;
  const querySentence = `${region || '여행지'}에서 ${dateLabel || '원하는 날'} ${timeLabel || '2시간'} ${mood || '조용히 참여할 수 있는'} 활동`;

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

    if (step === 1) {
      setRegion('');
    }

    setStep(step - 1);
  };

  const handleCalendarConfirm = (startDate: Date, endDate: Date) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setDateLabel(formatDateRangeLabel(startDate, endDate));
    setDateValue(getMonthDay(`${startDate.getFullYear()}.${startDate.getMonth() + 1}.${startDate.getDate()}`));
    setStep(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#eef3ff]/62 backdrop-blur-[3px]">
      <style>
        {`
          @keyframes sisonAiFlowIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes sisonAiAmbientFlow {
            0%, 100% { transform: translate3d(-2%, -1%, 0) scale(1); opacity: 0.58; }
            45% { transform: translate3d(3%, 2%, 0) scale(1.04); opacity: 0.76; }
            72% { transform: translate3d(1%, -2%, 0) scale(1.02); opacity: 0.64; }
          }

          @keyframes sisonAiAmbientDrift {
            0%, 100% { transform: translate3d(2%, 1%, 0) rotate(-2deg); opacity: 0.34; }
            50% { transform: translate3d(-3%, -1.5%, 0) rotate(2deg); opacity: 0.48; }
          }
        `}
      </style>
      <div className="relative max-h-[92vh] min-h-[82vh] w-full max-w-[430px] overflow-hidden rounded-t-[28px] border border-[#e2e8f7] bg-[#fbfcff] shadow-[0_-18px_48px_rgba(87,101,145,0.16)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_6%,rgba(130,112,255,0.13),transparent_30%),radial-gradient(circle_at_12%_10%,rgba(107,184,255,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,255,0.98))]" />
        <div
          className="pointer-events-none absolute inset-[-18%] bg-[radial-gradient(ellipse_at_18%_18%,rgba(118,187,255,0.22),transparent_34%),radial-gradient(ellipse_at_82%_14%,rgba(169,142,255,0.18),transparent_32%),radial-gradient(ellipse_at_48%_76%,rgba(160,232,255,0.14),transparent_38%)] blur-2xl"
          style={{ animation: 'sisonAiAmbientFlow 18s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute inset-[-10%] bg-[linear-gradient(115deg,transparent_16%,rgba(116,172,255,0.08)_34%,transparent_52%,rgba(178,143,255,0.08)_70%,transparent_88%)] blur-xl"
          style={{ animation: 'sisonAiAmbientDrift 22s ease-in-out infinite' }}
        />
        <div className="pointer-events-none absolute right-[-50px] top-[-54px] h-40 w-40 rounded-full bg-[#a39bff]/14 blur-3xl" />
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eef1fb] bg-white/72 px-5 pb-3 pt-4 backdrop-blur-md">
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

        <div className="relative h-[calc(92vh-64px)] overflow-y-auto px-5 pb-8">
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
                <span key={item} className="rounded-full border border-[#dce2fb] bg-white/82 px-3 py-1.5 text-[12px] font-medium text-[#5d6a86] shadow-[0_8px_18px_rgba(94,110,180,0.07)]">
                  {item}
                </span>
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
                <div className="mb-5 flex flex-wrap gap-2">
                  {regionSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => confirmRegion(item)}
                      className={aiChipClassName}
                    >
                      {item}
                    </button>
                  ))}
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
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-[#c9d5ff] bg-white/86 px-4 py-4 text-left text-[15px] font-semibold text-[#303851] shadow-[0_10px_24px_rgba(97,111,176,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all active:scale-[0.99] active:border-[#aaa2ff] active:bg-[#f4f5ff]"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f1f4ff] text-[#6b80ff]">
                    <Calendar className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-[#8b94aa]">여행 일정</span>
                    <span className="block truncate">{dateLabel || '달력에서 일정 선택'}</span>
                  </span>
                </button>
                <p className="text-[12.5px] leading-relaxed text-[#8a94aa]">
                  기존 달력에서 가능한 날짜를 고르면 다음 질문으로 넘어가요.
                </p>
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
                      className="flex w-full items-center justify-between rounded-2xl border border-[#e2e6fb] bg-white/86 px-4 py-4 text-left text-[14px] font-semibold text-[#303851] shadow-[0_10px_24px_rgba(97,111,176,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all active:scale-[0.99] active:border-[#aaa2ff] active:bg-[#f4f5ff]"
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
                    if (event.key === 'Enter' && mood.trim()) setStep(4);
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
                        setMood(item);
                        setStep(4);
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
                  onClick={() => setStep(4)}
                  className={aiPrimaryButtonClassName}
                >
                  추천 결과 보기
                </button>
              </section>
            )}

            {step === 4 && (
              <section>
                <p className="mb-2 text-[13px] font-medium text-[#5e83ff]">추천 결과</p>
                <h2 className="mb-2 text-[22px] font-semibold leading-tight text-[#303850]">
                  {region}에서 찾은<br />조용한 활동이에요
                </h2>
                <p className="mb-5 text-[13px] leading-relaxed text-[#7a8499]">
                  {resultSentence}
                </p>
                <div className="mb-4 rounded-2xl border border-[#e0e5fb] bg-white/82 px-4 py-3 text-[13px] font-medium leading-relaxed text-[#5d6a86] shadow-[0_8px_20px_rgba(97,111,176,0.07)]">
                  {querySentence}
                </div>
                <div className="space-y-2.5">
                  {recommendedActivities.map((activity) => (
                    <CompactActivityCard
                      key={`${activity.title}-${activity.date}`}
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
                  onClick={() => setStep(0)}
                  className="mt-5 w-full rounded-2xl border border-[#dfe4fa] bg-white/84 py-3.5 text-[13px] font-semibold text-[#69718d] transition-all active:bg-[#f4f5ff]"
                >
                  다시 고르기
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
      <CalendarBottomSheet
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onConfirm={handleCalendarConfirm}
        initialStartDate={selectedStartDate || undefined}
        initialEndDate={selectedEndDate || undefined}
      />
    </div>
  );
}
