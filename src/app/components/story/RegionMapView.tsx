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
            style={{
              height: '47vw',
              maxHeight: '260px',
              background: 'linear-gradient(145deg, #f4f0e8 0%, #eef3ee 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -18px 42px rgba(164,153,135,0.08)',
            }}
          >
            {/* Map background SVG */}
            <svg
              viewBox="0 0 360 220"
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M 153 25 C 177 14 213 13 235 28 C 256 42 267 65 264 88 C 260 118 236 140 226 165 C 216 190 187 197 160 184 C 134 172 116 150 102 125 C 88 99 83 70 97 49 C 111 29 130 35 153 25 Z"
                fill="rgba(255,255,255,0.34)"
                stroke="none"
              />
              <path
                d="M 151 23
                   C 169 17 196 17 216 23
                   C 239 30 251 44 257 64
                   C 264 85 256 103 247 119
                   C 237 136 229 150 224 166
                   C 219 184 202 192 184 189
                   C 162 185 143 174 128 157
                   C 111 138 98 113 92 87
                   C 87 65 91 47 105 38
                   C 119 29 134 29 151 23 Z"
                fill="#e6ebe4"
                stroke="#d9d4ca"
                strokeWidth="1"
              />
              <path
                d="M 111 56 C 135 61 158 66 184 64
                   M 95 88 C 125 94 158 98 203 91
                   M 108 123 C 141 118 176 122 215 134
                   M 132 158 C 158 146 188 147 219 160
                   M 153 24 C 147 56 145 91 150 128
                   M 185 25 C 180 61 178 101 183 143
                   M 220 36 C 211 74 208 113 214 164"
                fill="none"
                stroke="rgba(190,184,174,0.42)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d="M 103 38 C 86 52 79 72 83 96 C 87 123 104 151 129 175"
                fill="none"
                stroke="rgba(255,255,255,0.46)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 253 60 C 271 83 269 114 251 139"
                fill="none"
                stroke="rgba(255,255,255,0.38)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <ellipse
                cx="80"
                cy="190"
                rx="24"
                ry="11"
                transform="rotate(-4 80 190)"
                fill="#e6ebe4"
                stroke="#d9d4ca"
                strokeWidth="1"
              />
            </svg>

            {/* Region markers */}
            {regions.map((region) => {
              const isSelected = selectedRegion === region.name;
              const isOtherSelected = selectedRegion !== null && !isSelected;
              const bgColor = isSelected ? '#6f9f83' : 'rgba(255,255,255,0.88)';
              const textColor = isSelected ? '#ffffff' : '#6f6b63';

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
                      border: isSelected ? '1px solid rgba(111,159,131,0.34)' : '1px solid rgba(120,112,99,0.08)',
                      boxShadow: isSelected
                        ? '0 2px 8px rgba(111,159,131,0.20)'
                        : '0 1px 5px rgba(84,75,62,0.08)',
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
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {visibleStories.map((story) => (
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
