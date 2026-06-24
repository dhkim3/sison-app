import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, X } from 'lucide-react';
import { SegmentedTabs } from './SegmentedTabs';
import { CompactActivityCard } from './CompactActivityCard';
import type { TravelCard } from './TravelCardCarousel';
import { EmptyState } from './EmptyState';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';
import { EnhancedDetailBottomSheet } from './EnhancedDetailBottomSheet';
import { StoryCard } from './story/StoryCard';
import { StoryDetailSheet } from './story/StoryDetailSheet';
import { StoryCommentSheet } from './story/StoryCommentSheet';
import type { StoryItem } from './story/storyTypes';
import { getActivitySaveKey, type ActivitySaveLookup, type ActivitySaveRecord } from '../activitySaveState';
import type { StoryCardItem, StoryInteractionProps } from '../storyInteractionState';
import { captureElementAsPng, downloadBlob } from '../utils/captureElementAsImage';
import { avoidConsecutiveActivityImages } from '../utils/activityImage';
import { scrollToTop } from '../utils/scrollToTop';

export type SavedArchiveTab = 0 | 1 | 2;
type TravelCardActionMode = 'actions' | 'confirm-delete';
type ArchiveTravelCard = TravelCard & {
  id: string;
  frameType?: string;
  cardPreviewDataUrl?: string;
  finalCardImageUrl?: string;
  aiFrameBackgroundUrl?: string | null;
  aiFrameOverlayUrl?: string | null;
  sourcePhotoUrl?: string;
};

export const initialArchiveStories: StoryItem[] = [
  {
    id: 105,
    imageUrl: '/activity-images/beach-cleanup-3.png',
    title: '안목해변 커피 향 사이로',
    region: '강원',
    location: '강원 강릉시 안목해변',
    author: '여행자',
    likes: 9,
    comments: 2,
    body: '플로깅을 마치고 커피거리 쪽으로 걸어오니 바다 냄새와 커피 향이 섞였어요. 짧은 활동이 하루의 표정을 바꿔주었습니다.',
    relatedActivity: '안목해변 아침 플로깅',
    activityTitle: '안목해변 아침 플로깅',
    activityDate: '2026.04.12',
    isMine: true,
  },
  {
    id: 102,
    imageUrl: '/activity-images/beach-cleanup-2.png',
    title: '제주 바다의 석양',
    region: '제주',
    location: '제주 제주시 함덕해수욕장',
    author: '여행자',
    likes: 11,
    comments: 2,
    body: '하루 끝에 만난 제주 바다는 오래 바라보고 싶은 색이었어요. 작은 활동 뒤에 남은 고요함이 여행의 기억을 더 선명하게 만들어줬습니다.',
    relatedActivity: '함덕해수욕장 해양 환경 정화 봉사',
    activityTitle: '함덕해수욕장 해양 환경 정화 봉사',
    activityDate: '2026.06.15',
    isMine: true,
  },
  {
    id: 104,
    imageUrl: '/activity-images/forest-trail-1.png',
    title: '비자림의 고요한 산책',
    region: '제주',
    location: '제주 제주시 비자림',
    author: '여행자',
    likes: 13,
    comments: 3,
    body: '비자림 안쪽으로 들어갈수록 말수가 줄어드는 기분이었어요. 길을 천천히 살피며 걷는 시간이 여행과 봉사 사이를 부드럽게 이어줬습니다.',
    relatedActivity: '제주 숲길 산책로 정비',
    activityTitle: '제주 숲길 산책로 정비',
    activityDate: '2026.06.08',
    isMine: true,
  },
  {
    id: 103,
    imageUrl: '/activity-images/forest-trail-2.png',
    title: '공원 산책로의 오후',
    region: '부산',
    location: '부산 수영구 수영 근린공원',
    author: '여행자',
    likes: 8,
    comments: 1,
    body: '산책로를 정리하는 동안 오후 햇빛이 천천히 나무 사이로 내려왔어요. 큰 이벤트보다 작은 돌봄이 더 오래 기억되는 날이었습니다.',
    relatedActivity: '수영 공원 산책로 정비',
    activityTitle: '수영 공원 산책로 정비',
    activityDate: '2026.05.28',
    isMine: true,
  },
  {
    id: 107,
    imageUrl: '/activity-images/city-travel-3.png',
    title: '경주 골목의 오후빛',
    region: '경북',
    location: '경북 경주시 황리단길',
    author: '여행자',
    likes: 8,
    comments: 1,
    body: '황리단길 작은 전시 안내를 돕는 동안 오래된 담벼락에 빛이 머물렀어요. 여행지의 이야기를 조금 더 가까이 들은 날이었습니다.',
    relatedActivity: '경주 황리단길 작은 문화 안내',
    activityTitle: '경주 황리단길 작은 문화 안내',
    activityDate: '2026.05.04',
    isMine: true,
  },
  {
    id: 106,
    imageUrl: '/activity-images/festival-event-2.png',
    title: '통영 항구의 느린 오후',
    region: '경남',
    location: '경남 통영시 강구안',
    author: '여행자',
    likes: 10,
    comments: 2,
    body: '작은 항구 행사에서 방문객을 안내하고 의자를 정리했어요. 낯선 도시가 잠깐 생활처럼 가까워지는 시간이었습니다.',
    relatedActivity: '통영 항구 마을 행사 도우미',
    activityTitle: '통영 항구 마을 행사 도우미',
    activityDate: '2026.04.26',
    isMine: true,
  },
  {
    id: 101,
    imageUrl: '/activity-images/beach-cleanup-1.png',
    title: '광안리 해변에서의 아침',
    region: '부산',
    location: '부산 수영구 광안리해수욕장',
    author: '여행자',
    likes: 16,
    comments: 4,
    body: '광안리의 아침은 생각보다 조용했어요. 짧은 정화 활동을 마치고 바라본 바다는 여행의 속도를 한 번 늦춰주는 장면처럼 남았습니다.',
    relatedActivity: '광안리 해변 환경정화',
    activityTitle: '광안리 해변 환경정화',
    activityDate: '2026.06.20',
    isMine: true,
  },
];

const initialTravelCards: ArchiveTravelCard[] = [
  {
    id: 'story-105-anmok-coffee',
    photoUrl: '/activity-images/beach-cleanup-3.png',
    title: '안목해변 커피 향 사이로',
    date: '2026.04.12',
    locationLabel: '강원 강릉시',
    period: '4월 12일',
    memo: '플로깅을 마치고 커피거리 쪽으로 걸어오니 바다 냄새와 커피 향이 섞였어요.',
    activities: ['안목해변 아침 플로깅'],
    locationSummary: '내 스토리의 안목해변 기록에서 만든 여행 카드예요.',
    moodTags: ['안목해변', '플로깅', '강릉'],
    style: 'polaroid',
    frameType: '기본',
  },
  {
    id: 'story-107-gyeongju-light',
    photoUrl: '/activity-images/city-travel-3.png',
    title: '경주 골목의 오후빛',
    date: '2026.05.04',
    locationLabel: '경북 경주시',
    period: '5월 4일',
    memo: '황리단길 작은 전시 안내를 돕는 동안 오래된 담벼락에 빛이 머물렀어요.',
    activities: ['경주 황리단길 작은 문화 안내'],
    locationSummary: '내 스토리의 경주 골목 기록에서 만든 여행 카드예요.',
    moodTags: ['경주', '골목길', '문화안내'],
    style: 'polaroid',
    frameType: '블랙',
  },
  {
    id: 'story-106-tongyeong-harbor',
    photoUrl: '/activity-images/festival-event-2.png',
    title: '통영 항구의 느린 오후',
    date: '2026.04.26',
    locationLabel: '경남 통영시',
    period: '4월 26일',
    memo: '작은 항구 행사에서 방문객을 안내하고 의자를 정리했어요.',
    activities: ['통영 항구 마을 행사 도우미'],
    locationSummary: '내 스토리의 통영 항구 기록에서 만든 여행 카드예요.',
    moodTags: ['통영', '항구', '행사안내'],
    style: 'polaroid',
    frameType: '노을',
  },
];

const formatCardDate = (createdAt: string | number | Date) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const getStorySortDate = (story: StoryItem) => {
  const date = story.activityDate || story.createdAt || '';
  return typeof date === 'string' ? date.replace(/\./g, '-') : '';
};

const sortStoriesByLatestDate = (stories: StoryItem[]) =>
  [...stories].sort((a, b) => getStorySortDate(b).localeCompare(getStorySortDate(a)));

const storyCardToArchiveCard = (card: StoryCardItem): ArchiveTravelCard => ({
  id: String(card.id),
  photoUrl: card.photoUrl || card.imageUrl,
  title: card.title || '여행 카드',
  date: card.date || formatCardDate(card.createdAt),
  locationLabel: card.subtitle || undefined,
  style: 'polaroid',
  frameType: card.frameType,
  cardPreviewDataUrl: card.cardPreviewDataUrl,
  finalCardImageUrl: card.finalCardImageUrl,
  aiFrameBackgroundUrl: card.aiFrameBackgroundUrl,
  aiFrameOverlayUrl: card.aiFrameOverlayUrl,
  sourcePhotoUrl: card.photoUrl,
});

const getTravelCardPreviewUrl = (card: ArchiveTravelCard) => {
  if (card.frameType === 'AI' && card.aiFrameBackgroundUrl) return null;
  return card.cardPreviewDataUrl || card.finalCardImageUrl;
};

const getArchiveFrameStyle = (card: ArchiveTravelCard): CSSProperties => {
  if (card.frameType === 'AI' && card.aiFrameBackgroundUrl) {
    return {
      backgroundImage: `url(${card.aiFrameBackgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  switch (card.frameType) {
    case '바다':
      return { background: 'linear-gradient(to bottom right, #eff6ff, #ecfeff)' };
    case '숲':
      return { background: 'linear-gradient(to bottom right, #f0fdf4, #ecfdf5)' };
    case '노을':
      return { background: 'linear-gradient(to bottom right, #fff7ed, #fdf2f8)' };
    case '블랙':
      return { background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)' };
    default:
      return { background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf8 100%)' };
  }
};

function ArchiveTravelCardPreview({ card }: { card: ArchiveTravelCard }) {
  const isDarkFrame = card.frameType === '블랙';
  const isAIFrame = card.frameType === 'AI' && !!card.aiFrameBackgroundUrl;
  const photoUrl = card.sourcePhotoUrl || card.photoUrl;
  const aiTitleTextStyle: CSSProperties | undefined = isAIFrame
    ? {
        textShadow: '0 1px 3px rgba(255,255,255,0.75), 0 1px 8px rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.14)',
      }
    : undefined;
  const aiSupportingTextStyle: CSSProperties | undefined = isAIFrame
    ? {
        textShadow: '0 1px 3px rgba(255,255,255,0.65), 0 1px 2px rgba(0,0,0,0.12)',
      }
    : undefined;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]"
      style={getArchiveFrameStyle(card)}
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <img
          src={photoUrl}
          alt={card.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="px-0.5 pt-3">
        <p
          className={`truncate text-[15px] font-semibold leading-snug ${isDarkFrame ? 'text-white' : 'text-[#2a2a2a]'}`}
          style={aiTitleTextStyle}
        >
          {card.title}
        </p>
        <div className="mt-3 space-y-1">
          {card.locationLabel && (
            <p
              className={`truncate text-[12px] font-medium leading-[1.35] ${isDarkFrame ? 'text-white/80' : 'text-[#6f6f6f]'}`}
              style={aiSupportingTextStyle}
            >
              {card.locationLabel}
            </p>
          )}
          <p
            className={`truncate text-[12px] font-normal leading-[1.35] ${isDarkFrame ? 'text-white/50' : 'text-[#b6b6b6]'}`}
            style={aiSupportingTextStyle}
          >
            {card.date}
          </p>
        </div>
        <div className={`mt-3 border-t pt-2.5 ${isDarkFrame ? 'border-white/15' : 'border-black/5'}`}>
          <p
            className={`text-center text-[11px] leading-none opacity-70 ${isDarkFrame ? 'text-white' : 'text-[#5F6368]'}`}
            style={aiSupportingTextStyle}
          >
            시선
          </p>
        </div>
      </div>
    </div>
  );
}

interface SavedArchiveProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved'; cardStory?: StoryItem }) => void;
  savedActivities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
  storyInteractions: StoryInteractionProps;
  activeArchiveTab?: SavedArchiveTab;
  onArchiveTabChange?: (tab: SavedArchiveTab) => void;
  myStories?: StoryItem[];
  myCards?: StoryCardItem[];
  dismissedArchiveStoryIds?: number[];
  onDeleteArchiveStory?: (story: StoryItem) => void;
}

export function SavedArchive({
  onNavigate,
  savedActivities,
  isActivitySaved,
  onToggleSavedActivity,
  storyInteractions,
  activeArchiveTab = 0,
  onArchiveTabChange,
  myStories,
  myCards,
  dismissedArchiveStoryIds,
  onDeleteArchiveStory,
}: SavedArchiveProps) {
  const [activeTab, setActiveTab] = useState<SavedArchiveTab>(activeArchiveTab);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const [selectedTravelCardAction, setSelectedTravelCardAction] = useState<ArchiveTravelCard | null>(null);
  const [travelCardActionMode, setTravelCardActionMode] = useState<TravelCardActionMode>('actions');
  const [travelCardToast, setTravelCardToast] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>(() => sortStoriesByLatestDate(initialArchiveStories));
  const [travelCards, setTravelCards] = useState<ArchiveTravelCard[]>(initialTravelCards);
  const travelCardToastTimerRef = useRef<number | null>(null);
  const travelCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const resolvedSavedActivities = avoidConsecutiveActivityImages(savedActivities);

  useLayoutEffect(() => {
    scrollToTop();
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(activeArchiveTab);
  }, [activeArchiveTab]);

  // 내가 올린 스토리/생성한 카드를 저장 탭에 반영 (목 데이터 앞에 배치)
  // 사용자가 삭제한 시드 스토리는 dismissedArchiveStoryIds로 영속 관리되어 화면 전환 후에도 유지된다.
  useEffect(() => {
    const dismissed = new Set(dismissedArchiveStoryIds ?? []);
    const combined = [...(myStories ?? []), ...initialArchiveStories];
    setStories(sortStoriesByLatestDate(combined.filter((story) => !dismissed.has(story.id))));
  }, [myStories, dismissedArchiveStoryIds]);

  useEffect(() => {
    setTravelCards([...(myCards ?? []).map(storyCardToArchiveCard), ...initialTravelCards]);
  }, [myCards]);

  useEffect(() => {
    return () => {
      if (travelCardToastTimerRef.current !== null) {
        window.clearTimeout(travelCardToastTimerRef.current);
      }
    };
  }, []);

  const handleActivityClick = (activity: ActivitySaveRecord) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const handleTabChange = (index: number) => {
    const nextTab = index as SavedArchiveTab;
    if (nextTab !== activeTab) {
      scrollToTop();
    }
    setActiveTab(nextTab);
    onArchiveTabChange?.(nextTab);
  };

  const isPastActivity = (activity: ActivitySaveRecord) => {
    const match = activity.date?.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    const activityDate = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activity.status === 'completed' || !activity.isRecruiting || (activityDate !== null && activityDate < today);
  };

  const handleDeleteStory = (story: StoryItem) => {
    setSelectedStory((currentStory) => (currentStory?.id === story.id ? null : currentStory));
    setCommentStory((currentStory) => (currentStory?.id === story.id ? null : currentStory));
    storyInteractions.onRemoveStory?.(story.id);
    onDeleteArchiveStory?.(story);
  };

  const closeTravelCardAction = () => {
    setSelectedTravelCardAction(null);
    setTravelCardActionMode('actions');
  };

  const showTravelCardToast = (message: string) => {
    setTravelCardToast(message);

    if (travelCardToastTimerRef.current !== null) {
      window.clearTimeout(travelCardToastTimerRef.current);
    }

    travelCardToastTimerRef.current = window.setTimeout(() => {
      setTravelCardToast(null);
      travelCardToastTimerRef.current = null;
    }, 2200);
  };

  const handleTravelCardDownload = async (card: ArchiveTravelCard) => {
    try {
      const cardElement = travelCardRefs.current[card.id];

      if (!cardElement) {
        throw new Error('Travel card element unavailable');
      }

      const blob = await captureElementAsPng(cardElement, 2, { backgroundColor: 'transparent' });
      downloadBlob(blob, `sison-travel-card-${card.id}.png`);
      closeTravelCardAction();
      showTravelCardToast('여행 카드를 저장했어요.');
    } catch (error) {
      console.error('travel card download failed', error);
      showTravelCardToast('카드를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleTravelCardDelete = (card: ArchiveTravelCard) => {
    setTravelCards((currentCards) => currentCards.filter((item) => item.id !== card.id));
    closeTravelCardAction();
    showTravelCardToast('여행 카드를 삭제했어요.');
  };

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sison-top-bar sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-5 py-3.5">
            <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">저장</h2>
            <p className="text-[12px] text-[#7A7F87] mt-0.5">여행 속 작은 순간들</p>
          </div>
        </header>

        {/* Segmented Tabs */}
        <div className="px-5 pt-3 pb-5">
          <SegmentedTabs
            tabs={['저장한 활동', '내 스토리', '여행 카드']}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {/* Saved Activities */}
          {activeTab === 0 && (
            <div className="px-5">
              {resolvedSavedActivities.length > 0 ? (
                <>
                  <div className="mb-3.5">
                    <p className="text-[12px] text-[#7A7F87]">
                      {resolvedSavedActivities.length}개의 활동
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {resolvedSavedActivities.map((activity) => (
                      <CompactActivityCard
                        key={getActivitySaveKey(activity)}
                        imageUrl={activity.imageUrl}
                        title={activity.title}
                        location={activity.location}
                        recruitmentStartDate={activity.recruitmentStartDate}
                        recruitmentEndDate={activity.recruitmentEndDate}
                        activityDate={activity.activityDate}
                        activityStartDate={activity.activityStartDate}
                        activityEndDate={activity.activityEndDate}
                        volunteerPeriod={activity.volunteerPeriod}
                        date={activity.date}
                        time={activity.time}
                        isPastActivity={isPastActivity(activity)}
                        showBookmark={true}
                        isSaved={isActivitySaved(activity)}
                        onBookmarkClick={() => onToggleSavedActivity(activity)}
                        onClick={() => handleActivityClick(activity)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState type="saved" />
              )}
            </div>
          )}

          {/* Stories Grid */}
          {activeTab === 1 && (
            <div className="px-5">
              {stories.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-[12px] text-[#7A7F87]">
                      여행 중 만난 순간들
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        onClick={setSelectedStory}
                        isLiked={storyInteractions.isStoryLiked(story.id)}
                        likeCount={storyInteractions.getStoryLikeCount(story)}
                        commentCount={storyInteractions.getStoryCommentCount(story)}
                        onToggleLike={(nextStory) => storyInteractions.onToggleStoryLike(nextStory.id)}
                        onOpenComments={setCommentStory}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState type="stories" />
              )}
            </div>
          )}

          {/* Travel Cards */}
          {activeTab === 2 && (
            <div className="px-5">
              {travelCards.length > 0 ? (() => {
                const groups: Record<string, ArchiveTravelCard[]> = {};
                for (const card of travelCards) {
                  const [year, month] = card.date.split('.');
                  const key = `${year}.${month}`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(card);
                }
                const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
                return sortedKeys.map((key) => {
                  const [year, month] = key.split('.');
                  const sortedCards = [...groups[key]].sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <section key={key} className="mb-10 last:mb-7">
                      <p className="mb-4 text-[13px] font-semibold text-[#2a2a2a]">
                        {year}년 {Number(month)}월
                      </p>
                      <div className="scrollbar-hide -mx-5 overflow-x-auto px-6 pb-7 pt-1">
                        <div className="flex w-max items-start gap-[18px] overflow-visible pr-7" style={{ scrollSnapType: 'x mandatory' }}>
                          {sortedCards.map((card) => {
                            const previewUrl = getTravelCardPreviewUrl(card);

                            return (
                              <div
                                key={card.id}
                                ref={(element) => {
                                  travelCardRefs.current[card.id] = element;
                                }}
                                className="flex-none overflow-visible rounded-3xl shadow-[0_12px_26px_rgba(0,0,0,0.095),0_2px_8px_rgba(0,0,0,0.055)]"
                                style={{
                                  width: 'min(62vw, 246px)',
                                  scrollSnapAlign: 'start',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTravelCardAction(card);
                                    setTravelCardActionMode('actions');
                                  }}
                                  className="block w-full overflow-hidden rounded-3xl bg-transparent text-left transition-opacity hover:opacity-90"
                                >
                                  {previewUrl ? (
                                    <div
                                      className="overflow-hidden rounded-3xl bg-[#f7f4f8]"
                                      style={{ aspectRatio: '2 / 3' }}
                                    >
                                      <img
                                        src={previewUrl}
                                        alt={card.title}
                                        className="h-full w-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ aspectRatio: '2 / 3' }}>
                                      <ArchiveTravelCardPreview card={card} />
                                    </div>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );
                });
              })() : (
                <EmptyState type="cards" />
              )}
            </div>
          )}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="saved" onNavigate={onNavigate} />

      {selectedActivity && (
        <EnhancedDetailBottomSheet
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAIRecommendation={(activity) => onNavigate('ai-recommendation', { activity, returnScreen: 'saved' })}
          isSaved={isActivitySaved(selectedActivity)}
          onToggleSaved={() => onToggleSavedActivity(selectedActivity)}
          activity={selectedActivity}
        />
      )}

      <StoryDetailSheet
        story={selectedStory ? { ...selectedStory, isMine: true } : null}
        isOpen={selectedStory !== null}
        onClose={() => setSelectedStory(null)}
        isLiked={selectedStory ? storyInteractions.isStoryLiked(selectedStory.id) : false}
        likeCount={selectedStory ? storyInteractions.getStoryLikeCount(selectedStory) : undefined}
        commentCount={selectedStory ? storyInteractions.getStoryCommentCount(selectedStory) : undefined}
        comments={selectedStory ? storyInteractions.getStoryComments(selectedStory.id) : []}
        onToggleLike={(story) => storyInteractions.onToggleStoryLike(story.id)}
        onOpenComments={setCommentStory}
        onAddComment={(story, body) => storyInteractions.onAddStoryComment(story.id, body)}
        onDeleteComment={(story, commentId) => storyInteractions.onDeleteStoryComment(story.id, commentId)}
        onCreateCard={(story) => {
          setSelectedStory(null);
          onNavigate('story', { cardStory: story });
        }}
        onDelete={handleDeleteStory}
      />

      <StoryCommentSheet
        story={commentStory}
        isOpen={commentStory !== null}
        comments={commentStory ? storyInteractions.getStoryComments(commentStory.id) : []}
        onClose={() => setCommentStory(null)}
        onAddComment={(body) => {
          if (!commentStory) return;
          storyInteractions.onAddStoryComment(commentStory.id, body);
        }}
        onUpdateComment={(commentId, body) => {
          if (!commentStory) return;
          storyInteractions.onUpdateStoryComment(commentStory.id, commentId, body);
        }}
        onDeleteComment={(commentId) => {
          if (!commentStory) return;
          storyInteractions.onDeleteStoryComment(commentStory.id, commentId);
        }}
      />

      {selectedTravelCardAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="여행 카드 액션 닫기"
            onClick={closeTravelCardAction}
            className="absolute inset-0 bg-black/15"
          />
          <section className="relative w-full max-w-[342px] rounded-3xl border border-black/[0.04] bg-[#fdfcfa] p-4 shadow-[0_18px_42px_rgba(42,42,42,0.12)]">
            {travelCardActionMode === 'actions' ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-none text-[#9a9a9a]">여행 카드</p>
                    <h3 className="mt-2 line-clamp-2 text-[17px] font-semibold leading-snug text-[#2a2a2a]">
                      {selectedTravelCardAction.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeTravelCardAction}
                    aria-label="닫기"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#7A7F87] transition-colors hover:bg-[#f4f2ec] hover:text-[#777]"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                {(() => {
                  const previewUrl = getTravelCardPreviewUrl(selectedTravelCardAction);

                  return (
                    <div
                      className="mt-4 overflow-hidden rounded-[1.35rem] bg-transparent"
                      style={{ aspectRatio: '2 / 3' }}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={selectedTravelCardAction.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ArchiveTravelCardPreview card={selectedTravelCardAction} />
                      )}
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => handleTravelCardDownload(selectedTravelCardAction)}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2a2a2a] py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(42,42,42,0.12)] transition-colors hover:bg-[#1f1f1f]"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  카드 저장하기
                </button>

                <button
                  type="button"
                  onClick={() => setTravelCardActionMode('confirm-delete')}
                  className="mx-auto mt-3 block px-3 py-1.5 text-[12.5px] font-medium text-[#b58a84] transition-colors hover:text-[#a56d65]"
                >
                  삭제
                </button>
              </>
            ) : (
              <>
                {(() => {
                  const previewUrl = getTravelCardPreviewUrl(selectedTravelCardAction);

                  return (
                    <div
                      className="overflow-hidden rounded-[1.35rem] bg-transparent"
                      style={{ aspectRatio: '2 / 3' }}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={selectedTravelCardAction.title}
                          className="h-full w-full object-contain opacity-90"
                        />
                      ) : (
                        <div className="h-full w-full opacity-90">
                          <ArchiveTravelCardPreview card={selectedTravelCardAction} />
                        </div>
                      )}
                    </div>
                  );
                })()}
                <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#2a2a2a]">
                  이 여행 카드를 삭제할까요?
                </h3>
                <p className="mt-2 text-[12px] leading-5 text-[#5F6368]">삭제하면 다시 복구할 수 없어요.</p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTravelCardActionMode('actions')}
                    className="flex-1 rounded-2xl bg-[#f5f3ee] py-3 text-[14px] font-medium text-[#777] transition-colors hover:bg-[#efede7]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTravelCardDelete(selectedTravelCardAction)}
                    className="flex-1 rounded-2xl bg-[#b76e65] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#a85f56]"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {travelCardToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[60] flex justify-center px-5">
          <div
            className="max-w-[350px] rounded-full border border-white/45 bg-[#2f3430]/88 px-4 py-2 text-center text-[12.5px] font-medium text-white shadow-[0_8px_24px_rgba(34,39,34,0.16)] backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            {travelCardToast}
          </div>
        </div>
      )}
    </>
  );
}
