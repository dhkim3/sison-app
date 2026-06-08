import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { StoryCard } from './StoryCard';
import { StoryDetailSheet } from './StoryDetailSheet';
import { StoryCommentSheet } from './StoryCommentSheet';
import type { StoryItem } from './storyTypes';
import type { StoryInteractionProps } from '../../storyInteractionState';

interface RegionMapViewProps {
  onNavigate: (screen: string) => void;
  onCreateStory: () => void;
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
  storyInteractions: StoryInteractionProps;
  userStories?: StoryItem[];
}

const regions = [
  { name: '서울',  count: 24, top: '28.5%', left: '44%' },
  { name: '경기',  count: 18, top: '34%', left: '43%' },
  { name: '강원',  count: 12, top: '27%', left: '61.5%' },
  { name: '충남',  count: 10, top: '49%', left: '39.5%', label: '충청' },
  { name: '경북',  count:  9, top: '51%', left: '61%' },
  { name: '전남',  count:  8, top: '72%', left: '40%' },
  { name: '경남',  count: 15, top: '67%', left: '55.5%' },
  { name: '부산',  count: 18, top: '69%', left: '65.5%' },
  { name: '제주',  count: 11, top: '85%', left: '31%' },
  /*
  { name: '울산',  count:  4, top: '67%', left: '66%' },
  울릉도/독도 마커는 만들지 않습니다.
  */
];

const mapImagePlacement = {
  size: '117%',
  top: '51.5%',
  opacity: 0.6,
};

const mockStories: StoryItem[] = [
  {
    id: 1,
    title: '광안리 여름의 바다',
    region: '부산',
    author: '나나',
    likes: 12,
    comments: 3,
    imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?w=400',
    body: '아침 바다 앞에서 쓰레기를 주우며 오래 머물고 싶은 풍경에 대해 생각했어요. 여행지가 조금 더 깨끗해지는 순간을 직접 만지는 느낌이 조용히 남았습니다.',
    relatedActivity: '광안리 해변 환경정화',
  },
  {
    id: 2,
    title: '숲길을 걸으며',
    region: '제주',
    author: '지우',
    likes: 9,
    comments: 2,
    imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400',
    body: '숲길을 따라 천천히 걸으며 작은 표지판과 길가의 가지들을 정리했어요. 바람이 지나가는 소리가 좋아서 봉사라기보다 긴 산책처럼 느껴졌습니다.',
    relatedActivity: '제주 숲길 산책로 정비',
  },
  {
    id: 3,
    title: '안목해변의 아침',
    region: '강원',
    author: '소희',
    likes: 7,
    comments: 1,
    imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?w=400',
    body: '해가 막 올라온 안목해변은 생각보다 고요했어요. 짧은 플로깅을 마치고 나니 하루의 시작을 조금 더 단정하게 맞이한 기분이 들었습니다.',
    relatedActivity: '안목해변 플로깅',
  },
  {
    id: 4,
    title: '성산 바람 아래에서',
    region: '제주',
    author: '하린',
    likes: 15,
    comments: 4,
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400',
    body: '성산 바닷길은 바람이 먼저 말을 걸어오는 곳 같았어요. 해안 정리를 마치고 돌아보니 작은 봉투 하나만큼 마음도 가벼워졌습니다.',
    relatedActivity: '성산 해안 쓰담 걷기',
  },
  {
    id: 5,
    title: '통영 항구의 느린 오후',
    region: '경남',
    author: '민서',
    likes: 10,
    comments: 2,
    imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400',
    body: '작은 항구 행사에서 길을 안내하고 의자를 정리했어요. 바다 냄새와 사람들의 느린 발걸음이 오래 남는 오후였습니다.',
    relatedActivity: '통영 항구 마을 행사 도우미',
  },
  {
    id: 6,
    title: '경주의 골목을 지나는 빛',
    region: '경북',
    author: '윤재',
    likes: 8,
    comments: 1,
    imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400',
    body: '황리단길 작은 전시를 돕는 동안 오래된 담벼락에 오후 빛이 내려앉았어요. 여행지가 풍경이 아니라 생활처럼 느껴진 시간이었습니다.',
    relatedActivity: '경주 황리단길 작은 문화 안내',
  },
  {
    id: 7,
    title: '여수 노을 전 산책',
    region: '전남',
    author: '다온',
    likes: 14,
    comments: 3,
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400',
    body: '돌산 해안길을 따라 쓰레기를 줍고 나니 노을이 천천히 내려왔어요. 여행의 끝에 무언가를 조금 남기고 온 기분이 들었습니다.',
    relatedActivity: '여수 돌산 해안 쓰담 걷기',
  },
  {
    id: 8,
    title: '전주 골목 장터의 온기',
    region: '전북',
    author: '서윤',
    likes: 11,
    comments: 2,
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400',
    body: '한옥마을 골목 장터에서 체험 부스를 정리했어요. 짧은 인사와 웃음이 모여 여행보다 조금 더 오래 남는 기억이 됐습니다.',
    relatedActivity: '전주 한옥마을 골목 행사 도우미',
  },
];

export function RegionMapView({
  onNavigate,
  onCreateStory,
  selectedRegion,
  onSelectRegion,
  storyInteractions,
  userStories = [],
}: RegionMapViewProps) {
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<'recent' | 'current-location' | null>(null);
  const stories = [...userStories, ...mockStories];
  const currentRegion = '부산';
  const visibleStories = selectedRegion
    ? stories.filter((s) => s.region === selectedRegion)
    : stories;
  const recentStories = visibleStories.slice(0, 5);
  const selectedRegionLabel = regions.find((region) => region.name === selectedRegion)?.label ?? selectedRegion;
  const currentRegionStories = stories.filter((story) => story.region === currentRegion).slice(0, 5);
  const fullStoryList =
    activeStoryList === 'current-location'
      ? stories.filter((story) => story.region === currentRegion)
      : stories;
  const fullStoryListTitle = activeStoryList === 'current-location' ? '현재 위치 스토리' : '최근 올라온 스토리';

  const renderStoryCard = (story: StoryItem) => (
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
  );

  return (
    <>
      <PageShell backgroundColor="#fafaf8">
        {/* Header */}
        {activeStoryList ? (
          <header
            className="sison-top-bar sticky top-0 z-20 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(250,250,248,0.92)' }}
          >
            <div className="px-5 py-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStoryList(null)}
                className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
              </button>
              <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">{fullStoryListTitle}</h2>
            </div>
          </header>
        ) : (
          <header
            className="sison-top-bar sticky top-0 z-20 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(250,250,248,0.92)' }}
          >
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">스토리</h2>
                <p className="text-[12px] text-[#aaa] mt-0.5">
                  여행지에서 남겨진 작은 시선을 둘러보세요.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateStory}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: '#6fb58a',
                  boxShadow: '0 3px 10px rgba(111,181,138,0.38)',
                }}
              >
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </header>
        )}

        {activeStoryList ? (
          <section className="px-5 pt-3 pb-24">
            {fullStoryList.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[13px] text-[#bbb] mb-1">아직 남겨진 시선이 없어요</p>
                <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                {fullStoryList.map((story) => renderStoryCard(story))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Map Section */}
            <section className="px-5 pt-3 pb-4">
              <div
                className="relative w-full overflow-hidden rounded-3xl"
                style={{
                  height: 'clamp(340px, 92vw, 374px)',
                  background:
                    'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.34) 38%, transparent 68%), linear-gradient(145deg, #fbf7ee 0%, #edf7f0 54%, #f8f4e9 100%)',
                  boxShadow:
                    '0 12px 28px rgba(83,102,85,0.08), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -24px 48px rgba(170,190,171,0.10)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-5 rounded-[1.35rem]"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 45%, rgba(204,232,214,0.38) 0%, rgba(255,255,255,0.46) 44%, rgba(255,255,255,0) 72%)',
                    boxShadow: '0 0 42px rgba(176,221,195,0.26)',
                  }}
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-0 overflow-hidden rounded-3xl"
                  style={{
                    margin: '8px',
                  }}
                >
                  <img
                    src="/sison-korea-admin-map.svg"
                    alt=""
                    aria-hidden="true"
                    className="absolute left-1/2 max-w-none select-none object-contain"
                    draggable={false}
                    style={{
                      top: mapImagePlacement.top,
                      width: mapImagePlacement.size,
                      height: mapImagePlacement.size,
                      opacity: mapImagePlacement.opacity,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(251,247,238,0.20) 0%, rgba(237,247,240,0.16) 48%, rgba(251,247,238,0.20) 100%)',
                  }}
                />

                {/* Region markers */}
                {regions.map((region) => {
                  const isSelected = selectedRegion === region.name;
                  const isOtherSelected = selectedRegion !== null && !isSelected;

                  return (
                    <button
                      type="button"
                      key={region.name}
                      aria-label={`${region.label ?? region.name} 지역 스토리 보기`}
                      onClick={() => onSelectRegion(isSelected ? null : region.name)}
                      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 transition-all duration-200"
                      style={{
                        top: region.top,
                        left: region.left,
                        opacity: isOtherSelected ? 0.42 : 1,
                      }}
                    >
                      <span
                        className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          boxShadow: isSelected
                            ? '0 0 0 4px rgba(142,205,168,0.24), 0 5px 14px rgba(92,146,113,0.24)'
                            : '0 3px 10px rgba(106,128,111,0.16)',
                        }}
                      >
                        <span
                          className="block h-[8px] w-[8px] rounded-full"
                          style={{
                            backgroundColor: isSelected ? '#66a982' : '#93cdae',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                          }}
                        />
                      </span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none"
                        style={{
                          color: isSelected ? '#4f8d68' : '#7e8f82',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.42)',
                          boxShadow: isSelected ? '0 2px 8px rgba(92,146,113,0.10)' : 'none',
                        }}
                      >
                        {region.label ?? region.name}
                      </span>
                      <span className="sr-only">{region.count}개의 스토리</span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-5 rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none opacity-0 transition-opacity duration-200"
                        style={{
                          color: '#6f9f83',
                          backgroundColor: 'rgba(255,255,255,0.86)',
                        }}
                      >
                        {region.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedRegion ? (
              <section className="pb-6">
                <div className="px-5 mb-3 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#2a2a2a]">{selectedRegionLabel}의 스토리</h3>
                  <button
                    type="button"
                    onClick={() => onSelectRegion(null)}
                    className="text-[12px] text-[#999]"
                  >
                    전체보기 →
                  </button>
                </div>

                {visibleStories.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
                    <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                    {recentStories.map((story) => (
                      <div key={story.id} className="w-[160px] flex-none">
                        {renderStoryCard(story)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Recent Stories Section */}
                <section className="pb-6">
                  <div className="px-5 mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#2a2a2a]">최근 올라온 스토리</h3>
                    <button
                      type="button"
                      onClick={() => setActiveStoryList('recent')}
                      className="text-[12px] text-[#999]"
                    >
                      전체보기 →
                    </button>
                  </div>

                  {visibleStories.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
                      <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                      {recentStories.map((story) => (
                        <div key={story.id} className="w-[160px] flex-none">
                          {renderStoryCard(story)}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="pb-6">
                  <div className="px-5 mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#2a2a2a]">현재 위치 스토리</h3>
                    <button
                      type="button"
                      onClick={() => setActiveStoryList('current-location')}
                      className="text-[12px] text-[#999]"
                    >
                      전체보기 →
                    </button>
                  </div>

                  {currentRegionStories.length === 0 ? (
                    <div className="px-5">
                      <p className="text-[13px] leading-5 text-[#bbb]">아직 이 근처의 스토리가 많지 않아요.</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                      {currentRegionStories.map((story) => (
                        <div key={story.id} className="w-[160px] flex-none">
                          {renderStoryCard(story)}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </PageShell>

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

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
