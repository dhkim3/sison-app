import { useRef, useState } from 'react';
import { Search, Calendar, Users, MapPin, X } from 'lucide-react';
import { SearchHistory } from './SearchHistory';
import { DestinationCard } from './DestinationCard';
import { SearchDiscoverySections, popularRegionItems } from './SearchDiscoverySections';
import { type RecentSearchItem } from '../searchState';

interface DefaultSearchStateProps {
  onSearch: (dest: string, dates: string, people: number) => void;
  onDateClick: () => void;
  onPeopleClick: () => void;
  destination: string;
  dateRange: string;
  peopleCount: number;
  recentSearches: RecentSearchItem[];
  onDestinationChange: (value: string) => void;
  onRecentSearchSelect: (item: RecentSearchItem) => void;
  onDateConfirm?: (start: Date, end: Date) => void;
  onDateClear?: () => void;
  onPeopleClear?: () => void;
  onPeopleConfirm?: (count: number) => void;
  destinationActivityLabels?: Record<string, string>;
}

export function DefaultSearchState({
  onSearch,
  onDateClick,
  onPeopleClick,
  destination,
  dateRange,
  peopleCount,
  recentSearches,
  onDestinationChange,
  onRecentSearchSelect,
  onDateClear,
  onPeopleClear,
  destinationActivityLabels = {},
}: DefaultSearchStateProps) {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  const destinations = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1612977512598-3b8d6a498bbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '제주',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '강릉',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '부산',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1659083899422-b0c7230ef99e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '여수',
    },
  ];

  const handleSearchSubmit = () => {
    onSearch(destination, dateRange, peopleCount);
  };

  const handleDiscoverySelect = (value: string) => {
    onDestinationChange(value);
    destinationInputRef.current?.blur();
    setIsDiscoveryOpen(false);
  };

  const handleRecentSelect = (item: RecentSearchItem) => {
    destinationInputRef.current?.blur();
    setIsDiscoveryOpen(false);
    onRecentSearchSelect(item);
  };

  const transitionToSelection = (openSelection: () => void) => {
    const shouldSequence = isDiscoveryOpen;

    destinationInputRef.current?.blur();
    setIsDiscoveryOpen(false);

    window.setTimeout(openSelection, shouldSequence ? 90 : 0);
  };

  return (
    <div className="space-y-8">
      {/* Search Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
        {/* Destination input */}
        <div
          onFocus={() => setIsDiscoveryOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsDiscoveryOpen(false);
            }
          }}
        >
          <div className="relative flex items-center gap-3 pb-4">
            <Search className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            <input
              ref={destinationInputRef}
              type="text"
              placeholder="어디로 떠나시나요?"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="flex-1 text-sm placeholder:text-[#999] outline-none bg-transparent"
            />
            <div
              className={`absolute bottom-0 left-0 h-px w-full bg-black/5 transition-opacity duration-300 ease-out ${
                isDiscoveryOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isDiscoveryOpen ? 'max-h-[360px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'
            }`}
          >
            <div className="pt-4">
              <SearchDiscoverySections
                recentSearches={recentSearches}
                onRecentSearchSelect={handleRecentSelect}
                onRegionSelect={handleDiscoverySelect}
              />
              <div className="pt-4 pb-4">
                <div className="h-px bg-black/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Date & People row */}
        <div
          className="flex gap-3 mb-4"
        >
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onDateClick)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                transitionToSelection(onDateClick);
              }
            }}
            className="flex h-12 flex-1 cursor-pointer items-center gap-2 rounded-2xl bg-[#f8f8f5] px-4 transition-colors hover:bg-[#f0f0eb]"
          >
            <Calendar className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate text-sm text-[#5a5a5a]">{dateRange || '일정'}</span>
            {dateRange && onDateClear && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDateClear();
                }}
                aria-label="일정 초기화"
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#aaa] transition-colors hover:text-[#777] active:scale-95"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </div>
          <div
            role="button"
            tabIndex={0}
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onPeopleClick)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                transitionToSelection(onPeopleClick);
              }
            }}
            className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-[#f8f8f5] px-4 transition-colors hover:bg-[#f0f0eb]"
          >
            <Users className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate text-sm text-[#5a5a5a]">{peopleCount > 0 ? `${peopleCount}명` : '인원'}</span>
            {peopleCount > 0 && onPeopleClear && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onPeopleClear();
                }}
                aria-label="인원 초기화"
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#aaa] transition-colors hover:text-[#777] active:scale-95"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearchSubmit}
          className="w-full py-4 bg-[#2a2a2a] text-white rounded-2xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          활동 찾기
        </button>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <section>
          <h3 className="mb-3">최근 검색</h3>
          <SearchHistory
            items={recentSearches}
            onItemClick={onRecentSearchSelect}
          />
        </section>
      )}

      {/* Recommended Regions */}
      <section>
        <div className="mb-3">
          <h3 className="mb-1">실시간 인기 지역</h3>
        </div>
        <div className="space-y-2.5">
          {popularRegionItems.map((region) => (
            <button
              key={region.name}
              type="button"
              onClick={() => onSearch(region.searchKeyword, '', 0)}
              className="w-full rounded-2xl bg-white border border-black/5 px-4 py-3.5 text-left shadow-sm hover:bg-[#fbfbf8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-[#eef7f2] flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#6fa985]" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-snug text-[#2a2a2a]">{region.name}</p>
                  <p className="mt-0.5 text-[12px] leading-[18px] text-[#999]">{region.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Destinations */}
      <section>
        <h3 className="mb-3">추천 여행지</h3>
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
          {destinations.map((dest, index) => (
            <DestinationCard
              key={index}
              {...dest}
              activityCountLabel={destinationActivityLabels[dest.name] ?? '활동 확인 중'}
              onClick={() => onSearch(dest.name, '', 0)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
