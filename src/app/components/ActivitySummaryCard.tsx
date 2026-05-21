import { MapPin, Clock } from 'lucide-react';

interface ActivitySummaryCardProps {
  imageUrl: string;
  title: string;
  location: string;
  time: string;
}

export function ActivitySummaryCard({
  imageUrl,
  title,
  location,
  time,
}: ActivitySummaryCardProps) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5">
      <div className="relative aspect-[16/9]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      <div className="p-6">
        <h3 className="mb-4">{title}</h3>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{location}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
