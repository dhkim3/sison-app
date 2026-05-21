import { Heart, MessageCircle, MapPin, X } from 'lucide-react';
import type { StoryItem } from './storyTypes';

interface StoryDetailSheetProps {
  story: StoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StoryDetailSheet({ story, isOpen, onClose }: StoryDetailSheetProps) {
  if (!isOpen || !story) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] max-h-[86vh] overflow-y-auto bg-white rounded-t-[2rem] shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur-sm border-b border-black/5">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#999]">
            <MapPin className="w-3.5 h-3.5 text-[#c9897e]" strokeWidth={2} />
            <span>{story.region}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="스토리 상세 닫기"
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="pb-safe">
          <div className="px-5 pt-4">
            <div className="relative overflow-hidden rounded-3xl bg-[#f8f8f5]" style={{ aspectRatio: '1 / 1' }}>
              <img
                src={story.imageUrl}
                alt={story.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="px-6 pt-5 pb-6">
            <p className="mb-2 text-[13px] text-[#999]">{story.author}의 시선</p>
            <h3 className="text-[21px] font-semibold leading-snug text-[#2a2a2a]">{story.title}</h3>

            <p className="mt-4 text-[15px] leading-7 text-[#5a5a5a]">{story.body}</p>

            <div className="mt-5 flex items-center gap-4 text-[12px] text-[#999]">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#d8a29a]" strokeWidth={1.8} />
                {story.likes}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#a8d5ba]" strokeWidth={1.8} />
                {story.comments}
              </span>
            </div>

            {story.relatedActivity && (
              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 py-4 text-left hover:bg-[#eef7f2] transition-colors"
              >
                <span className="block text-[12px] font-medium text-[#999]">함께 보면 좋은 활동</span>
                <span className="mt-1 block text-[14px] font-medium text-[#2a2a2a]">{story.relatedActivity}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
