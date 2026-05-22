import { useRef, useState } from 'react';
import { Search, Calendar, Users, MapPin } from 'lucide-react';

interface EnhancedSearchCardProps {
  destination: string;
  dateRange: string;
  peopleCount: number;
  onDestinationClick: () => void;
  onDateClick: () => void;
  onPeopleClick: () => void;
  onSearch: () => void;
  onDestinationChange: (value: string) => void;
}

export function EnhancedSearchCard({
  destination,
  dateRange,
  peopleCount,
  onDestinationClick,
  onDateClick,
  onPeopleClick,
  onSearch,
  onDestinationChange,
}: EnhancedSearchCardProps) {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const destinationInputRef = useRef<HTMLInputElement>(null);

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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
      <div>
        {/* Destination Input */}
        <div
          onFocus={() => setIsDiscoveryOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsDiscoveryOpen(false);
            }
          }}
        >
          <div className="relative flex items-center gap-3 pb-4">
            <Search className="w-5 h-5 text-[#5a5a5a]" />
            <input
              ref={destinationInputRef}
              type="text"
              placeholder="어디로 떠나시나요?"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              onClick={onDestinationClick}
              className="flex-1 outline-none bg-transparent placeholder:text-[#999] text-[#2a2a2a]"
            />
            <div
              className={`absolute bottom-0 left-0 h-px w-full bg-black/5 transition-opacity duration-300 ease-out ${
                isDiscoveryOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isDiscoveryOpen ? 'max-h-[260px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1'
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
              <div className="pt-4 pb-4">
                <div className="h-px bg-black/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Date and People Selectors */}
        <div
          className="grid grid-cols-2 gap-3"
        >
          {/* Date Selector */}
          <button
            type="button"
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onDateClick)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f8f5] hover:bg-[#e8f5ed] transition-colors text-left"
          >
            <Calendar className="w-4 h-4 text-[#5a5a5a] flex-shrink-0" strokeWidth={2} />
            <span className={`text-sm ${dateRange ? 'text-[#2a2a2a]' : 'text-[#5a5a5a]'} truncate`}>
              {dateRange || '여행 일정'}
            </span>
          </button>

          {/* People Selector */}
          <button
            type="button"
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onPeopleClick)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f8f5] hover:bg-[#e8f5ed] transition-colors text-left"
          >
            <Users className="w-4 h-4 text-[#5a5a5a] flex-shrink-0" strokeWidth={2} />
            <span className={`text-sm ${peopleCount > 0 ? 'text-[#2a2a2a]' : 'text-[#5a5a5a]'}`}>
              {peopleCount > 0 ? `${peopleCount}명` : '인원'}
            </span>
          </button>
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={onSearch}
          className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a] mt-4"
        >
          봉사활동 찾아보기
        </button>
      </div>
    </div>
  );
}
