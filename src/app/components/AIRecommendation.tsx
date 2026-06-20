import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, MapPin, Clock } from 'lucide-react';
import { PageShell } from './PageShell';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';
import type { ActivitySaveRecord } from '../activitySaveState';
import { captureElementAsPng, downloadBlob } from '../utils/captureElementAsImage';

interface AIRecommendationProps {
  activity: ActivitySaveRecord | null;
  isOpen: boolean;
  onBack: () => void;
  onExitComplete?: () => void;
}

const defaultActivity: ActivitySaveRecord = {
  imageUrl: '',
  title: '여행지 가까이의 작은 활동',
  location: '여행지 근처',
  date: '2026.06.27',
  time: '09:00 - 11:00',
  description: '여행 일정에 맞춰 가볍게 참여할 수 있는 활동입니다.',
  materials: '',
  capacity: '12명',
  currentParticipants: '4명',
  volunteerTarget: '성인',
  recommendation: '',
  isRecruiting: true,
};

const getRegionPlan = (activity: ActivitySaveRecord) => {
  const sourceText = `${activity.title} ${activity.location}`;
  const activityTitle = activity.title;
  const activityPlace = activity.volunteerPlace || activity.location;
  const startTime = activity.time?.split('-')[0]?.trim() || '09:00';

  if (sourceText.includes('광안리') || sourceText.includes('수영') || sourceText.includes('해운대') || sourceText.includes('부산')) {
    return {
      note: '바다와 골목이 가까운 일정이에요. 활동 뒤에는 멀리 이동하기보다 근처를 천천히 걷는 흐름이 잘 맞아요.',
      itinerary: [
        { time: startTime, title: activityTitle, location: activityPlace },
        { time: '12:10', title: '수변최고돼지국밥 민락본점', location: '부산 수영구 민락동' },
        { time: '14:00', title: '민락수변공원 산책', location: '부산 수영구 민락동' },
        { time: '16:20', title: 'F1963 카페 테라로사', location: '부산 수영구 망미동' },
      ],
      nearbySpots: [
        { title: '민락수변공원', distance: '도보 12분' },
        { title: '광안리해수욕장', distance: '도보 8분' },
        { title: 'F1963', distance: '차량 14분' },
      ],
    };
  }

  if (sourceText.includes('안목') || sourceText.includes('강릉')) {
    return {
      note: '아침 바다를 중심으로 가볍게 이어지는 일정이에요. 활동 후 커피거리와 해변을 부담 없이 둘러보기 좋아요.',
      itinerary: [
        { time: startTime, title: activityTitle, location: activityPlace },
        { time: '10:40', title: '보사노바 커피로스터스', location: '강릉 안목해변' },
        { time: '12:30', title: '초당할머니순두부', location: '강릉 초당동' },
        { time: '15:00', title: '강문해변 쉬어가기', location: '강릉 강문동' },
      ],
      nearbySpots: [
        { title: '안목커피거리', distance: '도보 4분' },
        { title: '강문해변', distance: '차량 9분' },
        { title: '초당두부마을', distance: '차량 12분' },
      ],
    };
  }

  if (sourceText.includes('제주') || sourceText.includes('애월') || sourceText.includes('성산') || sourceText.includes('비자림')) {
    return {
      note: '숲이나 바다를 오래 바라보기 좋은 제주 일정이에요. 활동 전후로 이동을 줄이고 한 지역에 머무는 흐름을 추천해요.',
      itinerary: [
        { time: startTime, title: activityTitle, location: activityPlace },
        { time: '12:20', title: '명진전복', location: '제주 구좌읍' },
        { time: '14:10', title: '비자림 산책', location: '제주 구좌읍' },
        { time: '16:30', title: '월정리 해변', location: '제주 구좌읍' },
      ],
      nearbySpots: [
        { title: '비자림', distance: '차량 10분' },
        { title: '월정리해변', distance: '차량 16분' },
        { title: '세화해변', distance: '차량 13분' },
      ],
    };
  }

  if (sourceText.includes('여수')) {
    return {
      note: '해안길을 따라 천천히 이어가기 좋은 일정이에요. 늦은 오후 활동이라 노을 전후의 여유를 살리기 좋아요.',
      itinerary: [
        { time: startTime, title: activityTitle, location: activityPlace },
        { time: '18:20', title: '돌산공원 산책', location: '여수 돌산읍' },
        { time: '19:10', title: '좌수영바게트버거', location: '여수 중앙동' },
        { time: '20:00', title: '여수해상케이블카 야경', location: '여수 돌산읍' },
      ],
      nearbySpots: [
        { title: '돌산공원', distance: '차량 8분' },
        { title: '여수해상케이블카', distance: '차량 10분' },
        { title: '고소동 벽화마을', distance: '차량 12분' },
      ],
    };
  }

  if (sourceText.includes('통영')) {
    return {
      note: '항구와 골목을 중심으로 천천히 걷기 좋은 일정이에요. 활동 후에는 가까운 시장과 바다 풍경을 이어보세요.',
      itinerary: [
        { time: startTime, title: activityTitle, location: activityPlace },
        { time: '13:20', title: '통영중앙시장 점심', location: '통영 중앙동' },
        { time: '15:00', title: '동피랑 벽화마을 산책', location: '통영 태평동' },
        { time: '16:40', title: '강구안 항구 쉬어가기', location: '통영 항남동' },
      ],
      nearbySpots: [
        { title: '강구안', distance: '도보 6분' },
        { title: '동피랑 벽화마을', distance: '도보 14분' },
        { title: '통영중앙시장', distance: '도보 8분' },
      ],
    };
  }

  return {
    note: '활동 전후로 가까운 명소를 천천히 이어보는 일정이에요. 실제 장소 기반 추천은 이후 API로 더 정교하게 연결할 예정이에요.',
    itinerary: [
      { time: startTime, title: activityTitle, location: activityPlace },
      { time: '12:30', title: '지역 식당에서 점심', location: '원도심 식당가' },
      { time: '14:00', title: '지역 문화거리 산책', location: '중앙로 문화거리' },
      { time: '16:00', title: '로컬 카페 쉬어가기', location: '시청 앞 카페거리' },
    ],
    nearbySpots: [
      { title: '중앙로 문화거리', distance: '도보 10분' },
      { title: '원도심 시장', distance: '도보 12분' },
      { title: '시청 앞 카페거리', distance: '차량 8분' },
    ],
  };
};

const aiPreparationMessages = [
  'AI가 여행 흐름을 정리하고 있어요',
  '근처에서 이어가기 좋은 곳을 살펴보고 있어요',
  '활동 뒤에 무리 없는 동선을 맞춰보고 있어요',
];

export function AIRecommendation({ activity, isOpen, onBack, onExitComplete }: AIRecommendationProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPreparing, setIsPreparing] = useState(true);
  const [screenshotMessage, setScreenshotMessage] = useState('');
  const [preparationMessageIndex, setPreparationMessageIndex] = useState(0);
  const preparationMessageTimerRef = useRef<number | null>(null);
  const preparationCompleteTimerRef = useRef<number | null>(null);
  const selectedActivity = activity ?? defaultActivity;
  const plan = useMemo(() => getRegionPlan(selectedActivity), [selectedActivity]);
  useBottomSheetScrollLock(shouldRender);

  const clearPreparationTimers = () => {
    if (preparationMessageTimerRef.current) {
      window.clearInterval(preparationMessageTimerRef.current);
      preparationMessageTimerRef.current = null;
    }

    if (preparationCompleteTimerRef.current) {
      window.clearTimeout(preparationCompleteTimerRef.current);
      preparationCompleteTimerRef.current = null;
    }
  };

  const handleBack = () => {
    onBack();
  };

  useEffect(() => {
    if (!isOpen) return;

    setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      clearPreparationTimers();
      return undefined;
    }

    clearPreparationTimers();
    setIsPreparing(true);
    setPreparationMessageIndex(0);

    preparationMessageTimerRef.current = window.setInterval(() => {
      setPreparationMessageIndex((currentIndex) =>
        Math.min(currentIndex + 1, aiPreparationMessages.length - 1)
      );
    }, 760);

    preparationCompleteTimerRef.current = window.setTimeout(() => {
      clearPreparationTimers();
      setIsPreparing(false);
    }, 2350);

    return clearPreparationTimers;
  }, [isOpen, selectedActivity.title]);

  useEffect(() => {
    if (isOpen || !shouldRender) return undefined;

    setShouldRender(false);
    onExitComplete?.();
    return undefined;
  }, [isOpen, onExitComplete, shouldRender]);

  useEffect(() => () => {
    clearPreparationTimers();
  }, []);

  useEffect(() => {
    if (!screenshotMessage) return undefined;

    const timer = window.setTimeout(() => setScreenshotMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [screenshotMessage]);

  const handleSaveScreenshot = async () => {
    const sourceElement = captureRef.current;
    if (!sourceElement) return;

    try {
      setScreenshotMessage('');
      const blob = await captureElementAsPng(sourceElement, 2, { backgroundColor: '#fdfcfa' });
      downloadBlob(blob, `${selectedActivity.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 20) || 'sison'}-itinerary.png`);
    } catch (error) {
      console.error('AI recommendation screenshot download failed', error);
      setScreenshotMessage('이미지 저장에 실패했어요. 다시 시도해 주세요.');
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="bottom-sheet-viewport z-[70] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-[#2a2a2a]/[0.08] backdrop-blur-[1.5px]"
        aria-hidden="true"
      />
      <div
        className="bottom-sheet-panel bottom-sheet-panel-full relative w-full max-w-[430px] overflow-y-auto bg-[#fdfcfa] shadow-[0_-18px_46px_rgba(39,45,40,0.12)]"
        data-bottom-sheet-scrollable="true"
      >
        <PageShell reserveBottomTabSpace={false}>
          <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="상세 화면으로 돌아가기"
                  className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
                </button>
                <h3>여행 일정</h3>
              </div>
            </div>
          </header>

          {isPreparing ? (
            <div className="px-6 py-6 space-y-7">
              <section>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
                  <p className="mb-2 text-[13px] font-medium text-[#6f8b78]">
                    여행 일정 준비 중
                  </p>
                  <h3 className="mb-3 text-[#2a2a2a]">
                    {aiPreparationMessages[preparationMessageIndex]}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#777]">
                    {selectedActivity.title} 이후의 이동과 머무는 시간을 차분히 맞춰보고 있어요.
                  </p>
                </div>
              </section>

              <section>
                <div className="rounded-2xl bg-[#e8f5ed] p-5">
                  <div className="ai-loading-shimmer mb-3 h-3.5 w-4/5 rounded-full" />
                  <div className="ai-loading-shimmer mb-3 h-3.5 w-full rounded-full" />
                  <div className="ai-loading-shimmer h-3.5 w-2/3 rounded-full" />
                </div>
              </section>

              <section>
                <h3 className="mb-4">추천 일정</h3>
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="ai-loading-step bg-white rounded-2xl p-4 shadow-sm border border-black/5"
                    >
                      <div className="flex gap-4">
                        <div className="relative min-w-[45px] pt-1">
                          <div className="h-2.5 w-2.5 rounded-full bg-[#cfe7d9]" />
                          {item < 3 && <div className="ai-loading-line ml-[4px] mt-1 h-10 w-px bg-[#e3efe8]" />}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="ai-loading-shimmer mb-3 h-4 w-3/4 rounded-full" />
                          <div className="ai-loading-shimmer h-3.5 w-1/2 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-5">근처 추천 장소</h3>
                <div className="space-y-2">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="ai-loading-step flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white px-4 py-3"
                    >
                      <div className="ai-loading-shimmer h-3.5 w-28 rounded-full" />
                      <div className="ai-loading-shimmer h-3.5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div ref={captureRef} className="relative space-y-8 bg-[#fdfcfa] px-6 py-6">
              <section>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
                  <h3 className="mb-4">{selectedActivity.title}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
                      <span className="text-sm font-normal text-[#8f8f8f]">
                        {selectedActivity.volunteerPlace || selectedActivity.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#b8b2aa]" strokeWidth={2} />
                      <span className="text-sm font-normal text-[#8f8f8f]">
                        {[selectedActivity.date, selectedActivity.time].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="bg-[#e8f5ed] rounded-2xl p-5">
                  <p className="text-sm text-[#2a2a2a] leading-relaxed">{plan.note}</p>
                </div>
              </section>

              <section>
                <h3 className="mb-4">
                  추천 일정
                </h3>
                <div className="space-y-3">
                  {plan.itinerary.map((item, index) => (
                    <div
                      key={`${item.time}-${index}`}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-black/5"
                    >
                      <div className="flex gap-4">
                        <div className="text-sm text-[#a8d5ba] font-medium min-w-[45px]">
                          {item.time}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[#2a2a2a] mb-1">{item.title}</h4>
                          <p className="text-sm text-[#999]">{item.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-5">
                  근처 추천 장소
                </h3>
                <div className="space-y-2">
                  {plan.nearbySpots.map((spot, index) => (
                    <div
                      key={`${spot.title}-${index}`}
                      className="flex items-center justify-between gap-4 py-3 px-4 bg-white rounded-2xl border border-black/5"
                    >
                      <span className="text-sm text-[#2a2a2a]">{spot.title}</span>
                      <span className="text-sm text-[#999] flex-shrink-0">{spot.distance}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pt-2 pb-3">
                <button
                  type="button"
                  onClick={handleSaveScreenshot}
                  className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a] flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" strokeWidth={2} />
                  <span>스크린샷 저장하기</span>
                </button>
                {screenshotMessage && (
                  <p className="mt-3 text-center text-[12.5px] leading-relaxed text-[#c9897e]">
                    {screenshotMessage}
                  </p>
                )}
              </section>
            </div>
          )}
        </PageShell>
      </div>
    </div>
  );
}
