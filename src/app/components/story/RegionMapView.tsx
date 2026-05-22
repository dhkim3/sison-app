import { useState } from 'react';
import { Plus } from 'lucide-react';
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
}

const POPULAR_REGIONS = new Set(['서울', '부산', '제주', '강원']);

const regions = [
  { name: '인천',  count:  8, top: '14%', left: '12%' },
  { name: '서울',  count: 24, top: '14%', left: '30%' },
  { name: '강원',  count: 12, top: '10%', left: '62%' },
  { name: '경기',  count: 18, top: '22%', left: '22%' },
  { name: '충북',  count:  6, top: '34%', left: '50%' },
  { name: '세종',  count:  3, top: '38%', left: '36%' },
  { name: '충남',  count: 10, top: '40%', left: '20%' },
  { name: '대전',  count:  5, top: '42%', left: '38%' },
  { name: '경북',  count:  9, top: '44%', left: '62%' },
  { name: '전북',  count:  7, top: '52%', left: '24%' },
  { name: '대구',  count:  6, top: '52%', left: '54%' },
  { name: '광주',  count:  6, top: '62%', left: '18%' },
  { name: '울산',  count:  4, top: '56%', left: '72%' },
  { name: '전남',  count:  8, top: '66%', left: '22%' },
  { name: '경남',  count: 15, top: '64%', left: '52%' },
  { name: '부산',  count: 18, top: '68%', left: '66%' },
  { name: '제주',  count: 11, top: '88%', left: '22%' },
];

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
    relatedActivity: '강릉 안목해변 플로깅',
  },
];

const masonryImageHeights = ['86%', '74%', '94%', '80%'];

export function RegionMapView({
  onNavigate,
  onCreateStory,
  selectedRegion,
  onSelectRegion,
  storyInteractions,
}: RegionMapViewProps) {
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const visibleStories = selectedRegion
    ? mockStories.filter((s) => s.region === selectedRegion)
    : mockStories;

  return (
    <>
      <PageShell backgroundColor="#fafaf8">
        {/* Header */}
        <header
          className="sticky top-0 z-20 backdrop-blur-sm"
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

        {/* Map Section */}
        <section className="px-5 pt-3 pb-4">
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{ height: '47vw', maxHeight: '260px', backgroundColor: '#f0ece4' }}
          >
            {/* Map background SVG */}
            <svg
              viewBox="0 0 200 280"
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 70 15 L 80 12 L 95 13 L 110 16 L 125 22 L 135 30 L 140 42 L 142 55 L 140 68 L 135 80 L 128 92 L 120 104 L 110 115 L 100 124 L 92 130 L 85 128 L 78 120 L 72 110 L 67 98 L 64 86 L 63 74 L 64 62 L 66 50 L 67 38 L 68 26 Z"
                fill="#ede8e0"
                stroke="#d4cfc8"
                strokeWidth="0.5"
              />
              <ellipse
                cx="72"
                cy="200"
                rx="18"
                ry="10"
                fill="#ede8e0"
                stroke="#d4cfc8"
                strokeWidth="0.5"
              />
            </svg>

            {/* Region markers */}
            {regions.map((region) => {
              const isSelected = selectedRegion === region.name;
              const isOtherSelected = selectedRegion !== null && !isSelected;
              const isPopular = POPULAR_REGIONS.has(region.name);

              let bgColor = '#ffffff';
              let textColor = '#2a2a2a';

              if (isSelected) {
                bgColor = '#2a2a2a';
                textColor = '#ffffff';
              } else if (isPopular) {
                bgColor = '#f2c4c4';
                textColor = '#8b4444';
              }

              return (
                <button
                  type="button"
                  key={region.name}
                  onClick={() => onSelectRegion(isSelected ? null : region.name)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                  style={{
                    top: region.top,
                    left: region.left,
                    opacity: isOtherSelected ? 0.4 : 1,
                  }}
                >
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    }}
                  >
                    {region.name} {region.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent Stories Section */}
        <section className="pb-6">
          <div className="px-5 mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#2a2a2a]">
              {selectedRegion ? `${selectedRegion}에서 남겨진 시선` : '최근 올라온 스토리'}
            </h3>
            <button type="button" className="text-[12px] text-[#999]">더보기</button>
          </div>

          {visibleStories.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
              <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
            </div>
          ) : (
            <div
              className="px-5"
              style={{
                columnCount: 2,
                columnGap: '12px',
              }}
            >
              {visibleStories.map((story, index) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  layout="grid"
                  imageHeight={masonryImageHeights[index % masonryImageHeights.length]}
                  onClick={setSelectedStory}
                  isLiked={storyInteractions.isStoryLiked(story.id)}
                  likeCount={storyInteractions.getStoryLikeCount(story)}
                  commentCount={storyInteractions.getStoryCommentCount(story)}
                  onToggleLike={(nextStory) => storyInteractions.onToggleStoryLike(nextStory.id)}
                  onOpenComments={setCommentStory}
                />
              ))}
            </div>
          )}
        </section>
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
      />

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
