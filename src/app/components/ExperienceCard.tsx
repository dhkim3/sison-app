interface ExperienceCardProps {
  imageUrl: string;
  emoji: string;
  title: string;
  description: string;
}

export function ExperienceCard({ imageUrl, emoji, title, description }: ExperienceCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-sm group cursor-pointer">
      <div className="aspect-[4/5] relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-2 text-2xl">{emoji}</div>
          <h3 className="mb-2">{title}</h3>
          <p className="text-sm text-white/90 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
