import { X, MapPin, Clock, Users, Package, Sparkles } from 'lucide-react';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface DetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAIRecommendation?: () => void;
  activity: {
    imageUrl: string;
    title: string;
    location: string;
    time: string;
    description: string;
    materials: string;
    capacity: string;
    currentParticipants: string;
    recommendation: string;
  };
}

export function DetailBottomSheet({ isOpen, onClose, onAIRecommendation, activity }: DetailBottomSheetProps) {
  useBottomSheetScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        className="bottom-sheet-panel fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] z-50 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
        data-bottom-sheet-scrollable="true"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-black/5 flex items-center justify-between z-10">
          <h3>활동 상세</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="pb-safe">
          <div className="relative aspect-[16/9]">
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="px-6 py-6 space-y-6">
            <div>
              <h2 className="mb-4">{activity.title}</h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#5a5a5a] mt-0.5" strokeWidth={2} />
                  <span className="text-[#5a5a5a]">{activity.location}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#5a5a5a] mt-0.5" strokeWidth={2} />
                  <span className="text-[#5a5a5a]">{activity.time}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#5a5a5a] mt-0.5" strokeWidth={2} />
                  <span className="text-[#5a5a5a]">
                    {activity.capacity} · 현재 {activity.currentParticipants} 참여
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-[#5a5a5a] mt-0.5" strokeWidth={2} />
                  <span className="text-[#5a5a5a]">{activity.materials}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-black/5">
              <h4 className="mb-3 text-[#2a2a2a]">상세 설명</h4>
              <p className="text-[#5a5a5a] leading-relaxed">{activity.description}</p>
            </div>

            <div className="bg-[#e8f5ed] rounded-2xl p-5">
              <p className="text-sm text-[#2a2a2a] leading-relaxed">
                <span className="text-xs text-[#5a5a5a] block mb-2">추천 이유</span>
                "{activity.recommendation}"
              </p>
            </div>

            <div className="h-3 rounded-xl bg-[#f8f8f5] overflow-hidden">
              <div className="h-full w-3/4 bg-[#a8d5ba] rounded-xl" />
            </div>
            <p className="text-xs text-[#999] text-center -mt-3">
              지도 미리보기는 준비중입니다
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAIRecommendation?.();
                }}
                className="w-full bg-[#a8d5ba] text-[#2a2a2a] py-4 rounded-2xl transition-all hover:bg-[#98c5aa] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" strokeWidth={2} />
                <span>AI 일정 추천 받기</span>
              </button>

              <button type="button" className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]">
                1365에서 신청하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
