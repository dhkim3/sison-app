interface TravelSummaryCardProps {
  label: string;
  count: number;
}

export function TravelSummaryCard({ label, count }: TravelSummaryCardProps) {
  return (
    <div className="bg-[#f8f8f5] rounded-xl p-4 text-center">
      <div className="text-sm text-[#999] mb-1.5">{label}</div>
      <div className="text-xl text-[#2a2a2a]">{count}</div>
    </div>
  );
}
