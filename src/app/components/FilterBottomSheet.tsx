import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface FilterBottomSheetProps {
  isOpen: boolean;
  options: string[];
  selectedFilters: string[];
  onClose: () => void;
  onApply: (filters: string[]) => void;
}

export function FilterBottomSheet({
  isOpen,
  options,
  selectedFilters,
  onClose,
  onApply,
}: FilterBottomSheetProps) {
  const [draftFilters, setDraftFilters] = useState<string[]>(selectedFilters);
  useBottomSheetScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    setDraftFilters(selectedFilters);
  }, [isOpen, selectedFilters]);

  if (!isOpen) return null;

  const toggleFilter = (filter: string) => {
    setDraftFilters((currentFilters) =>
      currentFilters.includes(filter)
        ? currentFilters.filter((item) => item !== filter)
        : [...currentFilters, filter],
    );
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  const handleReset = () => {
    setDraftFilters([]);
  };

  return (
    <>
      {/* iOS Safari: backdrop-filter can intercept touches — split into blur layer + click target */}
      <div className="bottom-sheet-viewport z-40 bg-black/30 backdrop-blur-sm pointer-events-none" />
      <div className="bottom-sheet-viewport z-40" onClick={onClose} />

      <div className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl animate-slide-up">
        <div className="flex flex-shrink-0 items-start justify-between border-b border-black/5 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h3 className="text-[17px] font-semibold text-[#2a2a2a]">활동 분류</h3>
            <p className="mt-1 text-[12.5px] text-[#999]">관심 있는 활동 유형을 골라보세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="활동 분류 닫기"
            className="ml-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#f8f8f5] transition-colors hover:bg-[#f0f0eb]"
          >
            <X className="h-5 w-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div
          className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto px-6 py-5 pb-safe"
          data-bottom-sheet-scrollable="true"
        >
          <div className="flex flex-wrap gap-2.5">
            {options.map((option) => {
              const isSelected = draftFilters.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleFilter(option)}
                  className={`rounded-full border px-3.5 py-2 text-[13px] leading-none transition-colors ${
                    isSelected
                      ? 'border-[#a8d5ba]/70 bg-[#e8f5ed] text-[#4f8d67] shadow-[0_1px_2px_rgba(168,213,186,0.16)]'
                      : 'border-black/10 bg-[#fdfcfa] text-[#5a5a5a] hover:border-[#a8d5ba]/70 hover:bg-[#f8f8f5]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="h-12 rounded-2xl bg-[#f8f8f5] px-5 text-[14px] font-medium text-[#777] transition-colors hover:bg-[#f0f0eb]"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-12 flex-1 rounded-2xl bg-[#2a2a2a] text-[15px] font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              필터 적용
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
