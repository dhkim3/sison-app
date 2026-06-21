interface TravelSummaryCardProps {
  label: string;
  count: number;
  onClick?: () => void;
}

export function TravelSummaryCard({ label, count, onClick }: TravelSummaryCardProps) {
  const content = (
    <>
      <div className="text-sm text-[#5F6368] mb-1.5">{label}</div>
      <div className="text-xl text-[#2a2a2a]">{count}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full bg-[#f8f8f5] rounded-xl p-4 text-center transition-colors hover:bg-[#f3f5ef] active:bg-[#eef3ea] active:scale-[0.985]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-[#f8f8f5] rounded-xl p-4 text-center">
      {content}
    </div>
  );
}
