import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, Calendar, Users, MapPin, ChevronRight, X } from 'lucide-react';
import { filterLocationSuggestions, locationDiscoverySections } from '../locationSuggestions';

interface EnhancedSearchCardProps {
  destination: string;
  dateRange: string;
  peopleCount: number;
  onDateClick: () => void;
  onPeopleClick: () => void;
  onSearch: () => void;
  onDestinationChange: (value: string) => void;
  onDateClear?: () => void;
}

export function EnhancedSearchCard({
  destination,
  dateRange,
  peopleCount,
  onDateClick,
  onPeopleClick,
  onSearch,
  onDestinationChange,
  onDateClear,
}: EnhancedSearchCardProps) {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [discoveryHeight, setDiscoveryHeight] = useState(0);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const discoveryContentRef = useRef<HTMLDivElement>(null);
  const discoveryCloseTimerRef = useRef<number | null>(null);
  const normalizedDestination = destination.trim().toLowerCase();
  const autocompleteItems = filterLocationSuggestions(destination);
  const discoverySections = locationDiscoverySections.map((section) => ({
    ...section,
    icon: section.title === '최근 검색' ? Search : MapPin,
  }));

  useLayoutEffect(() => {
    const content = discoveryContentRef.current;
    if (!content) return;

    setDiscoveryHeight(isDiscoveryOpen ? content.scrollHeight : 0);
  }, [isDiscoveryOpen, normalizedDestination, autocompleteItems.length]);

  useEffect(() => () => {
    if (discoveryCloseTimerRef.current) {
      window.clearTimeout(discoveryCloseTimerRef.current);
    }
  }, []);

  const clearDiscoveryCloseTimer = () => {
    if (!discoveryCloseTimerRef.current) return;

    window.clearTimeout(discoveryCloseTimerRef.current);
    discoveryCloseTimerRef.current = null;
  };

  const openDiscovery = () => {
    clearDiscoveryCloseTimer();
    setIsDiscoveryOpen(true);
  };

  const closeDiscoveryWithDelay = () => {
    clearDiscoveryCloseTimer();
    discoveryCloseTimerRef.current = window.setTimeout(() => {
      setIsDiscoveryOpen(false);
      discoveryCloseTimerRef.current = null;
    }, 120);
  };

  const handleDiscoverySelect = (value: string) => {
    clearDiscoveryCloseTimer();
    onDestinationChange(value);
    destinationInputRef.current?.blur();
    setIsDiscoveryOpen(false);
  };

  const handleDestinationChange = (value: string) => {
    onDestinationChange(value);
    openDiscovery();
  };

  const transitionToSelection = (openSelection: () => void) => {
    const shouldSequence = isDiscoveryOpen;

    destinationInputRef.current?.blur();
    setIsDiscoveryOpen(false);

    window.setTimeout(openSelection, shouldSequence ? 90 : 0);
  };

  return (
    <div className="relative z-30 bg-white rounded-3xl p-6 shadow-sm border border-black/5">
      <div>
        {/* Destination Input */}
        <div
          className="relative z-20"
          onFocus={openDiscovery}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              closeDiscoveryWithDelay();
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
              onChange={(e) => handleDestinationChange(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 outline-none bg-transparent placeholder:text-[#999] text-[#2a2a2a]"
            />
            <div
              className={`absolute bottom-0 left-0 h-px w-full bg-black/5 transition-opacity duration-300 ease-out ${
                isDiscoveryOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <div
            className={`overflow-hidden transition-[height,opacity,transform] duration-[220ms] ease-out ${
              isDiscoveryOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5'
            }`}
            style={{ height: discoveryHeight }}
          >
            <div
              ref={discoveryContentRef}
              className={`pt-4 transition-[opacity,transform] duration-200 ease-out ${
                isDiscoveryOpen ? 'opacity-100 translate-y-0 delay-75' : 'opacity-0 -translate-y-2 delay-0'
              }`}
            >
              {normalizedDestination ? (
                <section>
                  <div className="mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#bbb]" strokeWidth={2} />
                    <h4 className="text-[12px] font-semibold text-[#5a5a5a] leading-none">
                      여행지 제안
                    </h4>
                  </div>
                  <div className="overflow-hidden rounded-2xl bg-[#fbfaf6] border border-black/5 shadow-[0_8px_18px_rgba(65,78,66,0.04)]">
                    {autocompleteItems.length > 0 ? (
                      autocompleteItems.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            handleDiscoverySelect(item);
                          }}
                          className="flex w-full items-center justify-between gap-3 border-b border-black/[0.04] px-3.5 py-3 text-left text-[13px] text-[#4f5b53] transition-colors last:border-b-0 hover:bg-[#f1f8f3]"
                        >
                          <span className="font-medium">{item}</span>
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[#c8d8cd]" strokeWidth={2} />
                        </button>
                      ))
                    ) : (
                      <div className="px-3.5 py-3 text-[12.5px] text-[#9a9a9a]">
                        어울리는 여행지를 찾고 있어요
                      </div>
                    )}
                  </div>
                </section>
              ) : (
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
                              onPointerDown={(event) => {
                                event.preventDefault();
                                handleDiscoverySelect(item);
                              }}
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
              )}
              <div className="pt-4 pb-4">
                <div className="h-px bg-black/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Date and People Selectors */}
        <div
          className="relative z-0 grid grid-cols-2 gap-3"
        >
          {/* Date Selector */}
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
            className="flex h-12 cursor-pointer items-center gap-3 rounded-2xl bg-[#f8f8f5] px-3 text-left transition-colors hover:bg-[#e8f5ed]"
          >
            <Calendar className="w-4 h-4 text-[#5a5a5a] flex-shrink-0" strokeWidth={2} />
            <span className={`min-w-0 flex-1 truncate text-sm ${dateRange ? 'text-[#2a2a2a]' : 'text-[#5a5a5a]'}`}>
              {dateRange || '여행 일정'}
            </span>
            {dateRange && onDateClear && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDateClear();
                }}
                aria-label="여행 일정 초기화"
                className="-mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-[#aaa] transition-colors hover:bg-white hover:text-[#777] active:scale-95"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* People Selector */}
          <button
            type="button"
            onMouseDown={(event) => {
              if (isDiscoveryOpen) {
                event.preventDefault();
              }
            }}
            onClick={() => transitionToSelection(onPeopleClick)}
            className="flex h-12 items-center gap-3 rounded-2xl bg-[#f8f8f5] px-3 text-left transition-colors hover:bg-[#e8f5ed]"
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
          활동 찾기
        </button>
      </div>
    </div>
  );
}
