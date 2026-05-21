import { MapPin, Clock } from 'lucide-react';

interface RecommendationCardProps {
  imageUrl: string;
  title: string;
  location: string;
  time: string;
  badge: string;
  onClick?: () => void;
}

export function RecommendationCard({
  imageUrl,
  title,
  location,
  time,
  badge,
  onClick,
}: RecommendationCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-black/5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.99] transition-all"
    >
      <div className="relative aspect-[16/9]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-[#e8f5ed] text-[#2a2a2a] text-xs px-3 py-1.5 rounded-full">
          {badge}
        </div>
      </div>

      <div className="p-4 text-left">
        <h4 className="mb-2.5">{title}</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{time}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
