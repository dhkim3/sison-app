import { useState } from 'react';
import { ArrowLeft, Bookmark, Share2, MapPin, Clock } from 'lucide-react';
import { BottomTabBar } from './BottomTabBar';
import { PageShell } from './PageShell';

interface AIRecommendationProps {
  onNavigate: (screen: string) => void;
}

export function AIRecommendation({ onNavigate }: AIRecommendationProps) {
  const [isSaved, setIsSaved] = useState(false);

  const selectedActivity = {
    title: '함덕해수욕장 해양 환경 정화 봉사',
    location: '제주 제주시',
    time: '09:00 - 11:00',
  };

  const itinerary = [
    { time: '09:00', title: '함덕해수욕장 해양 환경 정화 봉사', location: '함덕해수욕장' },
    { time: '12:30', title: '고등어회국수', location: '봉사장소 도보 5분' },
    { time: '14:00', title: '비자림 산책', location: '차로 20분' },
    { time: '16:30', title: '김녕해수욕장 석양', location: '차로 15분' },
  ];

  const nearbySpots = [
    { title: '함덕 오션뷰 카페', distance: '도보 3분' },
    { title: '월정리 해변', distance: '차로 5분' },
    { title: '절물 자연휴양림', distance: '차로 12분' },
  ];

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('search')}
                  className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
                </button>
                <h3>여행 일정</h3>
              </div>
            </div>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <Bookmark
                className={`w-5 h-5 ${isSaved ? 'fill-[#a8d5ba] text-[#a8d5ba]' : 'text-[#5a5a5a]'}`}
                strokeWidth={2}
              />
            </button>
          </div>
        </header>

        <div className="px-6 py-6 space-y-8">
          {/* 1. Selected Activity Summary */}
          <section>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
              <h3 className="mb-4">{selectedActivity.title}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
                  <span className="text-sm text-[#5a5a5a]">{selectedActivity.location}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#5a5a5a]" strokeWidth={2} />
                  <span className="text-sm text-[#5a5a5a]">{selectedActivity.time}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Short Emotional Recommendation */}
          <section>
            <div className="bg-[#e8f5ed] rounded-2xl p-5">
              <p className="text-sm text-[#2a2a2a] leading-relaxed">
                오전 봉사 후 가까운 맛집에서 점심을 즐기고, 오후엔 여유롭게 비자림을 산책해보세요.
                석양 무렵 김녕해수욕장에서 하루를 마무리하면 좋을 거예요.
              </p>
            </div>
          </section>

          {/* 3. Vertical Timeline */}
          <section>
            <h3 className="mb-4">추천 일정</h3>
            <div className="space-y-3">
              {itinerary.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-black/5"
                >
                  <div className="flex gap-4">
                    <div className="text-sm text-[#a8d5ba] font-medium min-w-[45px]">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#2a2a2a] mb-1">{item.title}</h4>
                      <p className="text-sm text-[#999]">{item.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Nearby Places */}
          <section>
            <h3 className="mb-5">근처 추천 장소</h3>
            <div className="space-y-2">
              {nearbySpots.map((spot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 px-4 bg-white rounded-2xl border border-black/5"
                >
                  <span className="text-sm text-[#2a2a2a]">{spot.title}</span>
                  <span className="text-sm text-[#999]">{spot.distance}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Save and Share Buttons */}
          <section className="pt-2">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsSaved(true);
                  setTimeout(() => {
                    alert('일정이 저장되었습니다');
                  }, 100);
                }}
                className="flex-1 bg-[#2a2a2a] text-white py-4 rounded-2xl transition-all hover:bg-[#1a1a1a]"
              >
                일정 저장하기
              </button>
              <button
                onClick={() => alert('공유 기능 준비중입니다')}
                className="w-14 h-14 bg-white border border-black/10 rounded-2xl flex items-center justify-center hover:bg-[#f8f8f5] transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
              </button>
            </div>
          </section>
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="search" onNavigate={onNavigate} />
    </>
  );
}
