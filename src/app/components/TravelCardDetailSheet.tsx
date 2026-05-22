import { Calendar, Download, Leaf, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import type { TravelCard } from './TravelCardCarousel';

interface TravelCardDetailSheetProps {
  card: TravelCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TravelCardDetailSheet({ card, isOpen, onClose }: TravelCardDetailSheetProps) {
  const [didDownload, setDidDownload] = useState(false);

  if (!isOpen || !card) return null;

  const activities = card.activities ?? [];
  const moodTags = card.moodTags ?? [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] max-h-[88vh] overflow-y-auto bg-[#fdfcfa] rounded-t-[2rem] shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
          <p className="text-[12px] font-medium text-[#999]">저장한 여행 카드</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="여행 카드 상세 닫기"
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-[#f0f0eb] transition-colors"
          >
            <X className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          </button>
        </div>

        <div className="pb-safe">
          <div className="px-5 pt-4">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#f0f0eb]" style={{ aspectRatio: '4 / 5' }}>
              <img
                src={card.photoUrl}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/45 to-transparent">
                <p className="text-[12px] text-white/80">시선으로 저장한 여행</p>
                <h3 className="mt-1 text-[24px] font-semibold leading-tight text-white">{card.title}</h3>
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6 space-y-5">
            <div className="flex items-center gap-2.5 text-[14px] text-[#5a5a5a]">
              <Calendar className="w-4 h-4 text-[#a8d5ba]" strokeWidth={2} />
              <span>{card.period || card.date}</span>
            </div>

            {card.memo && (
              <p className="rounded-3xl bg-white border border-black/5 px-5 py-4 text-[15px] leading-7 text-[#4f4f4f] shadow-sm">
                “{card.memo}”
              </p>
            )}

            <section className="rounded-3xl bg-white border border-black/5 px-5 py-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-[#2a2a2a]">함께 저장된 활동</h4>
                <span className="text-[12px] text-[#999]">{activities.length}개</span>
              </div>
              <div className="space-y-2.5">
                {activities.map((activity) => (
                  <div key={activity} className="flex items-center gap-2.5 text-[13px] text-[#5a5a5a]">
                    <Leaf className="w-3.5 h-3.5 text-[#a8d5ba]" strokeWidth={2} />
                    <span>{activity}</span>
                  </div>
                ))}
              </div>
            </section>

            {card.locationSummary && (
              <section className="rounded-3xl bg-[#f7faf6] border border-[#dceee3] px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#c9897e]" strokeWidth={2} />
                  <h4 className="text-[14px] font-semibold text-[#2a2a2a]">위치 요약</h4>
                </div>
                <p className="text-[13px] leading-6 text-[#5a5a5a]">{card.locationSummary}</p>
              </section>
            )}

            {moodTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {moodTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white border border-black/5 px-3 py-1.5 text-[12px] text-[#5a5a5a]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setDidDownload(true);
                window.setTimeout(() => setDidDownload(false), 1800);
              }}
              className="w-full rounded-2xl bg-[#2a2a2a] px-5 py-4 text-[15px] font-medium text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" strokeWidth={2} />
                다운로드
              </span>
            </button>
            {didDownload && (
              <p className="text-center text-[12px] leading-none text-[#7fb894]">
                여행 카드가 저장되었어요
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
