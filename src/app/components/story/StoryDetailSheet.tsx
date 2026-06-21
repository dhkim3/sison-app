import { useEffect, useState } from 'react';
import { Heart, MessageCircle, MapPin, Sparkles, Trash2, X } from 'lucide-react';
import type { StoryComment } from '../../storyInteractionState';
import type { StoryItem } from './storyTypes';
import { useBottomSheetScrollLock } from '../useBottomSheetScrollLock';

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
  onDeleteComment?: (story: StoryItem, commentId: number) => void;
  onCreateCard?: (story: StoryItem) => void;
  onDelete?: (story: StoryItem) => void;
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
  onDeleteComment,
  onCreateCard,
  onDelete,
}: StoryDetailSheetProps) {
  const [visibleCommentCount, setVisibleCommentCount] = useState(2);
  const [draftComment, setDraftComment] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  useBottomSheetScrollLock(isOpen && Boolean(story));

  useEffect(() => {
    if (!story) return;

    setVisibleCommentCount(2);
    setDraftComment('');
    setIsDeleteConfirmOpen(false);
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

  const handleDelete = () => {
    onDelete?.(story);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <>
      {/* iOS Safari: split backdrop-blur from click target */}
      <div className="bottom-sheet-viewport z-40 bg-black/35 backdrop-blur-sm pointer-events-none" />
      <div className="bottom-sheet-viewport z-40" onClick={onClose} />

      <div
        className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl animate-slide-up"
      >
        <div className="z-10 flex flex-shrink-0 flex-col border-b border-black/5 bg-white/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#5F6368]">
              <MapPin className="w-3.5 h-3.5 text-[#c9897e]" strokeWidth={2} />
              <span>{story.region}</span>
            </div>
            <div className="flex items-center gap-2">
              {story.isMine && onCreateCard && (
                <button
                  type="button"
                  onClick={() => onCreateCard(story)}
                  className="flex items-center gap-1.5 rounded-full bg-[#efecfc] px-3 py-1.5 text-[12px] font-medium text-[#5a56d0] transition-colors hover:bg-[#e5e1fa]"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  AI 카드 제작
                </button>
              )}
              {story.isMine && onDelete && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen((isOpen) => !isOpen)}
                  aria-label="스토리 삭제"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f8f5] transition-colors hover:bg-[#f0f0eb]"
                >
                  <Trash2 className="h-4.5 w-4.5 text-[#777]" strokeWidth={1.8} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="스토리 상세 닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f8f5] transition-colors hover:bg-[#f0f0eb]"
              >
                <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {isDeleteConfirmOpen && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#f8f8f5] px-3.5 py-3">
              <p className="text-[12.5px] text-[#777]">이 스토리를 삭제할까요?</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#5F6368] transition-colors hover:bg-white"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#5a5a5a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f0f0eb]"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto pb-safe"
          data-bottom-sheet-scrollable="true"
        >
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
            <p className="mb-2 text-[13px] text-[#5F6368]">{story.author}의 시선</p>
            <h3 className="text-[21px] font-semibold leading-snug text-[#2a2a2a]">{story.title}</h3>

            <p className="mt-4 text-[15px] leading-7 text-[#5a5a5a]">{story.body}</p>

            {(story.activityTitle || story.relatedActivity || story.location || story.activityDate) && (
              <div className="mt-4 rounded-2xl bg-[#f8f8f5] px-4 py-3">
                {(story.activityTitle || story.relatedActivity) && (
                  <p className="text-[13px] font-medium text-[#4f5f54]">
                    {story.activityTitle ?? story.relatedActivity}
                  </p>
                )}
                {(story.location || story.activityDate) && (
                  <p className="mt-1 text-[12px] leading-5 text-[#8d8982]">
                    {[story.location, story.activityDate].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-[12px]">
              <button
                type="button"
                onClick={() => onToggleLike?.(story)}
                className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-[#7fb894]' : 'text-[#c0c0bc]'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#a8d5ba]' : ''}`} strokeWidth={1.6} />
                {likeCount ?? story.likes}
              </button>
              <button
                type="button"
                onClick={() => onOpenComments?.(story)}
                className="flex items-center gap-1.5 text-[#c0c0bc] transition-colors hover:text-[#6fa985]"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.6} />
                {commentCount ?? story.comments}
              </button>
            </div>

            <section className="mt-5 border-t border-black/5 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-[#2a2a2a]">댓글</h4>
                <span className="text-[12px] text-[#7A7F87]">{commentCount ?? comments.length}</span>
              </div>

              {visibleComments.length > 0 ? (
                <div className="space-y-3">
                  {visibleComments.map((comment) => (
                    <div key={comment.id} className="border-b border-black/[0.04] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-medium text-[#2a2a2a]">{comment.author}</p>
                        {comment.time && <p className="text-[11px] text-[#b0aca5]">{comment.time}</p>}
                        {comment.isMine && onDeleteComment && (
                          <button
                            type="button"
                            onClick={() => onDeleteComment(story, comment.id)}
                            className="ml-auto text-[11px] text-[#b8867e] transition-opacity hover:opacity-70"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-6 text-[#666]">{comment.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f8f8f5] px-4 py-5 text-center">
                  <p className="text-[13px] text-[#5F6368]">아직 남겨진 댓글이 없어요</p>
                  <p className="mt-1 text-[12px] text-[#9AA0A6]">조용한 감상을 먼저 남겨보세요</p>
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
                  className="min-h-[42px] flex-1 resize-none rounded-2xl border border-black/5 bg-[#f8f8f5] px-4 py-3 text-[13px] leading-5 text-[#2a2a2a] outline-none placeholder:text-[#9AA0A6] focus:bg-white focus:ring-1 focus:ring-[#a8d5ba]/45"
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
