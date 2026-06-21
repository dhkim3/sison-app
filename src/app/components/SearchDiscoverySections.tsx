import { MapPin, Search } from 'lucide-react';
import { formatRecentSearchShort, type RecentSearchItem } from '../searchState';

export const popularRegionItems = [
  {
    name: '부산 수영구',
    description: '바다 산책과 함께하는 가벼운 활동',
    searchKeyword: '부산 수영구',
  },
  {
    name: '제주',
    description: '느린 일정 사이에 머무는 활동',
    searchKeyword: '제주',
  },
  {
    name: '서울 마포구',
    description: '공원과 도심을 잇는 가벼운 활동',
    searchKeyword: '서울 마포구',
  },
] as const;

interface SearchDiscoverySectionsProps {
  recentSearches: RecentSearchItem[];
  onRecentSearchSelect: (item: RecentSearchItem) => void;
  onRegionSelect: (region: string) => void;
}

export function SearchDiscoverySections({
  recentSearches,
  onRecentSearchSelect,
  onRegionSelect,
}: SearchDiscoverySectionsProps) {
  const topRecentSearches = recentSearches.slice(0, 3);

  return (
    <div className="space-y-4">
      {topRecentSearches.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-[#9AA0A6]" strokeWidth={2} />
            <h4 className="text-[12px] font-semibold text-[#5a5a5a] leading-none">최근 검색</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {topRecentSearches.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRecentSearchSelect(item)}
                className="px-3 py-2 rounded-full bg-[#f8f8f5] text-[12px] text-[#5a5a5a] hover:bg-[#e8f5ed] hover:text-[#2a2a2a] transition-colors"
              >
                {formatRecentSearchShort(item)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#9AA0A6]" strokeWidth={2} />
          <h4 className="text-[12px] font-semibold text-[#5a5a5a] leading-none">실시간 인기 지역</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularRegionItems.map((item) => (
            <button
              key={item.searchKeyword}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onRegionSelect(item.searchKeyword)}
              className="px-3 py-2 rounded-full bg-[#f8f8f5] text-[12px] text-[#5a5a5a] hover:bg-[#e8f5ed] hover:text-[#2a2a2a] transition-colors"
            >
              {item.searchKeyword}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
