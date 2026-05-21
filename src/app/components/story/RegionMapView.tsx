import { Heart, MessageCircle, Plus } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';

interface RegionMapViewProps {
  onNavigate: (screen: string) => void;
  onCreateStory: () => void;
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
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

const mockStories = [
  {
    id: 1,
    title: '광안리 여름의 바다',
    region: '부산',
    author: '나나',
    likes: 12,
    comments: 3,
    imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?w=400',
  },
  {
    id: 2,
    title: '숲길을 걸으며',
    region: '제주',
    author: '지우',
    likes: 9,
    comments: 2,
    imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400',
  },
  {
    id: 3,
    title: '안목해변의 아침',
    region: '강원',
    author: '소희',
    likes: 7,
    comments: 1,
    imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?w=400',
  },
];

export function RegionMapView({
  onNavigate,
  onCreateStory,
  selectedRegion,
  onSelectRegion,
}: RegionMapViewProps) {
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
              onClick={onCreateStory}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                backgroundColor: '#a8d5ba',
                boxShadow: '0 2px 8px rgba(168,213,186,0.45)',
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
            <button className="text-[12px] text-[#999]">더보기</button>
          </div>

          {visibleStories.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
              <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto"
              style={{
                paddingLeft: '20px',
                paddingRight: '20px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {visibleStories.map((story) => (
                <div
                  key={story.id}
                  className="flex-shrink-0 rounded-2xl overflow-hidden"
                  style={{
                    width: '38vw',
                    maxWidth: '160px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                  }}
                >
                  {/* Image */}
                  <div className="relative" style={{ paddingBottom: '100%' }}>
                    <img
                      src={story.imageUrl}
                      alt={story.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ borderRadius: '12px 12px 0 0' }}
                    />
                    {/* Region badge */}
                    <span
                      className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        color: '#2a2a2a',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                      }}
                    >
                      {story.region}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="px-2.5 pt-2 pb-2.5">
                    <p
                      className="text-[13px] font-semibold text-[#2a2a2a] leading-snug mb-0.5"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {story.title}
                    </p>
                    <p className="text-[11px] text-[#999] mb-2">{story.author}</p>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-[10px] text-[#999]">
                        <Heart className="w-3 h-3" />
                        {story.likes}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[#999]">
                        <MessageCircle className="w-3 h-3" />
                        {story.comments}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </PageShell>

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
