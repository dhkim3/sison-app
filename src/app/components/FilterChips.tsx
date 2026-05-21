import { useState } from 'react';

interface FilterChipsProps {
  filters: string[];
  selectedFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
}

export function FilterChips({ filters, selectedFilters = [], onFilterChange }: FilterChipsProps) {
  const [selected, setSelected] = useState<string[]>(selectedFilters);

  const toggleFilter = (filter: string) => {
    const newSelected = selected.includes(filter)
      ? selected.filter((f) => f !== filter)
      : [...selected, filter];
    setSelected(newSelected);
    onFilterChange?.(newSelected);
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {filters.map((filter) => {
        const isSelected = selected.includes(filter);
        return (
          <button
            key={filter}
            onClick={() => toggleFilter(filter)}
            className={`h-9 px-3.5 rounded-full text-[13px] whitespace-nowrap transition-all flex items-center ${
              isSelected
                ? 'bg-[#a8d5ba] text-white shadow-[0_1px_2px_rgba(168,213,186,0.2)]'
                : 'bg-white text-[#5a5a5a] border border-black/10 hover:border-[#a8d5ba]'
            }`}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
