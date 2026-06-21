import { useEffect, useState } from 'react';
import { MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import type { StoryComment } from '../../storyInteractionState';
import type { StoryItem } from './storyTypes';
import { useBottomSheetScrollLock } from '../useBottomSheetScrollLock';

interface StoryCommentSheetProps {
  story: StoryItem | null;
  isOpen: boolean;
  comments: StoryComment[];
  onClose: () => void;
  onAddComment: (body: string) => void;
  onUpdateComment?: (commentId: number, body: string) => void;
  onDeleteComment?: (commentId: number) => void;
}

export function StoryCommentSheet({
  story,
  isOpen,
  comments,
  onClose,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: StoryCommentSheetProps) {
  const [draftComment, setDraftComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  useBottomSheetScrollLock(isOpen && Boolean(story));

  useEffect(() => {
    if (!isOpen) return;

    setEditingCommentId(null);
    setEditingBody('');
    setDeleteConfirmId(null);
  }, [isOpen, story?.id]);

  if (!isOpen || !story) return null;

  const handleSubmit = () => {
    const nextComment = draftComment.trim();
    if (!nextComment) return;

    onAddComment(nextComment);
    setDraftComment('');
  };

  const startEdit = (comment: StoryComment) => {
    setDeleteConfirmId(null);
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingBody('');
  };

  const saveEdit = (commentId: number) => {
    const nextBody = editingBody.trim();
    if (!nextBody) return;

    onUpdateComment?.(commentId, nextBody);
    cancelEdit();
  };

  const askDelete = (commentId: number) => {
    setEditingCommentId(null);
    setEditingBody('');
    setDeleteConfirmId((currentId) => (currentId === commentId ? null : commentId));
  };

  const deleteComment = (commentId: number) => {
    onDeleteComment?.(commentId);
    setDeleteConfirmId(null);
  };

  return (
    <>
      {/* iOS Safari: split backdrop-blur from click target */}
      <div className="bottom-sheet-viewport z-40 bg-black/30 backdrop-blur-sm animate-fade-in pointer-events-none" />
      <div className="bottom-sheet-viewport z-40" onClick={onClose} />

      <div className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-[#fdfcfa] shadow-2xl animate-slide-up">
        <div className="flex-shrink-0 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#dedbd3]" />
        </div>

        <div className="flex flex-shrink-0 items-start justify-between px-6 pb-4 pt-5">
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

        <div
          className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto px-6 pb-4"
          data-bottom-sheet-scrollable="true"
        >
          {comments.length > 0 ? (
            <div className="space-y-3 border-t border-black/5 pt-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl bg-white px-4 py-3.5 border border-black/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="text-[13px] font-medium text-[#2a2a2a]">{comment.author}</p>
                      {comment.edited && <p className="text-[10.5px] text-[#b0aca5]">수정됨</p>}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <p className="text-[11px] text-[#b0aca5]">{comment.time}</p>
                      {comment.author === '나' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            aria-label="댓글 수정"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#7A7F87] transition-colors hover:bg-[#f8f8f5] hover:text-[#777]"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
                          </button>
                          <button
                            type="button"
                            onClick={() => askDelete(comment.id)}
                            aria-label="댓글 삭제"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#7A7F87] transition-colors hover:bg-[#f8f8f5] hover:text-[#777]"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-xl border border-black/5 bg-[#f8f8f5] px-3 py-2.5 text-[13px] leading-6 text-[#2a2a2a] outline-none placeholder:text-[#9AA0A6] focus:bg-white focus:ring-1 focus:ring-[#a8d5ba]/45"
                      />
                      <div className="mt-2 flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#5F6368] transition-colors hover:bg-[#f8f8f5]"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(comment.id)}
                          disabled={!editingBody.trim()}
                          className="rounded-full bg-[#f8f8f5] px-3 py-1.5 text-[12px] font-medium text-[#5a5a5a] transition-colors hover:bg-[#e8f5ed] disabled:text-[#9AA0A6]"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[13px] leading-6 text-[#666]">{comment.body}</p>
                  )}
                  {deleteConfirmId === comment.id && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#f8f8f5] px-3 py-2.5">
                      <p className="text-[12px] text-[#777]">이 댓글을 지울까요?</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-[#5F6368] transition-colors hover:bg-white"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteComment(comment.id)}
                          className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#5a5a5a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f0f0eb]"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-black/5 py-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-[#d9d5cd]" strokeWidth={1.6} />
              <p className="mt-3 text-[13px] text-[#5F6368]">아직 남겨진 댓글이 없어요</p>
              <p className="mt-1 text-[12px] text-[#9AA0A6]">조용한 감상을 먼저 남겨보세요</p>
            </div>
          )}
        </div>

        <div className="bottom-sheet-keyboard-padding flex-shrink-0 border-t border-black/5 bg-[#fdfcfa]/95 px-5 py-4">
          <div className="flex items-end gap-2">
            <textarea
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              rows={1}
              placeholder="따뜻한 감상을 남겨보세요"
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-black/5 bg-white px-4 py-3 text-[13px] leading-5 text-[#2a2a2a] outline-none placeholder:text-[#9AA0A6] focus:ring-1 focus:ring-[#a8d5ba]/50"
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
