import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { getCompactLocationLabel } from '../TravelCardCarousel';
import { captureElementAsPng, downloadBlob } from '../../utils/captureElementAsImage';

interface CardCreationViewProps {
  activity: any;
  photo: string;
  storyTitle?: string;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const BASE_FRAMES = ['기본', '바다', '숲', '노을', '도시'];
const AI_FRAME = 'AI';

// Quiet editorial gradients for AI-generated frames
const AI_FRAME_VARIANTS = [
  { bg: 'from-[#ede8f5] to-[#e8f0f8]' }, // lavender-sky
  { bg: 'from-[#f5ecea] to-[#ece8e0]' }, // rose-linen
  { bg: 'from-[#e8efe8] to-[#ede8e0]' }, // sage-warm
];

export function CardCreationView({
  activity,
  photo,
  storyTitle = '',
  onBack,
  onNavigate,
}: CardCreationViewProps) {
  const [selectedFrame, setSelectedFrame] = useState<string>('기본');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedAIFrame, setHasGeneratedAIFrame] = useState(false);
  // Start at last index so first generation wraps to 0 (lavender-sky)
  const [aiVariantIndex, setAiVariantIndex] = useState(AI_FRAME_VARIANTS.length - 1);
  const [showAIWave, setShowAIWave] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const genTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compactLocation = getCompactLocationLabel(activity.location) || activity.region;
  const cardTitle = storyTitle.trim() || `"${activity.region}에서 남긴 작은 시선"`;

  useEffect(() => {
    return () => {
      if (genTimerRef.current) clearTimeout(genTimerRef.current);
    };
  }, []);

  const handleGenerateAIFrame = () => {
    if (isGenerating) return;
    if (genTimerRef.current) clearTimeout(genTimerRef.current);

    const nextIndex = (aiVariantIndex + 1) % AI_FRAME_VARIANTS.length;
    setAiVariantIndex(nextIndex);
    setIsGenerating(true);
    setShowAIWave(true);

    genTimerRef.current = setTimeout(() => {
      setShowAIWave(false);
      setIsGenerating(false);
      setHasGeneratedAIFrame(true);
      setSelectedFrame(AI_FRAME);
    }, 2000);
  };

  const handleDownload = async () => {
    try {
      if (!cardPreviewRef.current) throw new Error('Card preview unavailable');
      const blob = await captureElementAsPng(cardPreviewRef.current);
      downloadBlob(blob, `sison-travel-card-${activity.id ?? 'my-card'}.png`);
      setDownloadMessage('여행 카드를 저장했어요.');
    } catch (error) {
      console.error('card preview download failed', error);
      setDownloadMessage('카드를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
    window.setTimeout(() => setDownloadMessage(''), 2200);
  };

  const getFrameGradient = () => {
    if (selectedFrame === AI_FRAME) {
      // Show AI variant during and after generation; plain fallback before first generate
      if (hasGeneratedAIFrame || isGenerating) return AI_FRAME_VARIANTS[aiVariantIndex].bg;
      return 'from-[#fdfcfa] to-[#f8f8f5]';
    }
    switch (selectedFrame) {
      case '바다': return 'from-blue-50 to-cyan-50';
      case '숲':   return 'from-green-50 to-emerald-50';
      case '노을': return 'from-orange-50 to-pink-50';
      case '도시': return 'from-gray-50 to-slate-50';
      default:     return 'from-[#fdfcfa] to-[#f8f8f5]';
    }
  };

  return (
    <>
      <PageShell>
        {/* Header */}
        <header className="sison-top-bar sticky top-0 z-20 bg-[#fdfcfa]/95 backdrop-blur-sm">
          <div className="px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
              </button>
              <div>
                <h2>여행 카드 만들기</h2>
                <p className="text-[13px] text-[#9AA0A6] mt-0.5">한 장의 사진으로 오늘의 시선을 남겨보세요</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-5 space-y-6">
          {/* Frame Selection */}
          <section>
            <div className="mb-3.5">
              <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">프레임 선택</h4>
              <p className="text-[11px] text-[#9AA0A6]">원하는 분위기를 골라보세요</p>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {BASE_FRAMES.map((frame) => (
                <button
                  key={frame}
                  type="button"
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

              {hasGeneratedAIFrame && (
                <button
                  type="button"
                  onClick={() => setSelectedFrame(AI_FRAME)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    selectedFrame === AI_FRAME
                      ? 'bg-[#e8e6f5] text-[#5a56d0] shadow-[0_1px_3px_rgba(107,90,168,0.12)]'
                      : 'bg-[#f8f8f5] text-[#9a92c8] hover:bg-[#f0edf8]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" strokeWidth={2} />
                  AI 프레임
                </button>
              )}
            </div>
          </section>

          {/* Card Preview */}
          <section>
            <div className="flex justify-center">
              <div
                ref={cardPreviewRef}
                className={`relative bg-gradient-to-br ${getFrameGradient()} p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden`}
                style={{ width: '300px' }}
              >
                {/* AI wave scan — mint+purple gradient sweeps top→bottom, reveals new frame */}
                {showAIWave && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-10"
                    style={{
                      height: '55%',
                      background:
                        'linear-gradient(180deg, transparent 0%, rgba(117,176,255,0.10) 20%, rgba(157,137,255,0.18) 42%, rgba(168,213,186,0.14) 62%, transparent 100%)',
                      filter: 'blur(10px)',
                      animation: 'ai-result-wave-scan 2s ease-in-out forwards',
                    }}
                  />
                )}

                {/* Photo */}
                <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <img
                    src={photo}
                    alt="Travel memory"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Content */}
                <div className="px-1.5">
                  <p className="line-clamp-1 text-[13px] font-semibold leading-snug text-[#2a2a2a]">
                    {cardTitle}
                  </p>
                  <div className="mt-3 space-y-1">
                    {compactLocation && (
                      <p className="text-[11px] font-medium leading-[1.35] text-[#6f6f6f]">{compactLocation}</p>
                    )}
                    <p className="text-[11px] font-normal leading-[1.35] text-[#b6b6b6]">{activity.date}</p>
                  </div>
                  <div className="mt-3 border-t border-black/5 pt-2">
                    <p className="text-center text-[11px] text-[#5F6368] opacity-70">시선</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Frame button — changes label based on state */}
          <section>
            <button
              type="button"
              onClick={handleGenerateAIFrame}
              disabled={isGenerating}
              className={`w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] font-medium ${
                isGenerating
                  ? 'bg-[#f8f8f5] text-[#ccc] cursor-not-allowed'
                  : hasGeneratedAIFrame
                  ? 'bg-[#efecfc] text-[#5a56d0] hover:bg-[#e5e1fa]'
                  : 'bg-[#efecfc] text-[#5a56d0] hover:bg-[#e5e1fa]'
              }`}
            >
              {!isGenerating && <Sparkles className="w-4 h-4" strokeWidth={2} />}
              <span>
                {isGenerating
                  ? 'AI 프레임 생성 중...'
                  : hasGeneratedAIFrame
                  ? '다시 만들기'
                  : 'AI 프레임 만들기'}
              </span>
            </button>
          </section>

          {/* Download */}
          <section className="space-y-2.5">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full bg-white border border-black/10 text-[#2a2a2a] py-3.5 rounded-xl transition-all hover:bg-[#f8f8f5] flex items-center justify-center gap-2 text-[14px] font-medium"
            >
              <Download className="w-4.5 h-4.5" strokeWidth={2} />
              <span>다운로드</span>
            </button>

            {downloadMessage && (
              <p className="text-center text-[12px] leading-5 text-[#6f8b78]" role="status" aria-live="polite">
                {downloadMessage}
              </p>
            )}
          </section>
        </div>
      </PageShell>

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
