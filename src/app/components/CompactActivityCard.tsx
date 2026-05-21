import { Calendar, MapPin, Bookmark, Clock } from 'lucide-react';

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
  showBookmark?: boolean;
  onClick?: () => void;
}

export function CompactActivityCard({
  imageUrl,
  title,
  location,
  region,
  time,
  date,
  recruitmentEndDate,
  showBookmark = false,
  onClick,
}: CompactActivityCardProps) {
  const formatDate = (value?: string) => {
    if (!value) return '';

    const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
    if (!match) return value;

    return `${Number(match[2])}월 ${Number(match[3])}일`;
  };

  const dateTime = [formatDate(date), time].filter(Boolean).join(' · ');
  const recruitmentDeadline = recruitmentEndDate
    ? `${formatDate(recruitmentEndDate)} 모집 마감`
    : '';

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
      className="w-full bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-black/5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:border-transparent active:scale-[0.98] transition-all cursor-pointer"
      style={{ height: '118px' }}
    >
      <div className="flex h-full">
        {/* Image - Left Side */}
        <div className="relative flex-shrink-0 bg-[#f5f5f5]" style={{ width: '38%' }}>
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          {showBookmark && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#5a5a5a]" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 px-3.5 py-3 flex flex-col justify-center text-left min-w-0">
          <div>
            {/* Title */}
            <h4 className="text-[15px] text-[#2a2a2a] font-medium line-clamp-2 leading-[1.3]">
              {title}
            </h4>
          </div>

          {/* Metadata */}
          <div className="mt-2.5 space-y-1">
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
                <span className="text-[12.5px] text-[#555] font-medium line-clamp-1 leading-[1.32]">
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
                <span className="text-[12.5px] text-[#666] font-normal line-clamp-1 leading-[1.32]">
                  {location || region}
                </span>
              </div>
            )}
            {recruitmentDeadline && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  alignItems: 'center',
                  marginTop: 5,
                }}
              >
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#f8f8f5] px-2.5 py-1 text-[11px] text-[#9d9d9d] leading-none"
                  style={{ width: 'fit-content', maxWidth: '100%' }}
                >
                  <Clock className="w-3 h-3 flex-shrink-0 text-[#c8c5bd]" strokeWidth={1.8} />
                  <span className="line-clamp-1 leading-[1.2]">
                    {recruitmentDeadline}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
