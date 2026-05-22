import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { StoryComment } from '../../storyInteractionState';
import type { StoryItem } from './storyTypes';

interface StoryCommentSheetProps {
  story: StoryItem | null;
  isOpen: boolean;
  comments: StoryComment[];
  onClose: () => void;
  onAddComment: (body: string) => void;
}

export function StoryCommentSheet({
  story,
  isOpen,
  comments,
  onClose,
  onAddComment,
}: StoryCommentSheetProps) {
  const [draftComment, setDraftComment] = useState('');

  if (!isOpen || !story) return null;

  const handleSubmit = () => {
    const nextComment = draftComment.trim();
    if (!nextComment) return;

    onAddComment(nextComment);
    setDraftComment('');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] overflow-hidden rounded-t-[2rem] bg-[#fdfcfa] shadow-2xl animate-slide-up">
        <div className="pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#dedbd3]" />
        </div>

        <div className="flex items-start justify-between px-6 pb-4 pt-5">
          <div>
            <h3 className="text-[20px] font-semibold leading-tight text-[#2a2a2a]">댓글</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8c8c8c]">
              {story.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="댓글 닫기"
            className="ml-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#5a5a5a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f6f5f0]"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[54vh] overflow-y-auto px-6 pb-4">
          {comments.length > 0 ? (
            <div className="space-y-3 border-t border-black/5 pt-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl bg-white px-4 py-3.5 border border-black/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-[#2a2a2a]">{comment.author}</p>
                    <p className="text-[11px] text-[#b0aca5]">{comment.time}</p>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-6 text-[#666]">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-black/5 py-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-[#d9d5cd]" strokeWidth={1.6} />
              <p className="mt-3 text-[13px] text-[#999]">아직 남겨진 댓글이 없어요</p>
              <p className="mt-1 text-[12px] text-[#bbb]">조용한 감상을 먼저 남겨보세요</p>
            </div>
          )}
        </div>

        <div className="border-t border-black/5 bg-[#fdfcfa]/95 px-5 py-4 pb-safe">
          <div className="flex items-end gap-2">
            <textarea
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              rows={1}
              placeholder="따뜻한 감상을 남겨보세요"
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-black/5 bg-white px-4 py-3 text-[13px] leading-5 text-[#2a2a2a] outline-none placeholder:text-[#bbb] focus:ring-1 focus:ring-[#a8d5ba]/50"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="h-11 rounded-2xl bg-[#2a2a2a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:bg-[#d8d5ce]"
              disabled={!draftComment.trim()}
            >
              남기기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
