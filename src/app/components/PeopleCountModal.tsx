import { X, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

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

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(count);
    onClose();
  };

  const increment = () => setCount(Math.min(count + 1, 10));
  const decrement = () => setCount(Math.max(count - 1, 1));

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] z-50 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-black/5 flex items-center justify-between z-10">
          <h3>인원</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-8 pb-safe">
          {/* Counter */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#2a2a2a] mb-1">참여 인원</p>
              <p className="text-sm text-[#999]">최대 10명까지 선택 가능</p>
            </div>

            <div className="flex items-center gap-4">
              <button
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
