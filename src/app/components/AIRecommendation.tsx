import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, MapPin, Clock, Sparkles } from 'lucide-react';
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

type GeocodeSource = 'activity_place' | 'meeting_place' | 'institution' | 'region_center';
type FetchResult = { plans: TravelPlan[]; baseLocationSource: GeocodeSource | null };


// ─── Cache ────────────────────────────────────────────────────────────────────

const travelPlanCache = new Map<string, { plans: TravelPlan[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const itineraryAccentColors = ['#9FCFAE', '#6EA9D8', '#8574D6'];

function getCacheKey(destination: string, date: string, timePreference: string, activityKey: string) {
  return `${destination.trim()}|${date.trim()}|${timePreference.trim()}|${activityKey.trim()}`;
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

function getSafeImageSource(src: string | null) {
  if (!src) return '';

  try {
    const url = new URL(src, window.location.href);
    if (window.location.protocol === 'https:' && url.protocol === 'http:') {
      url.protocol = 'https:';
    }

    if (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && url.origin !== window.location.origin
    ) {
      return `/api/image-proxy?url=${encodeURIComponent(url.toString())}`;
    }

    return url.toString();
  } catch {
    return src;
  }
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
): Promise<FetchResult> {
  const address = activity.volunteerPlace?.trim() || '';
  const destination = deriveDestination(activity.location || activity.volunteerPlace || '');
  const date = activity.date || activity.activityDate || '';
  const timePreference = deriveTimePreference(activity.time || '');
  const cacheKey = getCacheKey(destination, date, timePreference, `${activity.title}|${address}`);

  const cached = readCache(cacheKey);
  if (cached) return { plans: cached, baseLocationSource: null };

  const res = await fetch('/api/ai/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      region: destination,
      destination,
      date,
      timePreference,
      activity: {
        title: activity.title,
        location: activity.location || activity.volunteerPlace || '',
        meetingPlace: '',
        institutionName: activity.recruitingOrganization || '',
        organizationName: activity.registrationOrganization || '',
        region: activity.region || '',
      },
    }),
    signal,
  });

  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    const text = await res.text().catch(() => '');
    console.error('[travel-plan] 비정상 응답:', res.status, text.slice(0, 200));
    throw new Error('일정을 만들지 못했어요.');
  }

  const data = await res.json() as {
    ok: boolean;
    plans?: TravelPlan[];
    error?: string;
    baseLocation?: { source: GeocodeSource };
  };
  if (!data.ok || !data.plans?.length) {
    throw new Error(data.error || '일정을 만들지 못했어요.');
  }

  writeCache(cacheKey, data.plans);
  return { plans: data.plans, baseLocationSource: data.baseLocation?.source ?? null };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// 제목 문자 기반 단순 해시 — 같은 장소는 항상 같은 variation 선택
function hashVariation(text: string, count: number): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) & 0xffff;
  return h % count;
}

function getStopDescription(stop: PlaceStop, stopIndex = 0): string {
  if (stop.overview) {
    const cleaned = stop.overview
      .replace(/<[^>]+>/g, '')
      .replace(/^\S+(?:시|군|구|도)의\s*/g, '')
      .replace(/서울특별시의?\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned && cleaned !== stop.title.trim()) return cleaned;
  }

  const { title, contentTypeId, address } = stop;
  const seed = title || stop.id || address;
  const v = (arr: string[]) => arr[(hashVariation(seed, arr.length) + stopIndex) % arr.length];
  const region = address.match(/(\S+[시군])\s/)?.[1] ?? '';

  if (contentTypeId === '39') return v([
    '봉사 후 가볍게 들러 지역 음식을 맛보기 좋은 곳이에요.',
    '일정 마무리 후 부담 없이 들러보기 좋은 식당이에요.',
  ]);
  if (contentTypeId === '38') return v([
    '지역 특산품을 천천히 둘러보기 좋은 쇼핑 명소예요.',
    '산책 후 잠깐 들러보기 좋은 상점 공간이에요.',
  ]);
  if (contentTypeId === '28') return v([
    '가볍게 체험하며 에너지를 충전하기 좋은 공간이에요.',
    '봉사 후 액티비티로 마무리하기 좋은 장소예요.',
  ]);
  if (/사찰|절$|암자/.test(title)) return v([
    '봉사 후 고요하게 산책하기 좋은 사찰 공간이에요.',
    '조용한 분위기에서 잠시 머물러보기 좋은 사찰이에요.',
  ]);
  if (/박물관|기념관|전시관/.test(title)) return v([
    '짧게 머물며 지역 이야기를 살펴보기 좋은 전시 공간이에요.',
    '실내에서 가볍게 둘러보기 좋은 문화 시설이에요.',
  ]);
  if (/미술관|갤러리/.test(title)) return v([
    '짧게 머물며 예술 분위기를 느껴보기 좋은 공간이에요.',
    '조용히 감상하며 쉬어가기 좋은 전시 공간이에요.',
  ]);
  if (/전망대|전망/.test(title)) return v([
    '탁 트인 경관을 가볍게 감상하기 좋은 곳이에요.',
    '봉사 후 탁 트인 풍경으로 숨을 고르기 좋아요.',
  ]);
  if (/해수욕장|해변|모래사장/.test(title)) return v([
    '봉사 후 바닷바람을 맞으며 산책하기 좋은 해변이에요.',
    '가볍게 걸으며 바다 풍경을 감상하기 좋아요.',
  ]);
  if (/수목원|식물원/.test(title)) return v([
    '자연 속에서 조용히 산책하기 좋은 공간이에요.',
    '초록 풍경을 느끼며 여유롭게 둘러보기 좋아요.',
  ]);
  if (/공원|정원/.test(title)) return v([
    '봉사 후 잠깐 걸으며 숨을 고르기 좋은 공원이에요.',
    '이동 중 가볍게 들러 산책하기 좋은 녹지 공간이에요.',
    '짧은 휴식과 산책을 함께 하기 좋은 코스예요.',
  ]);
  if (/시장|장터/.test(title)) return v([
    '일정 마무리 전 지역 분위기를 느끼며 거닐기 좋아요.',
    '지역 먹거리와 분위기를 가볍게 체험하기 좋은 시장이에요.',
  ]);
  if (/향교|서원|고택/.test(title)) return v([
    '도심 속에서 오래된 지역 분위기를 천천히 느껴볼 수 있어요.',
    '지역의 역사적 분위기를 가볍게 살펴보기 좋은 유적지예요.',
  ]);
  if (/항$|항구|포구/.test(title)) return v([
    '바다와 어항 풍경을 천천히 감상하기 좋은 공간이에요.',
    '봉사 후 항구 풍경을 바라보며 쉬어가기 좋아요.',
  ]);
  if (/숲|수림/.test(title)) return v([
    '조용한 숲길을 걸으며 여유를 찾기 좋은 곳이에요.',
    '봉사 후 숲 속 산책으로 마무리하기 좋은 코스예요.',
  ]);
  if (/계곡|폭포/.test(title)) return v([
    '시원한 자연 경관 속에서 잠시 쉬어가기 좋아요.',
    '봉사 후 자연 경관으로 마음을 가라앉히기 좋은 명소예요.',
  ]);
  if (/거리|상권|골목/.test(title)) return v([
    '산책 후 간단히 쉬어가거나 주변을 둘러보기 좋은 거리예요.',
    '지역 분위기를 느끼며 가볍게 걷기 좋은 구간이에요.',
    '일정 마무리 전 지역 거리 분위기를 느끼며 쉬어가기 좋아요.',
  ]);
  if (/문화센터|문화원|아트센터/.test(title)) return v([
    '짧게 머물며 지역 문화 분위기를 느껴보기 좋은 공간이에요.',
    '실내에서 잠시 쉬며 둘러보기 좋은 문화 공간이에요.',
  ]);
  if (contentTypeId === '14') return v([
    '지역의 역사와 문화를 가볍게 살펴보기 좋은 곳이에요.',
    '짧은 탐방 코스로 부담 없이 둘러보기 좋아요.',
  ]);

  if (region) return v([
    `${region} 여행의 흐름을 이어주는 탐방 명소예요.`,
    `${region} 일정에 가볍게 포함하기 좋은 장소예요.`,
    '봉사 후 가볍게 들러보기 좋은 여행 명소예요.',
  ]);

  return v([
    '봉사 후 가볍게 들러보기 좋은 여행 명소예요.',
    '이동 중 부담 없이 들러볼 수 있는 장소예요.',
    '일정 사이에 짧게 머물러보기 좋은 공간이에요.',
  ]);
}

function formatDistance(distance: number): string {
  if (!Number.isFinite(distance) || distance <= 0) return '';
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
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
  'AI가 활동 주변을 살펴보고 있어요',
  '봉사 후 동선을 정리하고 있어요',
  '가까운 여행 포인트를 고르고 있어요',
  '무리 없는 일정을 구성하고 있어요',
  '추천 일정을 다듬고 있어요',
];

const travelShuffleCards = [
  {
    title: '해변 산책',
    image: '/activity-images/default-travel-1.png',
    positionClass: 'left-4 top-4 -rotate-[7deg]',
    cardClass: 'h-[104px] w-[92px]',
    imageClass: 'h-[58px]',
    delay: '0ms',
  },
  {
    title: '숲길 산책',
    image: '/activity-images/forest-trail-2.png',
    positionClass: 'right-5 top-12 rotate-[7deg]',
    cardClass: 'h-[100px] w-[90px]',
    imageClass: 'h-[56px]',
    delay: '360ms',
  },
  {
    title: '감성 카페거리',
    image: '/activity-images/city-travel-2.png',
    positionClass: 'bottom-9 left-2 -rotate-[5deg]',
    cardClass: 'h-[98px] w-[92px]',
    imageClass: 'h-[54px]',
    delay: '720ms',
  },
  {
    title: '전망대',
    image: '/activity-images/city-travel-3.png',
    positionClass: 'bottom-4 right-4 rotate-[8deg]',
    cardClass: 'h-[102px] w-[90px]',
    imageClass: 'h-[58px]',
    delay: '1080ms',
  },
];

const featuredShuffleCard = {
  title: '전통시장 탐방',
  image: '/activity-images/festival-event-2.png',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AIRecommendation({ activity, isOpen, onBack, onExitComplete }: AIRecommendationProps) {
  const itineraryContentRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPreparing, setIsPreparing] = useState(true);
  const [screenshotMessage, setScreenshotMessage] = useState('');
  const [preparationMessageIndex, setPreparationMessageIndex] = useState(0);
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [baseLocationSource, setBaseLocationSource] = useState<GeocodeSource | null>(null);
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
    setBaseLocationSource(null);

    preparationMessageTimerRef.current = window.setInterval(() => {
      setPreparationMessageIndex((prev) => (prev + 1) % aiPreparationMessages.length);
    }, 2500);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchTravelPlans(selectedActivity, controller.signal)
      .then(({ plans: fetchedPlans, baseLocationSource: source }) => {
        if (!controller.signal.aborted) {
          setPlans(fetchedPlans);
          setBaseLocationSource(source);
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
    const el = itineraryContentRef.current;
    if (!el) return;

    try {
      setScreenshotMessage('');
      const today = new Date().toISOString().slice(0, 10);
      const blob = await captureElementAsPng(el, window.devicePixelRatio || 2, { backgroundColor: '#fdfcfa' });
      downloadBlob(blob, `sison-itinerary-${today}.png`);
      setScreenshotMessage('이미지가 저장되었어요');
    } catch (error) {
      console.error('AI itinerary screenshot failed', error);
      setScreenshotMessage('이미지 저장에 실패했어요. 다시 시도해주세요.');
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
        className={`bottom-sheet-panel bottom-sheet-panel-full relative w-full max-w-[430px] bg-[#fdfcfa] shadow-[0_-18px_46px_rgba(39,45,40,0.12)] ${
          isPreparing ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
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
            <div className="flex h-[calc(100dvh_-_82px_-_env(safe-area-inset-bottom))] min-h-0 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.13),transparent_34%),radial-gradient(circle_at_50%_86%,rgba(192,132,252,0.16),transparent_38%),linear-gradient(180deg,#faf8ff_0%,#fffefe_46%,#f3f0ff_100%)] px-6 py-5">
              <section className="relative mx-auto flex h-full w-full max-w-[360px] flex-col items-center justify-center text-center">
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-[14%] h-56 w-56 -translate-x-1/2 rounded-full bg-[#a78bfa]/16 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-[10%] right-2 h-32 w-32 rounded-full bg-[#c084fc]/12 blur-3xl"
                />

                <div className="relative mb-7 h-[244px] w-full max-w-[330px]" aria-hidden="true">
                  <svg className="sison-ai-travel-shuffle-path absolute left-1/2 top-1/2 h-[200px] w-[292px] -translate-x-1/2 -translate-y-1/2 text-[#8b5cf6]/30" viewBox="0 0 292 200" fill="none">
                    <path
                      d="M56 56C92 22 135 20 154 58C174 99 224 70 236 106C249 145 195 169 151 151C105 132 62 157 48 122C40 102 48 80 70 68"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="8 10"
                    />
                    <path d="M238 102L248 111L236 116" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M50 125L40 116L52 111" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {travelShuffleCards.map((card) => (
                    <div
                      key={card.title}
                      className={`absolute ${card.positionClass}`}
                    >
                      <div
                        className={`sison-ai-travel-shuffle-card ${card.cardClass} overflow-hidden rounded-[18px] border border-white/80 bg-white/86 p-2 text-left shadow-[0_14px_30px_rgba(82,58,135,0.13)] backdrop-blur`}
                        style={{ animationDelay: card.delay }}
                      >
                        <img
                          src={card.image}
                          alt=""
                          draggable={false}
                          className={`${card.imageClass} pointer-events-none mb-2 w-full select-none rounded-[13px] object-cover [-webkit-user-drag:none]`}
                        />
                        <p className="truncate text-[10.5px] font-bold text-[#65527d]">
                          {card.title}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                    <div className="sison-ai-travel-shuffle-featured relative h-[128px] w-[118px] overflow-hidden rounded-[22px] border border-[#d8c7ff]/65 bg-[linear-gradient(145deg,#c4b5fd_0%,#a78bfa_48%,#8b5cf6_100%)] p-2.5 text-left text-white shadow-[0_22px_46px_rgba(139,92,246,0.28)]">
                      <img
                        src={featuredShuffleCard.image}
                        alt=""
                        draggable={false}
                        className="pointer-events-none h-[72px] w-full select-none rounded-[16px] object-cover shadow-[0_8px_18px_rgba(68,40,114,0.16)] [-webkit-user-drag:none]"
                      />
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/22">
                          <Sparkles className="h-3 w-3" strokeWidth={2.2} />
                        </span>
                        <p className="truncate text-[11px] font-bold">
                          {featuredShuffleCard.title}
                        </p>
                      </div>
                      <span className="absolute right-2 top-2 rounded-full bg-white/24 px-2 py-0.5 text-[9px] font-bold text-white/95 backdrop-blur">
                        선택 중
                      </span>
                    </div>
                  </div>

                  <Sparkles className="sison-ai-loading-spark absolute left-[76px] top-[82px] h-3.5 w-3.5 text-[#a78bfa]" strokeWidth={2.1} />
                  <Sparkles className="sison-ai-loading-spark absolute right-[78px] top-[78px] h-4 w-4 text-[#c084fc]" strokeWidth={2.1} style={{ animationDelay: '720ms' }} />
                  <Sparkles className="sison-ai-loading-spark absolute right-[46px] bottom-[74px] h-3 w-3 text-[#8b5cf6]" strokeWidth={2.1} style={{ animationDelay: '1280ms' }} />
                  <Sparkles className="sison-ai-loading-spark absolute left-[52px] bottom-[70px] h-3 w-3 text-[#c4b5fd]" strokeWidth={2.1} style={{ animationDelay: '1680ms' }} />
                </div>

                <p className="max-w-full whitespace-nowrap text-[clamp(18px,4.9vw,20px)] font-bold leading-[1.25] text-[#6f4bd8]">
                  AI가 여행 일정을 고르고 있어요
                </p>
                <p className="mt-3 max-w-full whitespace-nowrap text-[clamp(12px,3.25vw,13px)] font-medium leading-5 text-[#5F6368]">
                  여러 후보를 비교해 일정을 만들고 있어요
                </p>

                <div className="mt-7 h-2 w-[78%] overflow-hidden rounded-full bg-[#8b5cf6]/14">
                  <span
                    aria-hidden="true"
                    className="sison-ai-loading-progress block h-full w-[48%] rounded-full bg-[linear-gradient(90deg,#8b5cf6,#c084fc,#a78bfa)]"
                  />
                </div>
                <p className="mt-4 text-[13px] font-medium text-[#756b89]">
                  잠시만 기다려주세요
                </p>
              </section>
            </div>
          ) : (
            <div className="bg-[#fdfcfa]">
              {/* 캡처 대상: 봉사활동 카드 + 추천 일정 (저장 버튼 제외) */}
              <div ref={itineraryContentRef} className="relative space-y-8 px-6 py-6">
                {/* 봉사활동 정보 */}
                <section>
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
                    <h3 className="mb-4">{selectedActivity.title}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
                        <span className="text-sm font-normal text-[#5F6368]">
                          {selectedActivity.volunteerPlace || selectedActivity.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#b8b2aa]" strokeWidth={2} />
                        <span className="text-sm font-normal text-[#5F6368]">
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
                      <p className="mt-1 text-[12px] text-[#7A7F87]">잠시 후 다시 시도해주세요.</p>
                    </div>
                  </section>
                )}

                {/* 추천 일정 카드 */}
                {plans.length > 0 && (
                  <section>
                    <h3 className="mb-1.5">추천 일정</h3>
                    <p className="mb-4 text-[12px] text-[#9AA0A6] leading-snug">
                      {baseLocationSource === 'institution'
                        ? '활동 정보와 모집기관 위치를 기준으로 주변 일정을 준비했어요.'
                        : baseLocationSource === 'region_center'
                        ? '정확한 장소를 찾지 못해 지역 중심 기준으로 가벼운 일정을 준비했어요.'
                        : '활동 장소 주변으로 일정을 준비했어요.'}
                    </p>
                    <div className="space-y-4">
                      {plans.map((plan, planIndex) => {
                        const radiusKm =
                          plan.maxDistanceM > 0
                            ? `${(plan.maxDistanceM / 1000).toFixed(1)}km`
                            : null;
                        const accentColor = itineraryAccentColors[planIndex % itineraryAccentColors.length];
                        return (
                          <div
                            key={planIndex}
                            className="bg-white rounded-3xl p-5 shadow-sm border border-black/5"
                          >
                            <p
                              className="mb-1 text-[11px] font-medium uppercase tracking-wide"
                              style={{ color: accentColor }}
                            >
                              일정 {planIndex + 1}
                            </p>
                            <h4 className="mb-1.5 text-[#2a2a2a]">{plan.title}</h4>
                            <p className="mb-3 text-sm leading-relaxed text-[#777]">{plan.summary}</p>

                            <div className="mb-4 flex items-center gap-4 text-[12px] text-[#6B7280]">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" strokeWidth={2} style={{ color: accentColor }} />
                                {plan.duration}
                              </span>
                              {radiusKm && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" strokeWidth={2} style={{ color: accentColor }} />
                                  반경 {radiusKm}
                                </span>
                              )}
                            </div>

                            {plan.stops.length > 0 && (
                              <div className="mb-1">
                                {plan.stops.map((stop, stopIndex) => {
                                  const distKm =
                                    stop.distance > 0
                                      ? `${(stop.distance / 1000).toFixed(1)}km`
                                      : null;
                                  const description = getStopDescription(stop, stopIndex);
                                  return (
                                    <div key={stopIndex} className="flex gap-3">
                                      <div className="flex flex-col items-center flex-shrink-0 pt-[5px]">
                                        <div
                                          className="h-2 w-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: accentColor }}
                                        />
                                        {stopIndex < plan.stops.length - 1 && (
                                          <div className="mt-1 w-px flex-1 min-h-[36px] bg-[#e3efe8]" />
                                        )}
                                      </div>
                                      <div className="flex-1 pb-3.5 flex gap-2.5">
                                        {stop.image && (
                                          <img
                                            src={getSafeImageSource(stop.image)}
                                            crossOrigin="anonymous"
                                            referrerPolicy="no-referrer"
                                            alt=""
                                            className="w-11 h-11 rounded-xl object-cover flex-shrink-0 self-start"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-baseline gap-1.5 flex-wrap leading-snug">
                                            {stop.title && (
                                              <span className="text-sm font-medium" style={{ color: '#2a2a2a' }}>
                                                {stop.title}
                                              </span>
                                            )}
                                            {distKm && (
                                              <span className="text-[12px] font-normal flex-shrink-0" style={{ color: '#6B7280' }}>
                                                · {distKm}
                                              </span>
                                            )}
                                          </div>
                                          <p className="mt-0.5 text-[12px] text-[#7A7F87] leading-snug line-clamp-2">
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
              </div>

              {/* 이미지 저장 버튼 — 캡처 범위 외 */}
              {plans.length > 0 && (
                <section className="px-6 pt-2 pb-8">
                  <button
                    type="button"
                    onClick={handleSaveScreenshot}
                    className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a] flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" strokeWidth={2} />
                    <span>이미지 저장</span>
                  </button>
                  {screenshotMessage && (
                    <p className={`mt-3 text-center text-[12.5px] leading-relaxed ${
                      screenshotMessage.includes('실패') ? 'text-[#c9897e]' : 'text-[#6fa985]'
                    }`}>
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
