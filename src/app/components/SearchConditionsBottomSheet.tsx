import { useEffect, useState } from 'react';
import { Calendar, MapPin, Search, Users, X } from 'lucide-react';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { PeopleCountModal } from './PeopleCountModal';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

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
  useBottomSheetScrollLock(isOpen);

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

  const handleDateClear = () => {
    setDraftStartDate(null);
    setDraftEndDate(null);
    setDraftDateRange('');
  };

  const handlePeopleClear = () => {
    setDraftPeopleCount(0);
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
      {/* iOS Safari: backdrop-filter can intercept touches — split into blur layer + click target */}
      <div className="bottom-sheet-viewport z-40 bg-black/35 backdrop-blur-sm pointer-events-none" />
      <div className="bottom-sheet-viewport z-40" onClick={onClose} />

      <div className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[430px] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl animate-slide-up">
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-black/5 bg-white/95 backdrop-blur-sm">
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

        <div className="bottom-sheet-scrollable min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-safe space-y-4" data-bottom-sheet-scrollable="true">
          <div>
            <p className="mb-2 text-[12px] font-medium text-[#5F6368]">여행지</p>
            <div className="flex h-[52px] items-center gap-3 rounded-2xl bg-[#f8f8f5] px-4 border border-black/5">
              <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
              <input
                type="text"
                value={draftDestination}
                onChange={(event) => setDraftDestination(event.target.value)}
                placeholder="어디로 떠나시나요?"
                className="w-full bg-transparent outline-none text-[15px] text-[#2a2a2a] placeholder:text-[#7A7F87]"
              />
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsCalendarOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsCalendarOpen(true);
              }
            }}
            className="flex h-[72px] w-full cursor-pointer flex-col justify-center rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 text-left hover:bg-[#f0f0eb] transition-colors"
          >
            <span className="mb-1.5 block text-[12px] font-medium text-[#5F6368]">일정</span>
            <span className="flex items-center gap-2.5 text-[15px] text-[#2a2a2a]">
              <Calendar className="w-4 h-4 text-[#a8d5ba]" strokeWidth={2} />
              <span className="min-w-0 flex-1 break-words">
                {draftDateRange || '일정을 선택해 주세요'}
              </span>
              {draftDateRange && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDateClear();
                  }}
                  aria-label="일정 초기화"
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#7A7F87] transition-colors hover:text-[#777] active:scale-95"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsPeopleOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsPeopleOpen(true);
              }
            }}
            className="flex h-[72px] w-full flex-col justify-center rounded-2xl bg-[#f8f8f5] border border-black/5 px-4 text-left hover:bg-[#f0f0eb] transition-colors"
          >
            <span className="mb-1.5 block text-[12px] font-medium text-[#5F6368]">인원</span>
            <span className="flex items-center gap-2.5 text-[15px] text-[#2a2a2a]">
              <Users className="w-4 h-4 text-[#a8d5ba]" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">
                {draftPeopleCount > 0 ? `${draftPeopleCount}명` : '인원을 선택해 주세요'}
              </span>
              {draftPeopleCount > 0 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePeopleClear();
                  }}
                  aria-label="인원 초기화"
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-[#7A7F87] transition-colors hover:text-[#777] active:scale-95"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </span>
          </div>

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
