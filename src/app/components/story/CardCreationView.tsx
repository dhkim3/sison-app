import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { getCompactLocationLabel } from '../TravelCardCarousel';
import { captureElementAsPng, downloadBlob } from '../../utils/captureElementAsImage';
import { getDeviceKey, storyApi } from '../../storyInteractionState';

interface CardCreationViewProps {
  activity: any;
  photo: string;
  storyTitle?: string;
  storyId?: number;
  onBack: () => void;
  onSaved?: () => void;
  onNavigate: (screen: string) => void;
}

const BASE_FRAMES = ['기본', '바다', '숲', '노을', '도시', '블랙'];
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
  storyId,
  onBack,
  onSaved,
  onNavigate,
}: CardCreationViewProps) {
  const [selectedFrame, setSelectedFrame] = useState<string>('기본');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedAIFrame, setHasGeneratedAIFrame] = useState(false);
  // Start at last index so first generation wraps to 0 (lavender-sky)
  const [aiVariantIndex, setAiVariantIndex] = useState(AI_FRAME_VARIANTS.length - 1);
  const [showAIWave, setShowAIWave] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const genTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceKey = getDeviceKey();

  const compactLocation = getCompactLocationLabel(activity.location) || activity.region;
  const cardTitle = storyTitle.trim() || `"${activity.region}에서 남긴 작은 시선"`;
  const isDarkFrame = selectedFrame === '블랙';

  useEffect(() => {
    return () => {
      if (genTimerRef.current) clearTimeout(genTimerRef.current);
    };
  }, []);

  // private Blob 스토어라 공개 URL을 만들 수 없어, 사진을 base64 data URL로 변환해 서버(→OpenAI)에 직접 전달
  const toDataUrl = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;
    const blob = await (await fetch(src)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('이미지 변환에 실패했어요.'));
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerateAIFrame = async () => {
    if (isGenerating) return;
    setErrorMessage('');
    setAiVariantIndex((aiVariantIndex + 1) % AI_FRAME_VARIANTS.length);
    setIsGenerating(true);
    setShowAIWave(true);

    const start = Date.now();
    try {
      const photoDataUrl = await toDataUrl(photo);
      const result = await storyApi.generateCard(deviceKey, {
        storyId,
        photoDataUrl,
        activity: activity.title ?? activity.activityTitle ?? '',
        region: activity.region ?? '',
        title: cardTitle,
        date: activity.date ?? activity.activityDate ?? '',
        templateType: 'ai',
      });
      console.log(`[AI card] generated in ${result.elapsedMs ?? Date.now() - start}ms`);
      setGeneratedImageUrl(result.url);
      setHasGeneratedAIFrame(true);
      setSelectedFrame(AI_FRAME);
    } catch (error) {
      console.error('AI card generate failed', error);
      const message = error instanceof Error ? error.message : '';
      setErrorMessage(/준비 중/.test(message) ? message : 'AI 카드를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setShowAIWave(false);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const isAiCard = selectedFrame === AI_FRAME && Boolean(generatedImageUrl);
      let blob: Blob;
      if (isAiCard && generatedImageUrl) {
        // AI 카드는 생성 시 이미 Blob/STORY_CARDS에 저장됨 → 이미지를 받아 다운로드만 수행
        blob = await (await fetch(generatedImageUrl)).blob();
      } else {
        if (!cardPreviewRef.current) throw new Error('Card preview unavailable');
        blob = await captureElementAsPng(cardPreviewRef.current);
      }
      downloadBlob(blob, `sison-card-${storyId ?? activity.id ?? 'my-card'}.png`);
      setDownloadMessage('여행 카드를 저장했어요.');
      window.setTimeout(() => {
        setDownloadMessage('');
        onSaved?.();
      }, 1000);
    } catch (error) {
      console.error('card save failed', error);
      setDownloadMessage('카드를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      window.setTimeout(() => setDownloadMessage(''), 2200);
    }
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
      case '블랙': return 'from-[#1a1a1a] to-[#0a0a0a]';
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
                    src={selectedFrame === AI_FRAME && generatedImageUrl ? generatedImageUrl : photo}
                    alt="Travel memory"
                    className={`w-full h-full ${selectedFrame === AI_FRAME && generatedImageUrl ? 'object-contain' : 'object-cover'}`}
                  />
                </div>

                {/* Card Content */}
                <div className="px-1.5">
                  <p className={`line-clamp-1 text-[13px] font-semibold leading-snug ${isDarkFrame ? 'text-white' : 'text-[#2a2a2a]'}`}>
                    {cardTitle}
                  </p>
                  <div className="mt-3 space-y-1">
                    {compactLocation && (
                      <p className={`text-[11px] font-medium leading-[1.35] ${isDarkFrame ? 'text-white/80' : 'text-[#6f6f6f]'}`}>{compactLocation}</p>
                    )}
                    <p className={`text-[11px] font-normal leading-[1.35] ${isDarkFrame ? 'text-white/50' : 'text-[#b6b6b6]'}`}>{activity.date}</p>
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
            {errorMessage && (
              <p className="mt-2 text-center text-[12px] leading-5 text-[#b76e65]" role="status" aria-live="polite">
                {errorMessage}
              </p>
            )}
          </section>

          {/* Download */}
          <section className="space-y-2.5">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full bg-white border border-black/10 text-[#2a2a2a] py-3.5 rounded-xl transition-all hover:bg-[#f8f8f5] flex items-center justify-center gap-2 text-[14px] font-medium"
            >
              <Download className="w-4.5 h-4.5" strokeWidth={2} />
              <span>저장</span>
            </button>

            {downloadMessage && (
              <p className="text-center text-[12px] leading-5 text-[#6f8b78]" role="status" aria-live="polite">
                {downloadMessage}
              </p>
            )}
          </section>
        </div>
      </PageShell>

      {isGenerating && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-8 backdrop-blur-sm">
          <div className="w-full max-w-[280px] rounded-3xl bg-white px-6 py-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#e8e6f5] border-t-[#7c74d6]" />
            <p className="text-[15px] font-semibold text-[#2a2a2a]">AI 카드를 만들고 있어요</p>
            <p className="mt-1.5 text-[12.5px] leading-5 text-[#999]">잠시 걸릴 수 있어요. 화면을 닫지 말고 기다려주세요.</p>
          </div>
        </div>
      )}

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
