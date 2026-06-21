import { Heart, MessageCircle } from 'lucide-react';
import type { StoryItem } from './storyTypes';

interface StoryCardProps {
  story: StoryItem;
  onClick: (story: StoryItem) => void;
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
  isLiked = false,
  likeCount = story.likes,
  commentCount = story.comments,
  onToggleLike,
  onOpenComments,
  metadataMode = 'engagement',
}: StoryCardProps) {
  const showEngagement = metadataMode === 'engagement';
  const cardStyle = {
    width: '100%',
    height: 'auto',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.055)',
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
      className="rounded-2xl overflow-hidden text-left transition-opacity hover:opacity-90"
      style={cardStyle}
    >
      <div className="relative h-[140px]">
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
        <p
          className={`${showEngagement ? 'mb-1.5' : ''} text-[11px] text-[#5F6368] leading-snug`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {metadataMode === 'history'
            ? `${story.region} · ${story.author}의 시선`
            : (story.body || story.author)}
        </p>
        {showEngagement && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleLike?.(story);
              }}
              className={`flex items-center gap-1 text-[10px] transition-colors ${isLiked ? 'text-[#7fb894]' : 'text-[#5F6368]'}`}
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
              className="flex items-center gap-1 text-[10px] text-[#5F6368] transition-colors hover:text-[#6fa985]"
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
