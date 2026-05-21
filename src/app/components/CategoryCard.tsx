interface CategoryCardProps {
  emoji: string;
  label: string;
  onClick?: () => void;
}

export function CategoryCard({ emoji, label, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-black/5 hover:border-[#a8d5ba] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.97] transition-all min-w-[140px]"
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="text-sm text-[#2a2a2a]">{label}</p>
    </button>
  );
}
