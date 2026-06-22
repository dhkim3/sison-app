export interface TravelCard {
  photoUrl: string;
  title: string;
  date: string;
  style: 'polaroid' | 'film' | 'minimal' | 'postcard';
  locationLabel?: string;
  period?: string;
  memo?: string;
  activities?: string[];
  locationSummary?: string;
  moodTags?: string[];
}

export function getCompactLocationLabel(location?: string) {
  if (!location) return '';

  const parts = location.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(' ');
}

interface TravelCardCarouselProps {
  cards: TravelCard[];
  onCardClick?: (card: TravelCard) => void;
}

export function TravelCardCarousel({ cards, onCardClick }: TravelCardCarouselProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pt-3 pb-6 scrollbar-hide -mx-6 px-6">
      {cards.map((card, index) => (
        <div key={index} className="flex-shrink-0" style={{ width: '280px' }}>
          {/* Polaroid Style Card */}
          <button
            type="button"
            onClick={() => onCardClick?.(card)}
            className="w-full bg-white rounded-lg p-3 cursor-pointer text-left transition-shadow"
            style={{ boxShadow: '0 14px 32px rgba(32, 32, 32, 0.08)' }}
          >
            <div className="aspect-square bg-[#f0f0eb] mb-3 overflow-hidden">
              <img
                src={card.photoUrl}
                alt={card.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-1 pb-1">
              <p className="line-clamp-1 text-sm font-semibold leading-snug text-[#2a2a2a]">{card.title}</p>
              <div className="mt-3 space-y-1">
                {card.locationLabel && (
                  <p className="text-xs font-medium leading-[1.35] text-[#6f6f6f]">{card.locationLabel}</p>
                )}
                <p className="text-xs font-normal leading-[1.35] text-[#b6b6b6]">{card.date}</p>
              </div>
              <div className="mt-3 border-t border-black/5 pt-2">
                <p className="text-center text-xs text-[#5F6368] opacity-70">시선</p>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
