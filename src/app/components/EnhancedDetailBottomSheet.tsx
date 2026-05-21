import { X, Bookmark, Share2, MapPin, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface EnhancedDetailBottomSheetProps {
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
    isRecruiting: boolean;
    distance?: string;
    duration?: string;
    difficulty?: string;
    indoorOutdoor?: string;
  };
}

export function EnhancedDetailBottomSheet({
  isOpen,
  onClose,
  onAIRecommendation,
  activity,
}: EnhancedDetailBottomSheetProps) {
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] z-50 max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Drag Handle */}
        <div className="sticky top-0 bg-white z-10 pt-3 pb-4">
          <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto" />
        </div>

        {/* Top Actions */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
            >
              <Bookmark
                className={`w-5 h-5 ${isSaved ? 'fill-[#a8d5ba] text-[#a8d5ba]' : 'text-[#5a5a5a]'}`}
                strokeWidth={2}
              />
            </button>
            <button className="w-9 h-9 rounded-full bg-[#f8f8f5] flex items-center justify-center hover:bg-[#f0f0eb] transition-colors">
              <Share2 className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="pb-safe">
          {/* Compact Hero Image */}
          <div className="relative aspect-[2/1] mx-6 rounded-2xl overflow-hidden mb-6">
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="px-6 space-y-6">
            {/* 1. Activity Title */}
            <div>
              <h2 className="mb-1">{activity.title}</h2>
            </div>

            {/* 2. Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#5a5a5a] mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div>
                <p className="text-[#2a2a2a]">{activity.location}</p>
                {activity.distance && (
                  <p className="text-sm text-[#999] mt-1">{activity.distance}</p>
                )}
              </div>
            </div>

            {/* 3. Time */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#5a5a5a] flex-shrink-0" strokeWidth={2} />
              <p className="text-[#2a2a2a]">{activity.time}</p>
            </div>

            {/* 4. Recruitment Status */}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${activity.isRecruiting ? 'bg-[#a8d5ba]' : 'bg-[#999]'}`} />
              </div>
              <div className="flex-1">
                <p className={`${activity.isRecruiting ? 'text-[#a8d5ba]' : 'text-[#999]'}`}>
                  {activity.isRecruiting ? '모집중' : '마감'}
                </p>
                {activity.isRecruiting && activity.capacity && (
                  <p className="text-sm text-[#999] mt-1">
                    {activity.capacity} · 현재 {activity.currentParticipants} 참여
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-black/5" />

            {/* 5. Recommendation Reason */}
            <div className="bg-[#e8f5ed] rounded-2xl p-5">
              <p className="text-sm text-[#2a2a2a] leading-relaxed">
                "{activity.recommendation}"
              </p>
            </div>

            {/* 6. Key Information */}
            <div className="space-y-3">
              <div className="flex items-start justify-between py-3 border-b border-black/5">
                <span className="text-sm text-[#999]">준비물</span>
                <span className="text-sm text-[#2a2a2a] text-right">{activity.materials}</span>
              </div>
              <div className="flex items-start justify-between py-3 border-b border-black/5">
                <span className="text-sm text-[#999]">활동 시간</span>
                <span className="text-sm text-[#2a2a2a]">{activity.duration || '2시간'}</span>
              </div>
              <div className="flex items-start justify-between py-3 border-b border-black/5">
                <span className="text-sm text-[#999]">활동 장소</span>
                <span className="text-sm text-[#2a2a2a]">{activity.indoorOutdoor || '실외'}</span>
              </div>
              <div className="flex items-start justify-between py-3">
                <span className="text-sm text-[#999]">난이도</span>
                <span className="text-sm text-[#2a2a2a]">{activity.difficulty || '쉬움'}</span>
              </div>
            </div>

            {/* Detailed Description */}
            {activity.description && (
              <>
                <div className="border-t border-black/5 pt-6">
                  <h3 className="mb-3">상세 설명</h3>
                  <p className="text-sm text-[#5a5a5a] leading-relaxed">{activity.description}</p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 pb-6">
              {/* Primary CTA */}
              <button className="w-full bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]">
                1365에서 신청하기
              </button>

              {/* Secondary CTA */}
              <button
                onClick={() => {
                  onClose();
                  onAIRecommendation?.();
                }}
                className="w-full bg-[#e8f5ed] text-[#2a2a2a] py-4 rounded-2xl transition-all hover:bg-[#d8e5dd] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" strokeWidth={2} />
                <span>AI 일정 추천 받기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
