import { X, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function DatePickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialStartDate,
  initialEndDate,
}: DatePickerModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  useBottomSheetScrollLock(isOpen);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(startDate, endDate);
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        className="bottom-sheet-panel fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] z-50 max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up"
        data-bottom-sheet-scrollable="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-black/5 flex items-center justify-between z-10">
          <h3>여행 일정</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-6 pb-safe space-y-6">
          {/* Start Date */}
          <div>
            <label className="block text-sm text-[#5a5a5a] mb-3">출발일</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-[#f8f8f5] border border-transparent focus:border-[#a8d5ba] focus:bg-white outline-none transition-colors"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999] pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm text-[#5a5a5a] mb-3">도착일</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-4 rounded-2xl bg-[#f8f8f5] border border-transparent focus:border-[#a8d5ba] focus:bg-white outline-none transition-colors"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999] pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          {/* Info */}
          {startDate && endDate && (
            <div className="bg-[#e8f5ed] rounded-2xl p-4">
              <p className="text-sm text-[#2a2a2a]">
                총 {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))}일
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!startDate || !endDate}
            className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            완료
          </button>
        </div>
      </div>
    </>
  );
}
