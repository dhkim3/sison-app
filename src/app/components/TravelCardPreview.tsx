import { forwardRef, type CSSProperties } from 'react';
import { getCompactLocationLabel, travelCardRadiusStyle } from './travelCardStyles';

type TravelCardFrameType = '기본' | '바다' | '숲' | '노을' | '블랙' | 'AI' | string | undefined;

interface TravelCardPreviewProps {
  photoUrl: string;
  title: string;
  date: string;
  locationLabel?: string;
  frameType?: TravelCardFrameType;
  aiFrameBackgroundUrl?: string | null;
  showAiFrameAnimation?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const getTravelCardFrameStyle = (frameType: TravelCardFrameType): CSSProperties => {
  switch (frameType) {
    case '바다':
      return { background: 'linear-gradient(to bottom right, #eff6ff, #ecfeff)' };
    case '숲':
      return { background: 'linear-gradient(to bottom right, #f0fdf4, #ecfdf5)' };
    case '노을':
      return { background: 'linear-gradient(to bottom right, #fff7ed, #fdf2f8)' };
    case '블랙':
      return { background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)' };
    case 'AI':
      return { background: 'linear-gradient(180deg, #fdfcfa 0%, #f8f8f5 100%)' };
    default:
      return { background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf8 100%)' };
  }
};

export const TravelCardPreview = forwardRef<HTMLDivElement, TravelCardPreviewProps>(function TravelCardPreview({
  photoUrl,
  title,
  date,
  locationLabel,
  frameType,
  aiFrameBackgroundUrl,
  showAiFrameAnimation = false,
  className = '',
  style,
}, ref) {
  const isDarkFrame = frameType === '블랙';
  const compactLocation = getCompactLocationLabel(locationLabel) || locationLabel;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${className}`}
      style={{ ...travelCardRadiusStyle, ...getTravelCardFrameStyle(frameType), ...style }}
    >
      {aiFrameBackgroundUrl && (
        <img
          src={aiFrameBackgroundUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill [-webkit-user-drag:none]"
          style={travelCardRadiusStyle}
        />
      )}

      <div className="relative z-10 mb-3">
        <div
          className="aspect-[3/4] overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          style={travelCardRadiusStyle}
        >
          <img
            src={photoUrl}
            alt="Travel memory"
            className="h-full w-full object-cover"
            style={travelCardRadiusStyle}
          />
        </div>
      </div>

      {showAiFrameAnimation && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[25] ai-frame-preview-aurora-border"
          style={travelCardRadiusStyle}
        />
      )}

      <div className="relative z-20">
        <div className="px-1.5">
          <p className={`truncate text-[13px] font-semibold leading-snug ${isDarkFrame ? 'text-white' : 'text-[#2a2a2a]'}`}>
            {title}
          </p>
          <div className="mt-3 space-y-1">
            {compactLocation && (
              <p className={`truncate text-[11px] font-medium leading-[1.35] ${isDarkFrame ? 'text-white/80' : 'text-[#6f6f6f]'}`}>
                {compactLocation}
              </p>
            )}
            <p className={`truncate text-[11px] font-normal leading-[1.35] ${isDarkFrame ? 'text-white/50' : 'text-[#b6b6b6]'}`}>
              {date}
            </p>
          </div>
          <div className={`mt-3 border-t pt-2 ${isDarkFrame ? 'border-white/15' : 'border-black/10'}`}>
            <p className={`text-center text-[11px] opacity-70 ${isDarkFrame ? 'text-white' : 'text-[#5F6368]'}`}>
              시선
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
