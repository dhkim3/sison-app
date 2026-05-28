import { X, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface PeopleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (count: number) => void;
  initialCount?: number;
}

export function PeopleCountModal({
  isOpen,
  onClose,
  onConfirm,
  initialCount = 1,
}: PeopleCountModalProps) {
  const [count, setCount] = useState(initialCount);
  useBottomSheetScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    setCount(initialCount);
  }, [initialCount, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(count);
    onClose();
  };

  const increment = () => setCount(Math.min(count + 1, 10));
  const decrement = () => setCount(Math.max(count - 1, 1));

  return (
    <>
      {/* iOS Safari: split backdrop-blur from click target */}
      <div className="bottom-sheet-viewport z-40 bg-black/40 backdrop-blur-sm pointer-events-none" />
      <div className="bottom-sheet-viewport z-40" onClick={onClose} />

      <div className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="z-10 flex flex-shrink-0 items-center justify-between border-b border-black/5 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <h3>인원</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div
          className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto px-6 py-8 pb-safe"
          data-bottom-sheet-scrollable="true"
        >
          {/* Counter */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#2a2a2a] mb-1">참여 인원</p>
              <p className="text-sm text-[#999]">최대 10명까지 선택 가능</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={decrement}
                disabled={count <= 1}
                className="w-10 h-10 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#e8f5ed] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              </button>

              <div className="w-12 text-center">
                <span className="text-2xl text-[#2a2a2a]">{count}</span>
              </div>

              <button
                type="button"
                onClick={increment}
                disabled={count >= 10}
                className="w-10 h-10 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#e8f5ed] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]"
          >
            완료
          </button>
        </div>
      </div>
    </>
  );
}
