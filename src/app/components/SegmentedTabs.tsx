import { useEffect, useState } from 'react';

interface SegmentedTabsProps {
  tabs: string[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export function SegmentedTabs({ tabs, activeTab = 0, onTabChange }: SegmentedTabsProps) {
  const [active, setActive] = useState(activeTab);

  useEffect(() => {
    setActive(activeTab);
  }, [activeTab]);

  const handleTabChange = (index: number) => {
    setActive(index);
    onTabChange?.(index);
  };

  return (
    <div className="bg-[#f8f8f5] rounded-2xl p-1 flex gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {tabs.map((tab, index) => {
        const isActive = index === active;
        return (
          <button
            type="button"
            key={index}
            onClick={() => handleTabChange(index)}
            className={`flex-1 py-2.5 rounded-xl text-sm transition-all relative ${
              isActive
                ? 'bg-white text-[#2a2a2a] shadow-sm'
                : 'text-[#999] hover:text-[#5a5a5a]'
            }`}
          >
            {tab}
            {isActive && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#a8d5ba] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
