import { useRef, useState } from 'react';
import { Search, Calendar, Users, MapPin } from 'lucide-react';
import { SearchHistory } from './SearchHistory';
import { CategoryCard } from './CategoryCard';
import { DestinationCard } from './DestinationCard';

interface DefaultSearchStateProps {
  onSearch: (dest: string, dates: string, people: number) => void;
  onDateClick: () => void;
  onPeopleClick: () => void;
  destination: string;
  dateRange: string;
  peopleCount: number;
  onDestinationChange: (value: string) => void;
  onDateConfirm?: (start: Date, end: Date) => void;
  onPeopleConfirm?: (count: number) => void;
}

export function DefaultSearchState({
  onSearch,
  onDateClick,
  onPeopleClick,
  destination,
  dateRange,
  peopleCount,
  onDestinationChange,
}: DefaultSearchStateProps) {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  const recentSearches = [
    { location: '광안리', dates: '7/20~7/22', people: '2명' },
    { location: '제주', dates: '6/10~6/12', people: '1명' },
    { location: '강릉', dates: '5/14~5/16', people: '2명' },
  ];

  const categories = [
    { emoji: '🌿', label: '환경정화' },
    { emoji: '🎪', label: '지역 행사' },
    { emoji: '📚', label: '교육·문화' },
    { emoji: '🚶', label: '산책형 활동' },
  ];

  const destinations = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1612977512598-3b8d6a498bbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '제주',
      activityCount: 24,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1621478763597-11fb71047890?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '강릉',
      activityCount: 18,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '부산',
      activityCount: 32,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1659083899422-b0c7230ef99e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
      name: '여수',
      activityCount: 15,
    },
  ];

  const discoverySections = [
    {
      title: '최근 검색',
      icon: Search,
      items: ['광안리', '안목해변', '제주 애월'],
    },
    {
      title: '추천 지역',
      icon: MapPin,
      items: ['부산 수영구', '강릉 안목', '제주 서쪽'],
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
          <div className="flex items-center gap-3 pb-4 border-b border-black/5">
            <Search className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            <input
              ref={destinationInputRef}
              type="text"
              placeholder="어디로 떠나시나요?"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="flex-1 text-sm placeholder:text-[#999] outline-none bg-transparent"
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isDiscoveryOpen ? 'max-h-[360px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'
            }`}
          >
            <div className="pt-4">
              <div className="space-y-4">
                {discoverySections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <section key={section.title}>
                      <div className="mb-2 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-[#bbb]" strokeWidth={2} />
                        <h4 className="text-[12px] font-semibold text-[#5a5a5a] leading-none">
                          {section.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleDiscoverySelect(item)}
                            className="px-3 py-2 rounded-full bg-[#f8f8f5] text-[12px] text-[#5a5a5a] hover:bg-[#e8f5ed] hover:text-[#2a2a2a] transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="pt-5 pb-4">
                <div className="h-px bg-black/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Date & People row */}
        <div
          className="flex gap-3 mb-4"
        >
          <button
            type="button"
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onDateClick)}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#f8f8f5] rounded-2xl hover:bg-[#f0f0eb] transition-colors"
          >
            <Calendar className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{dateRange || '여행 일정'}</span>
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onPeopleClick)}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#f8f8f5] rounded-2xl hover:bg-[#f0f0eb] transition-colors"
          >
            <Users className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{peopleCount > 0 ? `${peopleCount}명` : '인원'}</span>
          </button>
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearchSubmit}
          className="w-full py-4 bg-[#2a2a2a] text-white rounded-2xl text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
        >
          봉사활동 찾아보기
        </button>
      </div>

      {/* Recent Searches */}
      <section>
        <h3 className="mb-3">최근 검색</h3>
        <SearchHistory
          items={recentSearches}
          onItemClick={(item) => onSearch(item.location, item.dates, Number.parseInt(item.people, 10) || 0)}
        />
      </section>

      {/* Categories */}
      <section>
        <h3 className="mb-3">활동 카테고리</h3>
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
          {categories.map((category, index) => (
            <CategoryCard
              key={index}
              {...category}
              onClick={() => onSearch(category.label, '', 0)}
            />
          ))}
        </div>
      </section>

      {/* Popular Destinations */}
      <section>
        <h3 className="mb-3">인기 여행지</h3>
        <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2 scrollbar-hide">
          {destinations.map((dest, index) => (
            <DestinationCard
              key={index}
              {...dest}
              onClick={() => onSearch(dest.name, '', 0)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
