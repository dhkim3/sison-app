import { useState } from 'react';
import { SegmentedTabs } from './SegmentedTabs';
import { CompactActivityCard } from './CompactActivityCard';
import type { TravelCard } from './TravelCardCarousel';
import { TravelCardDetailSheet } from './TravelCardDetailSheet';
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

const initialArchiveStories: StoryItem[] = [
  {
    id: 101,
    imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1775116259654-404b3376c02e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
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
    imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    title: '경주 골목의 오후빛',
    region: '경북',
    author: '여행자',
    likes: 8,
    comments: 1,
    body: '황리단길 작은 전시 안내를 돕는 동안 오래된 담벼락에 빛이 머물렀어요. 여행지의 이야기를 조금 더 가까이 들은 날이었습니다.',
    relatedActivity: '경주 황리단길 작은 문화 안내',
  },
];

interface SavedArchiveProps {
  onNavigate: (screen: string, options?: { activity?: ActivitySaveRecord; returnScreen?: 'home' | 'search' | 'saved' }) => void;
  savedActivities: ActivitySaveRecord[];
  isActivitySaved: (activity: ActivitySaveLookup) => boolean;
  onToggleSavedActivity: (activity: ActivitySaveRecord) => void;
  storyInteractions: StoryInteractionProps;
}

export function SavedArchive({
  onNavigate,
  savedActivities,
  isActivitySaved,
  onToggleSavedActivity,
  storyInteractions,
}: SavedArchiveProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const [selectedTravelCard, setSelectedTravelCard] = useState<TravelCard | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [stories, setStories] = useState<StoryItem[]>(initialArchiveStories);

  const handleActivityClick = (activity: ActivitySaveRecord) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
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

  const travelCards: TravelCard[] = [
    {
      photoUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '광안리의 부드러운 아침',
      date: '2026.07.20',
      period: '7월 20일',
      memo: '바다를 따라 걷고, 작은 선의를 남겼던 여행',
      activities: ['광안리 해변 환경정화', '수영 공원 산책로 정비'],
      locationSummary: '광안리 해변과 수영 근린공원을 따라 이어지는 부산의 조용한 하루 일정이에요.',
      moodTags: ['바다', '아침산책', '작은실천'],
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '제주 애월의 조용한 하루',
      date: '2026.06.10',
      period: '6월 10일 ~ 6월 12일',
      memo: '바다를 오래 바라보고, 천천히 걸으며 마음을 정리했던 시간',
      activities: ['애월 해안 정화', '올레길 산책로 정비'],
      locationSummary: '제주 서쪽 해안과 낮은 산책로를 중심으로 느리게 움직이는 여행 카드예요.',
      moodTags: ['바다', '느린여행', '작은실천'],
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1542113028-b526238297f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '비자림의 고요한 산책',
      date: '2026.06.12',
      period: '6월 12일',
      memo: '숲의 결을 따라 걷고, 조용한 돌봄을 남겼던 오후',
      activities: ['비자림 산책로 정비', '숲길 표지 정리'],
      locationSummary: '비자림 안쪽 산책로를 중심으로 머무는 시간이 긴 제주 숲 여행이에요.',
      moodTags: ['숲길', '고요함', '산책'],
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '안목해변의 이른 커피',
      date: '2026.05.30',
      period: '5월 30일',
      memo: '아침 바다를 걷고 커피 향 사이로 돌아온 날',
      activities: ['안목해변 아침 플로깅'],
      locationSummary: '안목해변과 커피거리 주변을 천천히 걷는 강릉의 조용한 아침 기록이에요.',
      moodTags: ['아침바다', '플로깅', '커피거리'],
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '통영 항구의 작은 인사',
      date: '2026.04.26',
      period: '4월 26일',
      memo: '낯선 항구에서 지역의 하루를 잠깐 도왔던 오후',
      activities: ['통영 항구 마을 행사 도우미'],
      locationSummary: '강구안 항구와 골목 장터를 중심으로 이어지는 통영의 느린 오후 기록이에요.',
      moodTags: ['항구', '마을행사', '느린오후'],
      style: 'polaroid' as const,
    },
    {
      photoUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      title: '경주 골목의 낮은 빛',
      date: '2026.03.21',
      period: '3월 21일 ~ 3월 22일',
      memo: '오래된 골목을 안내하며 여행지가 생활처럼 다가온 시간',
      activities: ['경주 황리단길 작은 문화 안내', '동궁과 월지 주변 안내 정리'],
      locationSummary: '황리단길과 고분 주변을 천천히 걸으며 지역 이야기를 만난 경주 여행 카드예요.',
      moodTags: ['골목', '문화안내', '오후빛'],
      style: 'polaroid' as const,
    },
  ];

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
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
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <div className="pb-8">
          {/* Saved Activities */}
          {activeTab === 0 && (
            <div className="px-5">
              {savedActivities.length > 0 ? (
                <>
                  <div className="mb-3.5">
                    <p className="text-[12px] text-[#aaa]">
                      {savedActivities.length}개의 활동
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {savedActivities.map((activity) => (
                      <CompactActivityCard
                        key={getActivitySaveKey(activity)}
                        imageUrl={activity.imageUrl}
                        title={activity.title}
                        location={activity.location}
                        recruitmentStartDate={activity.recruitmentStartDate}
                        recruitmentEndDate={activity.recruitmentEndDate}
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
                      여행 중 만난 순간들
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        layout="grid"
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
                const groups: Record<string, TravelCard[]> = {};
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
                            key={i}
                            type="button"
                            onClick={() => setSelectedTravelCard(card)}
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
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '1.35',
                                }}
                              >
                                {card.title}
                              </p>
                              <p className="mt-1.5 text-[12px] leading-none text-[#9a9a9a]">
                                {card.date}
                              </p>
                              <div className="mt-3 border-t border-black/5 pt-2.5">
                                <p className="text-[11px] leading-none text-[#aaa]">시선</p>
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
        story={selectedStory}
        isOpen={selectedStory !== null}
        onClose={() => setSelectedStory(null)}
        isLiked={selectedStory ? storyInteractions.isStoryLiked(selectedStory.id) : false}
        likeCount={selectedStory ? storyInteractions.getStoryLikeCount(selectedStory) : undefined}
        commentCount={selectedStory ? storyInteractions.getStoryCommentCount(selectedStory) : undefined}
        comments={selectedStory ? storyInteractions.getStoryComments(selectedStory.id) : []}
        onToggleLike={(story) => storyInteractions.onToggleStoryLike(story.id)}
        onOpenComments={setCommentStory}
        onAddComment={(story, body) => storyInteractions.onAddStoryComment(story.id, body)}
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

      <TravelCardDetailSheet
        card={selectedTravelCard}
        isOpen={selectedTravelCard !== null}
        onClose={() => setSelectedTravelCard(null)}
      />
    </>
  );
}
