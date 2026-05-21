import { BookmarkX, ImageOff, LayoutGrid } from 'lucide-react';

interface EmptyStateProps {
  type: 'saved' | 'stories' | 'cards';
}

export function EmptyState({ type }: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'saved':
        return <BookmarkX className="w-12 h-12 text-[#e0e0e0]" strokeWidth={1.5} />;
      case 'stories':
        return <ImageOff className="w-12 h-12 text-[#e0e0e0]" strokeWidth={1.5} />;
      case 'cards':
        return <LayoutGrid className="w-12 h-12 text-[#e0e0e0]" strokeWidth={1.5} />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'saved':
        return {
          title: '저장한 활동이 없어요',
          subtitle: '마음에 드는 활동을 저장해보세요',
        };
      case 'stories':
        return {
          title: '아직 스토리가 없어요',
          subtitle: '여행 속 작은 순간을 천천히 모아보세요',
        };
      case 'cards':
        return {
          title: '여행 카드가 없어요',
          subtitle: '사진 한 장으로 추억을 담아보세요',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="mb-5">{getIcon()}</div>
      <p className="text-sm text-[#999] mb-1.5 text-center">{message.title}</p>
      <p className="text-sm text-[#bbb] text-center leading-relaxed">
        {message.subtitle}
      </p>
    </div>
  );
}
