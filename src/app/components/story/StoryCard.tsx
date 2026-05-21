import { Heart, MessageCircle } from 'lucide-react';
import type { StoryItem } from './storyTypes';

interface StoryCardProps {
  story: StoryItem;
  onClick: (story: StoryItem) => void;
  layout?: 'rail' | 'grid';
}

export function StoryCard({ story, onClick, layout = 'rail' }: StoryCardProps) {
  const cardStyle =
    layout === 'grid'
      ? {
          width: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        }
      : {
          width: '38vw',
          maxWidth: '160px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        };

  return (
    <button
      type="button"
      onClick={() => onClick(story)}
      className="flex-shrink-0 rounded-2xl overflow-hidden text-left transition-opacity hover:opacity-90"
      style={cardStyle}
    >
      <div className="relative" style={{ paddingBottom: '100%' }}>
        <img
          src={story.imageUrl}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: '12px 12px 0 0' }}
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
        <p className="text-[11px] text-[#999] mb-2">{story.author}</p>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[10px] text-[#999]">
            <Heart className="w-3 h-3" />
            {story.likes}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#999]">
            <MessageCircle className="w-3 h-3" />
            {story.comments}
          </span>
        </div>
      </div>
    </button>
  );
}
