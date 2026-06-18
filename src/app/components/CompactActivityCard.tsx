import { Calendar, MapPin, Bookmark, Clock } from 'lucide-react';
import { getActivityDisplayDate, getRecruitmentDday, isPastActivity as getIsPastActivity } from '../activityFormatters';

interface CompactActivityCardProps {
  imageUrl: string;
  title: string;
  location?: string;
  region?: string;
  time?: string;
  date?: string;
  activityDate?: string;
  activityStartDate?: string;
  activityEndDate?: string;
  volunteerPeriod?: string;
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
  activityDate,
  activityStartDate,
  activityEndDate,
  volunteerPeriod,
  recruitmentEndDate,
  showBookmark = false,
  isSaved = false,
  onBookmarkClick,
  onClick,
  variant = 'default',
}: CompactActivityCardProps) {
  const activityDateInput = { date, activityDate, activityStartDate, activityEndDate, volunteerPeriod, time, recruitmentEndDate };
  const dateTime = [getActivityDisplayDate(activityDateInput, { compact: true }), time].filter(Boolean).join(' · ');
  const isPast = getIsPastActivity(activityDateInput);
  const recruitmentMetadata = getRecruitmentDday(activityDateInput);
  const isAIRecommendation = variant === 'aiRecommendation';
  const isSearchResult = variant === 'searchResult';
  // AI 추천 카드는 별도 영역 안에서 고정 높이를 유지하고, 일반 카드는 콘텐츠 높이에 맞춘다.
  const cardMinHeight = isAIRecommendation ? '122px' : '126px';
  const imageWidth = isSearchResult ? '37%' : '38%';
  const contentClassName = isAIRecommendation
    ? 'flex-1 px-3.5 py-3 flex flex-col justify-center text-left min-w-0'
    : 'flex-1 px-3.5 py-3 flex flex-col justify-center text-left min-w-0';
  const metadataClassName = isAIRecommendation ? 'mt-2.5 space-y-1.5' : 'mt-2 space-y-1';
  const cardHeight = isAIRecommendation ? cardMinHeight : '126px';

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
      style={{ height: cardHeight }}
    >
      <div className="flex h-full items-stretch">
        {/* Image - Left Side */}
        <div className="relative h-full min-h-0 flex-shrink-0 self-stretch overflow-hidden bg-[#f5f5f5]" style={{ width: imageWidth }}>
          <img
            src={imageUrl}
            alt={title}
            width={320}
            height={252}
            loading="eager"
            decoding="async"
            className="absolute inset-0 block h-full w-full object-cover object-center"
          />
          {isPast && (
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
