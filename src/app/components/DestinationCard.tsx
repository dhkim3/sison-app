interface DestinationCardProps {
  imageUrl: string;
  name: string;
  activityCountLabel: string;
  onClick?: () => void;
}

export function DestinationCard({ imageUrl, name, activityCountLabel, onClick }: DestinationCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-48 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-black/5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all group"
    >
      <div className="relative aspect-[4/3]">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h4 className="text-white mb-1">{name}</h4>
          <p className="text-xs text-white/80">{activityCountLabel}</p>
        </div>
      </div>
    </button>
  );
}
