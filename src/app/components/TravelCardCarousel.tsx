export interface TravelCard {
  photoUrl: string;
  title: string;
  date: string;
  style: 'polaroid' | 'film' | 'minimal' | 'postcard';
  period?: string;
  memo?: string;
  activities?: string[];
  locationSummary?: string;
  moodTags?: string[];
}

interface TravelCardCarouselProps {
  cards: TravelCard[];
  onCardClick?: (card: TravelCard) => void;
}

export function TravelCardCarousel({ cards, onCardClick }: TravelCardCarouselProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
      {cards.map((card, index) => (
        <div key={index} className="flex-shrink-0" style={{ width: '280px' }}>
          {/* Polaroid Style Card */}
          <button
            type="button"
            onClick={() => onCardClick?.(card)}
            className="w-full bg-white rounded-lg shadow-md p-3 cursor-pointer hover:shadow-lg transition-shadow text-left"
          >
            <div className="aspect-square bg-[#f0f0eb] mb-3 overflow-hidden">
              <img
                src={card.photoUrl}
                alt={card.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1.5 px-1 pb-1">
              <p className="text-sm text-[#2a2a2a] line-clamp-2">{card.title}</p>
              <p className="text-xs text-[#999]">{card.date}</p>
              <div className="pt-2 border-t border-black/5">
                <p className="text-xs text-[#999]">시선</p>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
