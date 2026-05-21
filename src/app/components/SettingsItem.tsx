import { ChevronRight } from 'lucide-react';

interface SettingsItemProps {
  label: string;
  onClick?: () => void;
}

export function SettingsItem({ label, onClick }: SettingsItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 border-b border-black/5 last:border-0 hover:bg-black/5 transition-colors"
    >
      <span className="text-sm text-[#2a2a2a]">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#ccc]" strokeWidth={2} />
    </button>
  );
}
