import { MapPin, Calendar, Users, ChevronRight } from 'lucide-react';

interface SearchSummaryCardProps {
  destination: string;
  dateRange: string;
  people: string;
  onEdit?: () => void;
}

export function SearchSummaryCard({
  destination,
  dateRange,
  people,
  onEdit,
}: SearchSummaryCardProps) {
  const hasDestination = destination.trim().length > 0;
  const hasDateRange = dateRange.trim().length > 0;
  const hasPeople = people.trim().length > 0 && !/^0\s*명$/.test(people.trim());
  const summaryRows = [
    {
      icon: MapPin,
      label: hasDestination ? destination : '여행지 선택',
      isSelected: hasDestination,
      isPrimary: true,
    },
    {
      icon: Calendar,
      label: hasDateRange ? dateRange : '여행 일정 선택',
      isSelected: hasDateRange,
      isPrimary: false,
    },
    {
      icon: Users,
      label: hasPeople ? people : '인원 선택',
      isSelected: hasPeople,
      isPrimary: false,
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          {summaryRows.map(({ icon: Icon, label, isSelected, isPrimary }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon
                className={`w-4 h-4 ${isSelected ? 'text-[#5a5a5a]' : 'text-[#c7c7c1]'}`}
                strokeWidth={2}
              />
              <span
                className={
                  isPrimary && isSelected
                    ? 'text-[15px] text-[#2a2a2a]'
                    : `text-sm ${isSelected ? 'text-[#5a5a5a]' : 'text-[#aaa]'}`
                }
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="w-10 h-10 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
