interface HistoryItem {
  location: string;
  dates: string;
  people: string;
}

interface SearchHistoryProps {
  items: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
}

export function SearchHistory({ items, onItemClick }: SearchHistoryProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onItemClick?.(item)}
          className="flex-shrink-0 bg-white px-4 py-2.5 rounded-2xl border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-[#a8d5ba] hover:bg-[#f8f8f5] hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.97] transition-all whitespace-nowrap text-sm text-[#5a5a5a] hover:text-[#2a2a2a]"
        >
          {item.location} · {item.dates} · {item.people}
        </button>
      ))}
    </div>
  );
}
