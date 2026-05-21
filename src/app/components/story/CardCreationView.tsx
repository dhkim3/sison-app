import { useState } from 'react';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';

interface CardCreationViewProps {
  activity: any;
  photo: string;
  onBack: () => void;
  onSave: () => void;
  onNavigate: (screen: string) => void;
}

export function CardCreationView({
  activity,
  photo,
  onBack,
  onSave,
  onNavigate,
}: CardCreationViewProps) {
  const [selectedFrame, setSelectedFrame] = useState<string>('담백한');
  const [isGenerating, setIsGenerating] = useState(false);

  const frameOptions = ['담백한', '바다', '숲', '노을', '도시'];

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  const handleDownload = () => {
    alert('카드가 갤러리에 저장되었습니다');
  };

  // Get frame style based on selection
  const getFrameStyle = () => {
    switch (selectedFrame) {
      case '바다':
        return 'from-blue-50 to-cyan-50';
      case '숲':
        return 'from-green-50 to-emerald-50';
      case '노을':
        return 'from-orange-50 to-pink-50';
      case '도시':
        return 'from-gray-50 to-slate-50';
      default:
        return 'from-[#fdfcfa] to-[#f8f8f5]';
    }
  };

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm border-b border-black/5">
          <div className="px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
              </button>
              <div>
                <h2>여행 카드 만들기</h2>
                <p className="text-[13px] text-[#bbb] mt-0.5">한 장의 사진으로 오늘의 시선을 남겨보세요</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-5 space-y-6">
          {/* Frame Selection */}
          <section>
            <div className="mb-3.5">
              <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">프레임 선택</h4>
              <p className="text-[11px] text-[#bbb]">원하는 분위기를 골라보세요</p>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {frameOptions.map((frame) => (
                <button
                  key={frame}
                  onClick={() => setSelectedFrame(frame)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    selectedFrame === frame
                      ? 'bg-[#a8d5ba] text-white shadow-[0_1px_3px_rgba(168,213,186,0.2)]'
                      : 'bg-[#f8f8f5] text-[#5a5a5a] hover:bg-[#e8f5ed]'
                  }`}
                >
                  {frame}
                </button>
              ))}
            </div>
          </section>

          {/* Card Preview */}
          <section>
            <div className="flex justify-center">
              <div className={`bg-gradient-to-br ${getFrameStyle()} p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]`} style={{ width: '300px' }}>
                {/* Photo */}
                <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <img
                    src={photo}
                    alt="Travel memory"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Content */}
                <div className="space-y-2 px-1.5">
                  {/* Title */}
                  <p className="text-[13px] text-[#2a2a2a] line-clamp-2 leading-relaxed">
                    "{activity.region}에서 남긴 작은 시선"
                  </p>

                  {/* Date & Location */}
                  <div className="flex items-center justify-between text-[11px] text-[#5a5a5a]">
                    <span>{activity.date}</span>
                    <span>·</span>
                    <span>{activity.region}</span>
                  </div>

                  {/* Branding */}
                  <div className="pt-2 border-t border-black/5">
                    <p className="text-[11px] text-[#999] text-center">시선</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Regenerate Button */}
          <section>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="w-full py-2.5 bg-[#e8f5ed] text-[#5a5a5a] rounded-xl transition-all hover:bg-[#a8d5ba] hover:text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              <span className="text-[13px] font-medium">{isGenerating ? '만드는 중...' : '다시 만들기'}</span>
            </button>
          </section>

          {/* Action Buttons */}
          <section className="space-y-2.5">
            <button
              onClick={handleDownload}
              className="w-full bg-white border border-black/10 text-[#2a2a2a] py-3.5 rounded-xl transition-all hover:bg-[#f8f8f5] flex items-center justify-center gap-2 text-[14px] font-medium"
            >
              <Download className="w-4.5 h-4.5" strokeWidth={2} />
              <span>다운로드</span>
            </button>

            <button
              onClick={onSave}
              className="w-full bg-[#2a2a2a] text-white py-3.5 rounded-xl transition-all hover:bg-[#1a1a1a] text-[14px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            >
              스토리에 함께 저장
            </button>
          </section>
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
