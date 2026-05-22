import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SortDropdownProps {
  options: string[];
  defaultOption?: string;
  onSelect?: (option: string) => void;
}

export function SortDropdown({ options, defaultOption, onSelect }: SortDropdownProps) {
  const [selected, setSelected] = useState(defaultOption || options[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    setSelected(option);
    setIsOpen(false);
    onSelect?.(option);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center gap-1 px-1 text-[12px] font-medium text-[#999] transition-colors hover:text-[#6f8b78] whitespace-nowrap"
      >
        <span>{selected}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5 overflow-hidden z-20 min-w-[140px]">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-[#f8f8f5] transition-colors ${
                  option === selected ? 'text-[#a8d5ba] font-medium' : 'text-[#5a5a5a]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
