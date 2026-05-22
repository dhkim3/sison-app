import { useEffect, useState } from 'react';
import { Heart, MessageCircle, MapPin, X } from 'lucide-react';
import type { StoryComment } from '../../storyInteractionState';
import type { StoryItem } from './storyTypes';

interface StoryDetailSheetProps {
  story: StoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  comments?: StoryComment[];
  onToggleLike?: (story: StoryItem) => void;
  onOpenComments?: (story: StoryItem) => void;
  onAddComment?: (story: StoryItem, body: string) => void;
}

export function StoryDetailSheet({
  story,
  isOpen,
  onClose,
  isLiked = false,
  likeCount,
  commentCount,
  comments = [],
  onToggleLike,
  onOpenComments,
  onAddComment,
}: StoryDetailSheetProps) {
  const [visibleCommentCount, setVisibleCommentCount] = useState(2);
  const [draftComment, setDraftComment] = useState('');

  useEffect(() => {
    if (!story) return;

    setVisibleCommentCount(2);
    setDraftComment('');
  }, [story?.id]);

  if (!isOpen || !story) return null;

  const visibleComments = comments.slice(0, visibleCommentCount);
  const hasMoreComments = visibleCommentCount < comments.length;

  const handleAddComment = () => {
    const nextComment = draftComment.trim();
    if (!nextComment) return;

    onAddComment?.(story, nextComment);
    setDraftComment('');
    setVisibleCommentCount((currentCount) => Math.max(currentCount, visibleComments.length + 1));
  };

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

            <div className="mt-5 flex items-center gap-3 text-[12px] text-[#999]">
              <button
                type="button"
                onClick={() => onToggleLike?.(story)}
                className={`flex items-center gap-1.5 rounded-full bg-[#f8f8f5] px-3 py-2 transition-colors ${isLiked ? 'text-[#7fb894]' : 'text-[#999]'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#a8d5ba]' : ''}`} strokeWidth={1.8} />
                {likeCount ?? story.likes}
              </button>
              <button
                type="button"
                onClick={() => onOpenComments?.(story)}
                className="flex items-center gap-1.5 rounded-full bg-[#f8f8f5] px-3 py-2 text-[#999] transition-colors hover:text-[#6fa985]"
              >
                <MessageCircle className="w-4 h-4 text-[#a8d5ba]" strokeWidth={1.8} />
                {commentCount ?? story.comments}
              </button>
            </div>

            <section className="mt-5 border-t border-black/5 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-[#2a2a2a]">댓글</h4>
                <span className="text-[12px] text-[#aaa]">{commentCount ?? comments.length}</span>
              </div>

              {visibleComments.length > 0 ? (
                <div className="space-y-3">
                  {visibleComments.map((comment) => (
                    <div key={comment.id} className="border-b border-black/[0.04] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-medium text-[#2a2a2a]">{comment.author}</p>
                        {comment.time && <p className="text-[11px] text-[#b0aca5]">{comment.time}</p>}
                      </div>
                      <p className="mt-1 text-[13px] leading-6 text-[#666]">{comment.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f8f8f5] px-4 py-5 text-center">
                  <p className="text-[13px] text-[#999]">아직 남겨진 댓글이 없어요</p>
                  <p className="mt-1 text-[12px] text-[#bbb]">조용한 감상을 먼저 남겨보세요</p>
                </div>
              )}

              {hasMoreComments && (
                <button
                  type="button"
                  onClick={() => setVisibleCommentCount((currentCount) => currentCount + 3)}
                  className="mt-3 text-[12px] font-medium text-[#7fb894] transition-opacity hover:opacity-75"
                >
                  댓글 더보기
                </button>
              )}

              <div className="mt-4 flex items-end gap-2">
                <textarea
                  value={draftComment}
                  onChange={(event) => setDraftComment(event.target.value)}
                  rows={1}
                  placeholder="조용한 시선을 남겨보세요"
                  className="min-h-[42px] flex-1 resize-none rounded-2xl border border-black/5 bg-[#f8f8f5] px-4 py-3 text-[13px] leading-5 text-[#2a2a2a] outline-none placeholder:text-[#bbb] focus:bg-white focus:ring-1 focus:ring-[#a8d5ba]/45"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!draftComment.trim()}
                  className="h-[42px] rounded-2xl bg-[#2a2a2a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:bg-[#d8d5ce]"
                >
                  남기기
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
