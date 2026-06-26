import { TravelCardPreview } from './TravelCardPreview';
import { travelCardRadiusStyle } from './travelCardStyles';

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
  frameType?: string;
}

interface TravelCardCarouselProps {
  cards: TravelCard[];
  onCardClick?: (card: TravelCard) => void;
}

export function TravelCardCarousel({ cards, onCardClick }: TravelCardCarouselProps) {
  return (
    <div className="scrollbar-hide -mx-6 overflow-x-auto px-6 pb-7 pt-1">
      <div className="flex w-max items-start gap-[18px] overflow-visible pr-7">
        {cards.map((card, index) => (
          <div
            key={index}
            className="flex-none overflow-visible"
            style={{ width: '280px', ...travelCardRadiusStyle }}
          >
            <button
              type="button"
              onClick={() => onCardClick?.(card)}
              className="block w-full cursor-pointer bg-transparent text-left transition-opacity hover:opacity-90"
              style={travelCardRadiusStyle}
            >
              <TravelCardPreview
                photoUrl={card.photoUrl}
                title={card.title}
                date={card.date}
                locationLabel={card.locationLabel}
                frameType={card.frameType}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
