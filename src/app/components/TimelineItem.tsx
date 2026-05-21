interface TimelineItemProps {
  emoji: string;
  time: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  isLast?: boolean;
}

export function TimelineItem({
  emoji,
  time,
  title,
  subtitle,
  imageUrl,
  isLast = false,
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-px bg-gradient-to-b from-[#a8d5ba]/40 to-transparent" />
      )}

      {/* Time badge */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-[#e8f5ed] flex items-center justify-center text-lg relative z-10">
          {emoji}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5">
          {imageUrl && (
            <div className="relative aspect-[16/9]">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <div className="text-sm text-[#a8d5ba] mb-2">{time}</div>
            <h4 className="text-[#2a2a2a] mb-1">{title}</h4>
            {subtitle && (
              <p className="text-sm text-[#5a5a5a]">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
