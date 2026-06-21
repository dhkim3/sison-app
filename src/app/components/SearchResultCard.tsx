import { MapPin, Clock, Bookmark } from 'lucide-react';

interface SearchResultCardProps {
  imageUrl: string;
  title: string;
  location: string;
  distance: string;
  time: string;
  reason: string;
  isRecruiting: boolean;
  isSaved?: boolean;
  onBookmarkClick?: () => void;
  onClick?: () => void;
}

export function SearchResultCard({
  imageUrl,
  title,
  location,
  distance,
  time,
  reason,
  isRecruiting,
  isSaved = false,
  onBookmarkClick,
  onClick,
}: SearchResultCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="relative aspect-[16/10]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBookmarkClick?.();
          }}
          aria-label={isSaved ? '저장 취소' : '활동 저장'}
          className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white active:scale-95 transition-all"
        >
          <Bookmark
            className={`w-4 h-4 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="flex-1 pr-2">{title}</h3>
          {isRecruiting && (
            <span className="flex items-center gap-1 text-xs font-medium text-[#5f9f74] bg-[#e8f5ed] px-3 py-1 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 bg-[#6fa985] rounded-full" />
              모집중
            </span>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm font-normal text-[#5F6368]">
            <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
            <span>{location} · {distance}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-normal text-[#5F6368]">
            <Clock className="w-4 h-4 text-[#b8b2aa]" strokeWidth={2} />
            <span>{time}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-black/5">
          <p className="text-sm text-[#5a5a5a] leading-relaxed">
            <span className="text-xs text-[#5F6368] block mb-1">추천 이유</span>
            "{reason}"
          </p>
        </div>
      </div>
    </div>
  );
}
