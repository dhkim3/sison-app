import { useEffect, useState } from 'react';
import { Calendar, MapPin, Search, Users, X } from 'lucide-react';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';

interface SearchConditionsBottomSheetProps {
  isOpen: boolean;
  destination: string;
  dateRange: string;
  peopleCount: number;
  startDate: Date | null;
  endDate: Date | null;
  onClose: () => void;
  onApply: (values: {
    destination: string;
    dateRange: string;
    peopleCount: number;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
}

const formatFullDateRange = (start: Date, end: Date) =>
  `2026.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')} - 2026.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;

export function SearchConditionsBottomSheet({
  isOpen,
  destination,
  dateRange,
  peopleCount,
  startDate,
  endDate,
  onClose,
  onApply,
}: SearchConditionsBottomSheetProps) {
  const [draftDestination, setDraftDestination] = useState(destination);
  const [draftDateRange, setDraftDateRange] = useState(dateRange);
  const [draftPeopleCount, setDraftPeopleCount] = useState(peopleCount);
  const [draftStartDate, setDraftStartDate] = useState<Date | null>(startDate);
  const [draftEndDate, setDraftEndDate] = useState<Date | null>(endDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setDraftDestination(destination);
    setDraftDateRange(dateRange);
    setDraftPeopleCount(peopleCount);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
  }, [dateRange, destination, endDate, isOpen, peopleCount, startDate]);

  if (!isOpen) return null;

  const handleDateConfirm = (nextStartDate: Date, nextEndDate: Date) => {
    setDraftStartDate(nextStartDate);
    setDraftEndDate(nextEndDate);
    setDraftDateRange(formatFullDateRange(nextStartDate, nextEndDate));
  };

  const handleApply = () => {
    onApply({
      destination: draftDestination.trim(),
      dateRange: draftDateRange,
      peopleCount: draftPeopleCount,
      startDate: draftStartDate,
      endDate: draftEndDate,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[2rem] shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/95 backdrop-blur-sm">
          <h3 className="text-[17px] font-semibold text-[#2a2a2a]">검색 조건 수정</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 조건 수정 닫기"
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 pt-5 pb-safe space-y-4">
          <div>
            <p className="mb-2 text-[12px] font-medium text-[#999]">여행지</p>
            <div className="flex items-center gap-3 rounded-2xl bg-[#f8f8f5] px-4 py-3.5 border border-black/5">
              <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
              <input
                type="text"
                value={draftDestination}
                onChange={(event) => setDraftDestination(event.target.value)}
                placeholder="어디로 떠나시나요?"
                className="w-full bg-transparent outline-none text-[15px] text-[#2a2a2a] placeholder:text-[#aaa]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="w-full rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 py-3.5 text-left hover:bg-[#f0f0eb] transition-colors"
          >
            <span className="mb-1.5 block text-[12px] font-medium text-[#999]">여행 일정</span>
            <span className="flex items-center gap-2.5 text-[15px] text-[#2a2a2a]">
              <Calendar className="w-4 h-4 text-[#a8d5ba]" strokeWidth={2} />
              {draftDateRange || '일정을 선택해 주세요'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPeopleOpen(true)}
            className="w-full rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 py-3.5 text-left hover:bg-[#f0f0eb] transition-colors"
          >
            <span className="mb-1.5 block text-[12px] font-medium text-[#999]">인원</span>
            <span className="flex items-center gap-2.5 text-[15px] text-[#2a2a2a]">
              <Users className="w-4 h-4 text-[#a8d5ba]" strokeWidth={2} />
              {draftPeopleCount > 0 ? `${draftPeopleCount}명` : '인원을 선택해 주세요'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-2xl bg-[#2a2a2a] py-4 text-[15px] font-medium text-white hover:bg-[#1a1a1a] transition-colors"
          >
            이 조건으로 다시 찾기
          </button>
        </div>
      </div>

      <CalendarBottomSheet
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onConfirm={handleDateConfirm}
        initialStartDate={draftStartDate || undefined}
        initialEndDate={draftEndDate || undefined}
      />

      <PeopleCountModal
        isOpen={isPeopleOpen}
        onClose={() => setIsPeopleOpen(false)}
        onConfirm={setDraftPeopleCount}
        initialCount={draftPeopleCount || 1}
      />
    </>
  );
}
