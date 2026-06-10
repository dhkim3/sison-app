import { Calendar, MapPin, Bookmark, Clock } from 'lucide-react';
import { formatActivityDate, getRecruitmentDeadlineLabel } from '../activityFormatters';

interface CompactActivityCardProps {
  imageUrl: string;
  title: string;
  location?: string;
  region?: string;
  time?: string;
  date?: string;
  recruitmentStartDate?: string;
  recruitmentEndDate?: string;
  badge?: string;
  isRecruiting?: boolean;
  isPastActivity?: boolean;
  showBookmark?: boolean;
  isSaved?: boolean;
  onBookmarkClick?: () => void;
  onClick?: () => void;
  variant?: 'default' | 'home' | 'searchResult' | 'aiRecommendation';
}

export function CompactActivityCard({
  imageUrl,
  title,
  location,
  region,
  time,
  date,
  recruitmentEndDate,
  isPastActivity = false,
  showBookmark = false,
  isSaved = false,
  onBookmarkClick,
  onClick,
  variant = 'default',
}: CompactActivityCardProps) {
  const dateTime = [formatActivityDate(date), time].filter(Boolean).join(' · ');
  const recruitmentMetadata = isPastActivity
    ? '지난 활동'
    : getRecruitmentDeadlineLabel(recruitmentEndDate);
  const isAIRecommendation = variant === 'aiRecommendation';
  const isHome = variant === 'home';
  const isSearchResult = variant === 'searchResult';
  const cardHeight = isSearchResult ? '126px' : isAIRecommendation ? '122px' : '118px';
  const imageWidth = isSearchResult ? '37%' : '38%';
  const contentClassName = isSearchResult
    ? 'flex-1 px-3.5 py-2.5 flex flex-col justify-center text-left min-w-0'
    : isHome
      ? 'flex-1 px-3.5 py-2.5 flex flex-col justify-center text-left min-w-0'
      : 'flex-1 px-3.5 py-3 flex flex-col justify-center text-left min-w-0';
  const metadataClassName = isSearchResult || isHome ? 'mt-2 space-y-1' : 'mt-2.5 space-y-1.5';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`w-full bg-white overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${
        isAIRecommendation
          ? 'rounded-[1.35rem] border border-[#e1e6f7] shadow-[0_12px_26px_rgba(80,96,145,0.08)] hover:shadow-[0_14px_30px_rgba(80,96,145,0.11)] hover:border-[#d8def3]'
          : 'rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-black/5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:border-transparent'
      }`}
      style={isHome ? { minHeight: cardHeight } : { height: cardHeight }}
    >
      <div className={`flex ${isHome ? 'min-h-[118px]' : 'h-full'}`}>
        {/* Image - Left Side */}
        <div className="relative flex-shrink-0 bg-[#f5f5f5]" style={{ width: imageWidth }}>
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {isPastActivity && (
            <div
              className="pointer-events-none absolute inset-0 bg-black/50"
              aria-hidden="true"
            />
          )}
          {showBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBookmarkClick?.();
              }}
              aria-label={isSaved ? '저장 취소' : '활동 저장'}
              className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white active:scale-95 transition-all"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#a8d5ba] text-[#7fb894]' : 'text-[#5a5a5a]'}`}
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {/* Content - Right Side */}
        <div className={contentClassName}>
          <div>
            {/* Title */}
            <h4 className="text-[15px] text-[#2a2a2a] font-medium line-clamp-2 leading-[1.3]">
              {title}
            </h4>
          </div>

          {/* Metadata */}
          <div className={metadataClassName}>
            {dateTime && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '15px minmax(0, 1fr)',
                  alignItems: 'center',
                  columnGap: 7,
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-[#a8d5ba]" strokeWidth={2} />
                <span className="text-[12.5px] text-[#8f8f8f] font-normal line-clamp-1 leading-[1.32]">
                  {dateTime}
                </span>
              </div>
            )}
            {(location || region) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '15px minmax(0, 1fr)',
                  alignItems: 'center',
                  columnGap: 7,
                }}
              >
                <MapPin className="w-3.5 h-3.5 text-[#cfa3a0]" strokeWidth={2} />
                <span className="text-[12.5px] text-[#8f8f8f] font-normal line-clamp-1 leading-[1.32]">
                  {location || region}
                </span>
              </div>
            )}
            {recruitmentMetadata && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '15px minmax(0, 1fr)',
                  alignItems: 'center',
                  columnGap: 7,
                }}
              >
                <Clock className="w-3 h-3 text-[#b7b2aa]" strokeWidth={1.8} />
                <span className="text-[12px] font-normal text-[#8f8f8f] line-clamp-1 leading-[1.32]">
                  {recruitmentMetadata}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
