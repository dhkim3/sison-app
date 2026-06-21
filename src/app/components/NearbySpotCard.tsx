interface NearbySpotCardProps {
  imageUrl: string;
  title: string;
  category: string;
  distance: string;
}

export function NearbySpotCard({
  imageUrl,
  title,
  category,
  distance,
}: NearbySpotCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 w-48 flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95">
      <div className="relative aspect-square">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4">
        <div className="text-xs text-[#5F6368] mb-1">{category}</div>
        <h5 className="text-sm text-[#2a2a2a] mb-2 line-clamp-1">{title}</h5>
        <p className="text-xs text-[#5a5a5a]">{distance}</p>
      </div>
    </div>
  );
}
