import { useState } from 'react';

type CardStyle = 'polaroid' | 'film' | 'minimal' | 'postcard';

interface CardStyleSelectorProps {
  selectedStyle?: CardStyle;
  onStyleChange?: (style: CardStyle) => void;
}

export function CardStyleSelector({ selectedStyle = 'polaroid', onStyleChange }: CardStyleSelectorProps) {
  const [selected, setSelected] = useState<CardStyle>(selectedStyle);

  const styles: { id: CardStyle; label: string }[] = [
    { id: 'polaroid', label: 'Polaroid' },
    { id: 'film', label: 'Film' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'postcard', label: 'Postcard' },
  ];

  const handleSelect = (style: CardStyle) => {
    setSelected(style);
    onStyleChange?.(style);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {styles.map((style) => {
        const isSelected = style.id === selected;
        return (
          <button
            key={style.id}
            onClick={() => handleSelect(style.id)}
            className={`px-5 py-2.5 rounded-full text-sm whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-[#a8d5ba] text-[#2a2a2a] shadow-sm'
                : 'bg-white text-[#5a5a5a] border border-black/10 hover:border-[#a8d5ba]'
            }`}
          >
            {style.label}
          </button>
        );
      })}
    </div>
  );
}
