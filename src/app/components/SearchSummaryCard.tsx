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

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          {hasDestination && (
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
              <span className="text-[#2a2a2a]">{destination}</span>
            </div>
          )}
          {hasDateRange && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
              <span className="text-sm text-[#5a5a5a]">{dateRange}</span>
            </div>
          )}
          {hasPeople && (
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
              <span className="text-sm text-[#5a5a5a]">{people}</span>
            </div>
          )}
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
