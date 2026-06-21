import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import type { StoryInteractionProps } from '../storyInteractionState';
import { captureElementAsPng, downloadBlob } from '../utils/captureElementAsImage';
import { avoidConsecutiveActivityImages } from '../utils/activityImage';
import { scrollToTop } from '../utils/scrollToTop';

export type SavedArchiveTab = 0 | 1 | 2;
type TravelCardActionMode = 'actions' | 'confirm-delete';
type ArchiveTravelCard = TravelCard & { id: string };

const initialArchiveStories: StoryItem[] = [
  {
    id: 101,
    imageUrl: '/activity-images/beach-cleanup-1.png',
    title: '광안리 해변에서의 아침',
    region: '부산',
    author: '여행자',
    likes: 16,
    comments: 4,
    body: '광안리의 아침은 생각보다 조용했어요. 짧은 정화 활동을 마치고 바라본 바다는 여행의 속도를 한 번 늦춰주는 장면처럼 남았습니다.',
    relatedActivity: '광안리 해변 환경정화',
  },
  {
    id: 102,
    imageUrl: '/activity-images/beach-cleanup-2.png',
    title: '제주 바다의 석양',
    region: '제주',
    author: '여행자',
    likes: 11,
    comments: 2,
    body: '하루 끝에 만난 제주 바다는 오래 바라보고 싶은 색이었어요. 작은 활동 뒤에 남은 고요함이 여행의 기억을 더 선명하게 만들어줬습니다.',
    relatedActivity: '함덕해수욕장 해양 환경 정화 봉사',
  },
  {
    id: 103,
    imageUrl: '/activity-images/forest-trail-2.png',
    title: '공원 산책로의 오후',
    region: '부산',
    author: '여행자',
    likes: 8,
    comments: 1,
    body: '산책로를 정리하는 동안 오후 햇빛이 천천히 나무 사이로 내려왔어요. 큰 이벤트보다 작은 돌봄이 더 오래 기억되는 날이었습니다.',
    relatedActivity: '수영 공원 산책로 정비',
  },
  {
    id: 104,
    imageUrl: '/activity-images/forest-trail-1.png',
    title: '비자림의 고요한 산책',
    region: '제주',
    author: '여행자',
    likes: 13,
    comments: 3,
    body: '비자림 안쪽으로 들어갈수록 말수가 줄어드는 기분이었어요. 길을 천천히 살피며 걷는 시간이 여행과 봉사 사이를 부드럽게 이어줬습니다.',
    relatedActivity: '제주 숲길 산책로 정비',
  },
  {
    id: 105,
    imageUrl: '/activity-images/beach-cleanup-3.png',
    title: '안목해변 커피 향 사이로',
    region: '강원',
    author: '여행자',
    likes: 9,
    comments: 2,
    body: '플로깅을 마치고 커피거리 쪽으로 걸어오니 바다 냄새와 커피 향이 섞였어요. 짧은 활동이 하루의 표정을 바꿔주었습니다.',
    relatedActivity: '안목해변 아침 플로깅',
  },
  {
    id: 106,
    imageUrl: '/activity-images/festival-event-2.png',
    title: '통영 항구의 느린 오후',
    region: '경남',
    author: '여행자',
    likes: 10,
    comments: 2,
    body: '작은 항구 행사에서 방문객을 안내하고 의자를 정리했어요. 낯선 도시가 잠깐 생활처럼 가까워지는 시간이었습니다.',
    relatedActivity: '통영 항구 마을 행사 도우미',
  },
  {
    id: 107,
    imageUrl: '/activity-images/city-travel-3.png',
    title: '경주 골목의 오후빛',
    region: '경북',
    author: '여행자',
    likes: 8,
    comments: 1,
    body: '황리단길 작은 전시 안내를 돕는 동안 오래된 담벼락에 빛이 머물렀어요. 여행지의 이야기를 조금 더 가까이 들은 날이었습니다.',
    relatedActivity: '경주 황리단길 작은 문화 안내',
  },
];

const initialTravelCards: ArchiveTravelCard[] = [
  {
    id: 'gwangalli-morning',
    photoUrl: '/activity-images/beach-cleanup-1.png',
    title: '광안리 해변 플로깅 후기',
    date: '2026.07.20',
    locationLabel: '부산 수영구',
    period: '7월 20일',
    memo: '집결 후 장갑과 집게를 받고 모래사장 가장자리부터 천천히 걸었어요. 병뚜껑과 작은 비닐 조각이 생각보다 자주 보여서, 바다를 보는 시간이 조금 더 조심스러워졌습니다.',
    activities: ['광안리 해변 플로깅 활동', '해변 쓰레기 분리수거 보조'],
    locationSummary: '광안리해수욕장 모래사장과 산책로 주변을 함께 정리한 부산 해변 정화 후기예요.',
    moodTags: ['해변정화', '플로깅', '부산바다'],
    style: 'polaroid',
  },
  {
    id: 'jeju-aewol-day',
    photoUrl: '/activity-images/rural-village-2.png',
    title: '제주 마을 텃밭 일손 후기',
    date: '2026.06.10',
    locationLabel: '제주 제주시',
    period: '6월 10일 ~ 6월 12일',
    memo: '마을 안쪽 텃밭에서 잡초를 정리하고 수확 바구니를 옮겼어요. 큰 농사일은 아니었지만, 여행지의 생활 리듬을 가까이에서 본 시간이었습니다.',
    activities: ['제주 마을 텃밭 정리 활동', '농촌 일손 돕기 보조'],
    locationSummary: '제주 마을길과 작은 텃밭 주변에서 참여한 농촌 일손 돕기 후기예요.',
    moodTags: ['마을활동', '농촌일손', '제주여행'],
    style: 'polaroid',
  },
  {
    id: 'bijarim-walk',
    photoUrl: '/activity-images/forest-trail-1.png',
    title: '비자림 숲길 정비',
    date: '2026.06.12',
    locationLabel: '제주 제주시',
    period: '6월 12일',
    memo: '탐방로 입구에서 구간을 나눠 숲길 주변 쓰레기를 주웠어요. 조용한 길이라 발소리와 집게 소리만 가볍게 들렸고, 활동이 끝난 뒤에도 숲 냄새가 오래 남았습니다.',
    activities: ['비자림 숲길 환경정화', '탐방로 주변 쓰레기 줍기'],
    locationSummary: '비자림 탐방로와 숲길 가장자리를 중심으로 진행한 제주 숲길 정비 후기예요.',
    moodTags: ['숲길정비', '환경정화', '탐방로'],
    style: 'polaroid',
  },
  {
    id: 'anmok-coffee',
    photoUrl: '/activity-images/office-campaign-1.png',
    title: '파주 전시 안내데스크 후기',
    date: '2026.05.30',
    locationLabel: '경기 파주시',
    period: '5월 30일',
    memo: '전시 공간 입구에서 안내 책자를 정리하고 방문객 접수를 도왔어요. 조용한 실내라 말은 길지 않았지만, 필요한 정보를 건네는 일이 생각보다 차분했습니다.',
    activities: ['지역 전시 안내데스크 운영 보조', '방문객 접수 및 안내 자료 정리'],
    locationSummary: '파주 전시 공간의 안내데스크와 자료 비치대를 중심으로 참여한 운영 보조 후기예요.',
    moodTags: ['안내데스크', '자료정리', '전시안내'],
    style: 'polaroid',
  },
  {
    id: 'tongyeong-harbor',
    photoUrl: '/activity-images/festival-event-2.png',
    title: '전주 마을 문화제 안내 후기',
    date: '2026.04.26',
    locationLabel: '전북 전주시',
    period: '4월 26일',
    memo: '부스 위치를 묻는 방문객에게 동선을 안내하고 체험 테이블 주변을 정리했어요. 행사는 붐볐지만 역할이 분명해서 여행 중에도 부담 없이 참여할 수 있었습니다.',
    activities: ['전주 마을 문화제 행사 안내', '체험 부스 운영 보조'],
    locationSummary: '마을 문화제 현장에서 방문객 안내와 체험 부스 정리를 맡은 전주 행사 보조 후기예요.',
    moodTags: ['지역축제', '행사안내', '체험부스'],
    style: 'polaroid',
  },
  {
    id: 'gyeongju-light',
    photoUrl: '/activity-images/care-community-1.png',
    title: '복지관 문화 프로그램 보조 후기',
    date: '2026.03.21',
    locationLabel: '서울 성동구',
    period: '3월 21일 ~ 3월 22일',
    memo: '복지관 프로그램실에서 재료를 나누고 어르신들의 만들기 활동을 옆에서 도왔어요. 손을 맞잡거나 도구를 건네는 짧은 순간들이 조용히 남았습니다.',
    activities: ['복지관 문화 프로그램 보조', '어르신 만들기 활동 지원'],
    locationSummary: '지역 복지관 프로그램실에서 문화 체험 준비와 진행을 도운 커뮤니티 활동 후기예요.',
    moodTags: ['복지관', '문화체험', '돌봄지원'],
    style: 'polaroid',
  },
];

interface SavedArchiveProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  savedActivities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
  storyInteractions: StoryInteractionProps;
  activeArchiveTab?: SavedArchiveTab;
  onArchiveTabChange?: (tab: SavedArchiveTab) => void;
}

export function SavedArchive({
  onNavigate,
  savedActivities,
  isActivitySaved,
  onToggleSavedActivity,
  storyInteractions,
  activeArchiveTab = 0,
  onArchiveTabChange,
}: SavedArchiveProps) {
  const [activeTab, setActiveTab] = useState<SavedArchiveTab>(activeArchiveTab);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const [selectedTravelCardAction, setSelectedTravelCardAction] = useState<ArchiveTravelCard | null>(null);
  const [travelCardActionMode, setTravelCardActionMode] = useState<TravelCardActionMode>('actions');
  const [travelCardToast, setTravelCardToast] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>(initialArchiveStories);
  const [travelCards, setTravelCards] = useState<ArchiveTravelCard[]>(initialTravelCards);
  const travelCardToastTimerRef = useRef<number | null>(null);
  const travelCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const resolvedSavedActivities = avoidConsecutiveActivityImages(savedActivities);

  useLayoutEffect(() => {
    scrollToTop();
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(activeArchiveTab);
  }, [activeArchiveTab]);

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
    setStories((currentStories) => currentStories.filter((item) => item.id !== story.id));
    setSelectedStory((currentStory) => (currentStory?.id === story.id ? null : currentStory));
    setCommentStory((currentStory) => (currentStory?.id === story.id ? null : currentStory));
    storyInteractions.onRemoveStory?.(story.id);
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

      const blob = await captureElementAsPng(cardElement);
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
            <p className="text-[12px] text-[#aaa] mt-0.5">여행 속 작은 순간들</p>
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
                    <p className="text-[12px] text-[#aaa]">
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
                    <p className="text-[12px] text-[#aaa]">
                      {stories.length}개의 스토리
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
                    <section key={key} className="mb-7">
                      <p className="text-[13px] font-semibold text-[#2a2a2a] mb-3">
                        {year}년 {Number(month)}월
                      </p>
                      <div
                        className="overflow-x-auto scrollbar-hide pb-4"
                        style={{ display: 'flex', gap: '14px', scrollSnapType: 'x mandatory' }}
                      >
                        {sortedCards.map((card, i) => (
                          <button
                            key={card.id}
                            ref={(element) => {
                              travelCardRefs.current[card.id] = element;
                            }}
                            type="button"
                            onClick={() => {
                              setSelectedTravelCardAction(card);
                              setTravelCardActionMode('actions');
                            }}
                            className="text-left bg-white rounded-3xl p-3 hover:opacity-90 transition-opacity"
                            style={{
                              flex: '0 0 min(62vw, 246px)',
                              scrollSnapAlign: 'start',
                              boxShadow: '0 8px 22px rgba(80,64,45,0.09)',
                            }}
                          >
                            <div
                              className="overflow-hidden bg-[#f4f1ed]"
                              style={{ aspectRatio: '1 / 1', borderRadius: '16px' }}
                            >
                              <img
                                src={card.photoUrl}
                                alt={card.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="px-0.5 pt-3">
                              <p
                                className="text-[15px] font-semibold text-[#2a2a2a]"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '1.35',
                                }}
                              >
                                {card.title}
                              </p>
                              <div className="mt-3 space-y-1">
                                {card.locationLabel && (
                                  <p className="text-[12px] font-medium leading-[1.35] text-[#6f6f6f]">
                                    {card.locationLabel}
                                  </p>
                                )}
                                <p className="text-[12px] font-normal leading-[1.35] text-[#b6b6b6]">{card.date}</p>
                              </div>
                              <div className="mt-3 border-t border-black/5 pt-2.5">
                                <p className="text-center text-[11px] leading-none text-[#aaa] opacity-70">시선</p>
                              </div>
                            </div>
                          </button>
                        ))}
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
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#aaa] transition-colors hover:bg-[#f4f2ec] hover:text-[#777]"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.35rem] bg-[#f4f1ed]" style={{ aspectRatio: '16 / 10' }}>
                  <img
                    src={selectedTravelCardAction.photoUrl}
                    alt={selectedTravelCardAction.title}
                    className="h-full w-full object-cover"
                  />
                </div>

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
                <div className="overflow-hidden rounded-[1.35rem] bg-[#f4f1ed]" style={{ aspectRatio: '16 / 10' }}>
                  <img
                    src={selectedTravelCardAction.photoUrl}
                    alt={selectedTravelCardAction.title}
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#2a2a2a]">
                  이 여행 카드를 삭제할까요?
                </h3>
                <p className="mt-2 text-[12px] leading-5 text-[#999]">삭제하면 다시 복구할 수 없어요.</p>
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
