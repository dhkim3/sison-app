import { useEffect, useRef, useState } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type PlaceStop = {
  type: 'place';
  id: string;
  title: string;
  address: string;
  distance: number;
  contentTypeId: string;
  image: string | null;
  overview: string | null;
};
type Stop = PlaceStop;

type TravelPlan = {
  title: string;
  summary: string;
  duration: string;
  maxDistanceM: number;
  stops: Stop[];
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const travelPlanCache = new Map<string, { plans: TravelPlan[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCacheKey(destination: string, date: string, timePreference: string) {
  return `${destination.trim()}|${date.trim()}|${timePreference.trim()}`;
}

function readCache(key: string): TravelPlan[] | null {
  const entry = travelPlanCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    travelPlanCache.delete(key);
    return null;
  }
  return entry.plans;
}

function writeCache(key: string, plans: TravelPlan[]) {
  travelPlanCache.set(key, { plans, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveDestination(location: string): string {
  const parts = location.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ') || location.trim() || '이 지역';
}

function deriveTimePreference(time: string): string {
  const match = time.match(/(\d{1,2}):\d{2}\s*[-~]\s*(\d{1,2}):\d{2}/);
  if (!match) return '2~4시간';
  const hours = Math.max(1, Number(match[2]) - Number(match[1]));
  if (hours <= 2) return '1~2시간';
  if (hours <= 4) return '2~4시간';
  return '4시간 이상';
}

// ─── API Orchestration ────────────────────────────────────────────────────────

async function fetchTravelPlans(
  activity: ActivitySaveRecord,
  signal: AbortSignal,
): Promise<TravelPlan[]> {
  const address = activity.volunteerPlace?.trim() || activity.location?.trim() || '';
  if (!address) throw new Error('활동 주소 정보가 없어요.');

  const destination = deriveDestination(activity.location || '');
  const date = activity.date || activity.activityDate || '';
  const timePreference = deriveTimePreference(activity.time || '');
  const cacheKey = getCacheKey(destination, date, timePreference);

  const cached = readCache(cacheKey);
  if (cached) return cached;

  const res = await fetch('/api/ai/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      region: destination,
      destination,
      date,
      timePreference,
      activity: { title: activity.title },
    }),
    signal,
  });

  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    const text = await res.text().catch(() => '');
    console.error('[travel-plan] 예상치 못한 응답:', res.status, text.slice(0, 300));
    throw new Error('일정을 만들지 못했어요.');
  }

  const data = await res.json() as { ok: boolean; plans?: TravelPlan[]; error?: string };
  if (!data.ok || !data.plans?.length) {
    throw new Error('일정을 만들지 못했어요.');
  }

  writeCache(cacheKey, data.plans);
  return data.plans;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStopDescription(stop: PlaceStop): string {
  // 1순위: API에서 받아온 overview
  if (stop.overview) return stop.overview;

  // 2순위: contentTypeId + 제목 키워드 기반 설명
  const { title, contentTypeId, address } = stop;
  const region = address.match(/(\S+[시군])\s/)?.[1] ?? '';
  const pre = region ? `${region}의 ` : '';

  if (contentTypeId === '39') return '지역 대표 음식을 맛볼 수 있는 맛집';
  if (contentTypeId === '38') return '지역 특산품을 구매할 수 있는 쇼핑 명소';
  if (contentTypeId === '28') return '레포츠와 액티비티를 즐길 수 있는 명소';
  if (/사찰|절|암자/.test(title)) return '조용한 분위기의 전통 사찰';
  if (/박물관|기념관|전시관/.test(title)) return `${pre}지역 역사와 문화를 전시하는 공간`;
  if (/미술관|갤러리/.test(title)) return '예술 작품을 감상할 수 있는 전시 공간';
  if (/전망대|전망/.test(title)) return '탁 트인 풍경을 감상할 수 있는 전망 명소';
  if (/해수욕장|해변|모래사장/.test(title)) return '바다 풍경과 산책을 즐길 수 있는 해수욕장';
  if (/수목원|식물원/.test(title)) return '다양한 식물과 자연을 체험할 수 있는 공간';
  if (/공원|정원/.test(title)) return '가볍게 산책하기 좋은 휴식 공간';
  if (/시장|장터/.test(title)) return `${pre}지역 먹거리와 문화를 경험할 수 있는 시장`;
  if (/향교|서원|고택/.test(title)) return '조선시대 전통 건축을 살펴볼 수 있는 유적지';
  if (/항$|항구|포구/.test(title)) return '바다와 어항 풍경을 감상하기 좋은 장소';
  if (/숲|수림/.test(title)) return '자연 속 숲길 산책을 즐기기 좋은 명소';
  if (/계곡|폭포/.test(title)) return '시원한 자연 경관을 즐길 수 있는 명소';
  if (contentTypeId === '14') return `${pre}문화와 역사를 살펴볼 수 있는 시설`;
  return `${pre}지역을 대표하는 관광 명소`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const aiPreparationMessages = [
  'AI가 활동 정보를 살펴보고 있어요',
  '주변 관광지를 찾고 있어요',
  '무리 없는 동선을 계산하고 있어요',
  '여행 일정 준비 중이에요',
  '봉사 후 가볼 만한 장소를 고르고 있어요',
  '시선만의 추천 코스를 만들고 있어요',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AIRecommendation({ activity, isOpen, onBack, onExitComplete }: AIRecommendationProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPreparing, setIsPreparing] = useState(true);
  const [screenshotMessage, setScreenshotMessage] = useState('');
  const [preparationMessageIndex, setPreparationMessageIndex] = useState(0);
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const preparationMessageTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const selectedActivity = activity ?? defaultActivity;
  useBottomSheetScrollLock(shouldRender);

  const clearPreparationTimer = () => {
    if (preparationMessageTimerRef.current) {
      window.clearInterval(preparationMessageTimerRef.current);
      preparationMessageTimerRef.current = null;
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
      clearPreparationTimer();
      abortControllerRef.current?.abort();
      return undefined;
    }

    clearPreparationTimer();
    setIsPreparing(true);
    setPreparationMessageIndex(0);
    setPlans([]);
    setPlanError(null);

    preparationMessageTimerRef.current = window.setInterval(() => {
      setPreparationMessageIndex((prev) => (prev + 1) % aiPreparationMessages.length);
    }, 2500);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchTravelPlans(selectedActivity, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPlans(result);
          setPlanError(null);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        if (!isAbort) {
          setPlanError(
            err instanceof Error ? err.message : '일정을 생성하지 못했어요.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          clearPreparationTimer();
          setIsPreparing(false);
        }
      });

    return () => {
      controller.abort();
      clearPreparationTimer();
    };
  // selectedActivity.title 변경 시 재요청
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedActivity.title]);

  useEffect(() => {
    if (isOpen || !shouldRender) return undefined;

    setShouldRender(false);
    onExitComplete?.();
    return undefined;
  }, [isOpen, onExitComplete, shouldRender]);

  useEffect(() => () => {
    clearPreparationTimer();
    abortControllerRef.current?.abort();
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
      downloadBlob(
        blob,
        `${selectedActivity.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 20) || 'sison'}-itinerary.png`,
      );
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
            </div>
          ) : (
            <div ref={captureRef} className="relative space-y-8 bg-[#fdfcfa] px-6 py-6">
              {/* 봉사활동 정보 */}
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

              {/* 에러 */}
              {planError && (
                <section>
                  <div className="rounded-2xl bg-[#fff5f5] border border-[#f5d5d5] p-5">
                    <p className="text-sm text-[#c9897e] leading-relaxed">{planError}</p>
                    <p className="mt-1 text-[12px] text-[#aaa]">잠시 후 다시 시도해주세요.</p>
                  </div>
                </section>
              )}

              {/* 추천 일정 카드 3개 */}
              {plans.length > 0 && (
                <section>
                  <h3 className="mb-4">추천 일정</h3>
                  <div className="space-y-4">
                    {plans.map((plan, planIndex) => {
                      const radiusKm =
                        plan.maxDistanceM > 0
                          ? `${(plan.maxDistanceM / 1000).toFixed(1)}km`
                          : null;
                      return (
                        <div
                          key={planIndex}
                          className="bg-white rounded-3xl p-5 shadow-sm border border-black/5"
                        >
                          {/* 헤더 */}
                          <p className="mb-1 text-[11px] font-medium text-[#a8d5ba] uppercase tracking-wide">
                            일정 {planIndex + 1}
                          </p>
                          <h4 className="mb-1.5 text-[#2a2a2a]">{plan.title}</h4>
                          <p className="mb-3 text-sm leading-relaxed text-[#777]">{plan.summary}</p>

                          {/* 소요 시간 + 총 이동 거리 */}
                          <div className="mb-4 flex items-center gap-4 text-[12px] text-[#a8b5ac]">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                              {plan.duration}
                            </span>
                            {radiusKm && (
                              <span>🚗 반경 {radiusKm}</span>
                            )}
                          </div>

                          {/* 장소 목록 */}
                          {plan.stops.length > 0 && (
                            <div className="mb-1">
                              {plan.stops.map((stop, stopIndex) => {
                                const distKm =
                                  stop.distance > 0
                                    ? `${(stop.distance / 1000).toFixed(1)}km`
                                    : null;
                                const description = getStopDescription(stop);
                                return (
                                  <div key={stopIndex} className="flex gap-3">
                                    {/* 타임라인 점·선 */}
                                    <div className="flex flex-col items-center flex-shrink-0 pt-[5px]">
                                      <div className="h-2 w-2 rounded-full bg-[#a8d5ba] flex-shrink-0" />
                                      {stopIndex < plan.stops.length - 1 && (
                                        <div className="mt-1 w-px flex-1 min-h-[36px] bg-[#e3efe8]" />
                                      )}
                                    </div>
                                    {/* 썸네일 + 텍스트 */}
                                    <div className="flex-1 pb-3.5 flex gap-2.5">
                                      {stop.image && (
                                        <img
                                          src={stop.image}
                                          alt=""
                                          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 self-start"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#2a2a2a] leading-snug">
                                          {stop.title}
                                          {distKm && (
                                            <span className="ml-1.5 text-[12px] font-normal text-[#a8b5ac]">
                                              · {distKm}
                                            </span>
                                          )}
                                        </p>
                                        <p className="mt-0.5 text-[12px] text-[#b0bcb3] leading-snug line-clamp-2">
                                          {description}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 스크린샷 저장 */}
              {plans.length > 0 && (
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
              )}
            </div>
          )}
        </PageShell>
      </div>
    </div>
  );
}
