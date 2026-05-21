import { Sparkles } from 'lucide-react';

interface FloatingAIButtonProps {
  onClick?: () => void;
}

export function FloatingAIButton({ onClick }: FloatingAIButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 bg-[#a8d5ba] text-[#2a2a2a] pl-5 pr-6 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 z-30"
    >
      <Sparkles className="w-5 h-5" strokeWidth={2} />
      <span className="font-medium">AI 일정 추천</span>
    </button>
  );
}
