import { Search, Calendar, Users } from 'lucide-react';

interface SearchCardProps {
  onSearch?: () => void;
}

export function SearchCard({ onSearch }: SearchCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4">
          <Search className="w-5 h-5 text-[#5a5a5a]" />
          <input
            type="text"
            placeholder="어디로 떠나시나요?"
            className="flex-1 outline-none bg-transparent placeholder:text-[#5F6368]"
            onClick={onSearch}
            readOnly
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f8f5]">
            <Calendar className="w-4 h-4 text-[#5a5a5a]" />
            <span className="text-sm text-[#5a5a5a]">일정</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f8f5]">
            <Users className="w-4 h-4 text-[#5a5a5a]" />
            <span className="text-sm text-[#5a5a5a]">인원</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]"
        >
          활동 찾기
        </button>
      </div>
    </div>
  );
}
