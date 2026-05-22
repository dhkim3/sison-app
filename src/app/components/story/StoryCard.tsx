import { Heart, MessageCircle } from 'lucide-react';
import type { StoryItem } from './storyTypes';

interface StoryCardProps {
  story: StoryItem;
  onClick: (story: StoryItem) => void;
  layout?: 'rail' | 'grid';
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  onToggleLike?: (story: StoryItem) => void;
  onOpenComments?: (story: StoryItem) => void;
  metadataMode?: 'engagement' | 'history';
}

export function StoryCard({
  story,
  onClick,
  layout = 'rail',
  isLiked = false,
  likeCount = story.likes,
  commentCount = story.comments,
  onToggleLike,
  onOpenComments,
  metadataMode = 'engagement',
}: StoryCardProps) {
  const isGrid = layout === 'grid';
  const showEngagement = metadataMode === 'engagement';
  const cardStyle = isGrid
    ? {
        width: '100%',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.055)',
      }
    : {
        width: '38vw',
        maxWidth: '160px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(story)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(story);
        }
      }}
      className={`${isGrid ? '' : 'flex-shrink-0'} rounded-2xl overflow-hidden text-left transition-opacity hover:opacity-90`}
      style={cardStyle}
    >
      <div className="relative" style={{ height: isGrid ? '140px' : undefined, paddingBottom: isGrid ? undefined : '100%' }}>
        <img
          src={story.imageUrl}
          alt={story.title}
          className="w-full h-full object-cover"
          style={{ borderRadius: '12px 12px 0 0', display: 'block' }}
        />
        <span
          className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            color: '#2a2a2a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
          }}
        >
          {story.region}
        </span>
      </div>

      <div className="px-2.5 pt-2 pb-2.5">
        <p
          className="text-[13px] font-semibold text-[#2a2a2a] leading-snug mb-0.5"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.title}
        </p>
        <p className={`${showEngagement && (isGrid ? 'mb-1.5' : 'mb-2')} text-[11px] text-[#999]`}>
          {metadataMode === 'history' ? `${story.region} · ${story.author}의 시선` : story.author}
        </p>
        {showEngagement && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleLike?.(story);
              }}
              className={`flex items-center gap-1 text-[10px] transition-colors ${isLiked ? 'text-[#7fb894]' : 'text-[#999]'}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-[#a8d5ba]' : ''}`} strokeWidth={1.8} />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenComments?.(story);
              }}
              className="flex items-center gap-1 text-[10px] text-[#999] transition-colors hover:text-[#6fa985]"
            >
              <MessageCircle className="w-3 h-3" strokeWidth={1.8} />
              {commentCount}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
