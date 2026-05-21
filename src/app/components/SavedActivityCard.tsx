import { MapPin, Calendar, Bookmark } from 'lucide-react';

interface SavedActivityCardProps {
  imageUrl: string;
  title: string;
  location: string;
  date: string;
  status: 'recruiting' | 'completed';
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function SavedActivityCard({
  imageUrl,
  title,
  location,
  date,
  status,
  isSaved = true,
  onToggleSave,
}: SavedActivityCardProps) {
  const isRecruiting = status === 'recruiting';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow">
      <div className="relative aspect-[5/3]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onToggleSave}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Bookmark
            className={`w-4 h-4 ${isSaved ? 'fill-[#a8d5ba] text-[#a8d5ba]' : 'text-[#5a5a5a]'}`}
            strokeWidth={2}
          />
        </button>
        <div
          className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm ${
            isRecruiting
              ? 'text-[#a8d5ba] bg-white/90'
              : 'text-[#999] bg-white/90'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isRecruiting ? 'bg-[#a8d5ba]' : 'bg-[#999]'}`} />
          {isRecruiting ? '모집중' : '완료'}
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-[#2a2a2a] mb-3">{title}</h4>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#999]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#999]" strokeWidth={2} />
            <span className="text-sm text-[#5a5a5a]">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
