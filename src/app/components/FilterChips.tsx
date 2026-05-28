import { SlidersHorizontal } from 'lucide-react';

interface FilterChipsProps {
  filters?: string[];
  selectedFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
  onOpen?: () => void;
}

export function FilterChips({ selectedFilters = [], onOpen }: FilterChipsProps) {
  const filterLabel =
    selectedFilters.length === 0
      ? '필터'
      : selectedFilters.length === 1
        ? selectedFilters[0]
        : `${selectedFilters[0]} 외 ${selectedFilters.length - 1}개`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`inline-flex h-10 max-w-full items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors ${
        selectedFilters.length > 0
          ? 'border-[#a8d5ba]/65 bg-[#e8f5ed] text-[#4f8d67]'
          : 'border-black/10 bg-white text-[#5a5a5a] hover:border-[#a8d5ba]'
      }`}
    >
      <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
      <span className="truncate">{filterLabel}</span>
    </button>
  );
}
