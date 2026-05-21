interface StoryGridCardProps {
  imageUrl: string;
  title: string;
  date: string;
  onClick?: () => void;
}

export function StoryGridCard({ imageUrl, title, date, onClick }: StoryGridCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm group cursor-pointer bg-white"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-3 text-left">
        <p className="text-sm text-[#2a2a2a] mb-0.5 line-clamp-2">{title}</p>
        <p className="text-xs text-[#999]">{date}</p>
      </div>
    </button>
  );
}
