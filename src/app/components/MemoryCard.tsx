interface MemoryCardProps {
  imageUrl: string;
  title: string;
  date: string;
}

export function MemoryCard({ imageUrl, title, date }: MemoryCardProps) {
  return (
    <div className="flex-shrink-0 w-44 cursor-pointer group">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="aspect-[4/5] bg-[#f0f0eb] overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-3">
          <p className="text-sm text-[#2a2a2a] mb-0.5 line-clamp-1">{title}</p>
          <p className="text-xs text-[#5F6368]">{date}</p>
        </div>
      </div>
    </div>
  );
}
