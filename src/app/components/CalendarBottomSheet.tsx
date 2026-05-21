import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CalendarBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export function CalendarBottomSheet({
  isOpen,
  onClose,
  onConfirm,
  initialStartDate,
  initialEndDate,
}: CalendarBottomSheetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate || null);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null);

  if (!isOpen) return null;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else if (date < startDate) {
      // Clicked before start date, make it the new start
      setStartDate(date);
      setEndDate(null);
    } else {
      // Set end date
      setEndDate(date);
    }
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !date) return false;
    if (!endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isStartDate = (date: Date) => {
    return startDate && date.toDateString() === startDate.toDateString();
  };

  const isEndDate = (date: Date) => {
    return endDate && date.toDateString() === endDate.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(startDate, endDate);
      onClose();
    }
  };

  const getTripSummary = () => {
    if (!startDate || !endDate) return null;

    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const days = nights + 1;

    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[date.getDay()];
      return `${month}월 ${day}일(${weekday})`;
    };

    return `${formatDate(startDate)} ~ ${formatDate(endDate)} · ${nights}박 ${days}일`;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] z-50 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-black/5 flex items-center justify-between z-10">
          <h3>여행 일정</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-6 pb-safe">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#e8f5ed] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            </button>

            <h3 className="text-[#2a2a2a]">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>

            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#e8f5ed] transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center text-xs py-2 ${
                  index === 0 ? 'text-[#ff6b6b]' : index === 6 ? 'text-[#4a90e2]' : 'text-[#999]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isStart = isStartDate(date);
              const isEnd = isEndDate(date);
              const inRange = isDateInRange(date);
              const isPast = isPastDate(date);
              const isSunday = date.getDay() === 0;
              const isSaturday = date.getDay() === 6;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isPast && handleDateClick(date)}
                  disabled={isPast}
                  className={`
                    aspect-square rounded-full flex items-center justify-center text-sm transition-all
                    ${isPast ? 'text-[#e0e0e0] cursor-not-allowed' : ''}
                    ${isStart || isEnd ? 'bg-[#a8d5ba] text-white shadow-sm' : ''}
                    ${inRange && !isStart && !isEnd ? 'bg-[#e8f5ed] text-[#2a2a2a]' : ''}
                    ${!inRange && !isStart && !isEnd && !isPast ? 'hover:bg-[#f8f8f5] text-[#2a2a2a]' : ''}
                    ${!isPast && isSunday && !isStart && !isEnd && !inRange ? 'text-[#ff6b6b]' : ''}
                    ${!isPast && isSaturday && !isStart && !isEnd && !inRange ? 'text-[#4a90e2]' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Trip Summary */}
          {getTripSummary() && (
            <div className="bg-[#e8f5ed] rounded-2xl p-4 mb-4">
              <p className="text-sm text-[#2a2a2a] text-center">
                {getTripSummary()}
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <button
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
