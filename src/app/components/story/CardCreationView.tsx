import { useEffect, useRef, useState, type Ref } from 'react';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { getCompactLocationLabel } from '../TravelCardCarousel';
import { captureElementAsPng, downloadBlob } from '../../utils/captureElementAsImage';
import { getDeviceKey, storyApi } from '../../storyInteractionState';

type FrameOption = '기본' | '바다' | '숲' | '노을' | '블랙' | 'AI 프레임';
type AIFrameStatus = 'idle' | 'generating' | 'done' | 'error';

interface CardCreationViewProps {
  activity: any;
  photo: string;
  storyTitle?: string;
  storyId?: number;
  onBack: () => void;
  onSaved?: () => void;
  onNavigate: (screen: string) => void;
}

const BASE_FRAMES: FrameOption[] = ['기본', '바다', '숲', '노을', '블랙'];
const AI_FRAME: FrameOption = 'AI 프레임';

export function CardCreationView({
  activity,
  photo,
  storyTitle = '',
  storyId,
  onBack,
  onSaved,
  onNavigate,
}: CardCreationViewProps) {
  const [selectedFrame, setSelectedFrame] = useState<FrameOption>('기본');
  const [downloadMessage, setDownloadMessage] = useState('');
  const [aiFrameMessage, setAIFrameMessage] = useState('');
  const [aiFrameStatus, setAIFrameStatus] = useState<AIFrameStatus>('idle');
  const [aiDecorationUrl, setAIDecorationUrl] = useState<string | null>(null);
  const [aiBaseFrame, setAIBaseFrame] = useState<FrameOption>('기본');
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const deviceKey = getDeviceKey();

  const compactLocation = getCompactLocationLabel(activity.location) || activity.region;
  const cardTitle = storyTitle.trim() || `"${activity.region}에서 남긴 작은 시선"`;
  const isGeneratingAIFrame = aiFrameStatus === 'generating';
  const hasAIFrameResult = Boolean(aiDecorationUrl);
  const isAIResultVisible = selectedFrame === AI_FRAME && Boolean(aiDecorationUrl);
  const shouldShowAIFrameChip = hasAIFrameResult;
  const frameOptions = shouldShowAIFrameChip ? [...BASE_FRAMES, AI_FRAME] : BASE_FRAMES;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleGenerateAIFrame = () => {
    void generateAIFrame();
  };

  const showAIFrameToast = (message: string, duration = 2200) => {
    setAIFrameMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setAIFrameMessage(''), duration);
  };

  const generateAIFrame = async () => {
    if (isGeneratingAIFrame) return;

    const hadAIFrameResult = Boolean(aiDecorationUrl);
    const frameAtStart = selectedFrame === AI_FRAME ? aiBaseFrame : selectedFrame;

    const startedAt = performance.now();
    console.info('[AI Frame] generation started', {
      storyId,
      frameStyle: 'pixel_art',
      frameType: frameAtStart,
      startedAt,
    });

    try {
      setAIFrameStatus('generating');
      setAIFrameMessage('');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

      // Do not send the full card image to the image model.
      // Image models may rewrite text inside the card.
      // We generate transparent decoration assets only and overlay them on the original React card,
      // so title/location/date text remains untouched.
      const result = await storyApi.generateCard(deviceKey, {
        storyId,
        region: activity.region ?? '',
        place: compactLocation ?? activity.location ?? '',
        location: activity.location ?? '',
        activityTitle: cardTitle,
        activityType: activity.title ?? activity.activityTitle ?? '',
        date: activity.date ?? activity.activityDate ?? '',
        visualMood: frameAtStart,
        frameStyle: 'pixel_art',
        decorationLevel: 1,
      });

      setAIDecorationUrl(result.url);
      setAIBaseFrame(frameAtStart);
      setAIFrameStatus('done');
      setSelectedFrame(AI_FRAME);
      showAIFrameToast('AI 프레임이 완성됐어요');

      const endedAt = performance.now();
      console.info('[AI Frame] generation completed', {
        storyId,
        frameStyle: 'pixel_art',
        frameType: frameAtStart,
        durationMs: Math.round(endedAt - startedAt),
        durationSec: Number(((endedAt - startedAt) / 1000).toFixed(2)),
      });
    } catch (error) {
      const failedAt = performance.now();
      console.error('[AI Frame] generation failed', {
        storyId,
        frameStyle: 'pixel_art',
        frameType: frameAtStart,
        durationMs: Math.round(failedAt - startedAt),
        durationSec: Number(((failedAt - startedAt) / 1000).toFixed(2)),
        error,
      });
      const message = error instanceof Error ? error.message : 'AI 프레임을 만들지 못했어요. 다시 시도해주세요.';
      setAIFrameStatus(hadAIFrameResult ? 'done' : 'error');
      showAIFrameToast(message || 'AI 프레임을 만들지 못했어요. 다시 시도해주세요.', 2800);
    }
  };

  const handleDownload = async () => {
    try {
      if (!cardPreviewRef.current) throw new Error('Card preview unavailable');
      const blob = await captureElementAsPng(cardPreviewRef.current, 2, { backgroundColor: 'transparent' });
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

  const renderBaseCard = (
    ref?: Ref<HTMLDivElement>,
    options: { frame?: FrameOption; showAIOverlay?: boolean } = {},
  ) => {
    const frame = options.frame ?? selectedFrame;
    const isDark = frame === '블랙';

    return (
    <div
      ref={ref}
      className="relative rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden p-4"
      style={{ width: '300px', ...getFrameStyle(frame) }}
    >
      <div className="relative aspect-[3/4] bg-white rounded-lg overflow-hidden mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <img
          src={photo}
          alt="Travel memory"
          className="w-full h-full object-cover"
        />
        {options.showAIOverlay && aiDecorationUrl && (
          <img
            src={aiDecorationUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
          />
        )}
      </div>
      <div className="px-1.5">
        <p className={`line-clamp-1 text-[13px] font-semibold leading-snug ${isDark ? 'text-white' : 'text-[#2a2a2a]'}`}>
          {cardTitle}
        </p>
        <div className="mt-3 space-y-1">
          {compactLocation && (
            <p className={`text-[11px] font-medium leading-[1.35] ${isDark ? 'text-white/80' : 'text-[#6f6f6f]'}`}>{compactLocation}</p>
          )}
          <p className={`text-[11px] font-normal leading-[1.35] ${isDark ? 'text-white/50' : 'text-[#b6b6b6]'}`}>{activity.date}</p>
        </div>
        <div className={`mt-3 border-t pt-2 ${isDark ? 'border-white/15' : 'border-black/5'}`}>
          <p className={`text-center text-[11px] opacity-70 ${isDark ? 'text-white' : 'text-[#5F6368]'}`}>시선</p>
        </div>
      </div>
    </div>
    );
  };

  const getFrameStyle = (frame: FrameOption = selectedFrame): React.CSSProperties => {
    switch (frame) {
      case '바다':
        return { background: 'linear-gradient(to bottom right, #eff6ff, #ecfeff)' };
      case '숲':
        return { background: 'linear-gradient(to bottom right, #f0fdf4, #ecfdf5)' };
      case '노을':
        return { background: 'linear-gradient(to bottom right, #fff7ed, #fdf2f8)' };
      case '블랙':
        return { background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)' };
      default:
        return { background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf8 100%)' };
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
              {frameOptions.map((frame) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => setSelectedFrame(frame)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    selectedFrame === frame
                      ? frame === AI_FRAME
                        ? 'bg-[#e8e6f5] text-[#5a56d0] shadow-[0_1px_3px_rgba(107,90,168,0.12)]'
                        : 'bg-[#a8d5ba] text-white shadow-[0_1px_3px_rgba(168,213,186,0.2)]'
                      : frame === AI_FRAME
                        ? 'bg-[#f8f8f5] text-[#9a92c8] hover:bg-[#f0edf8]'
                        : 'bg-[#f8f8f5] text-[#5a5a5a] hover:bg-[#e8f5ed]'
                  }`}
                >
                  {frame === AI_FRAME && <Sparkles className="h-3 w-3" strokeWidth={2} />}
                  {frame}
                </button>
              ))}

            </div>
          </section>

          {/* Card Preview */}
          <section>
            <div className="flex justify-center">
              {isAIResultVisible
                ? renderBaseCard(cardPreviewRef, { frame: aiBaseFrame, showAIOverlay: true })
                : renderBaseCard(cardPreviewRef)}
            </div>
          </section>

          {/* AI Frame button */}
          <section>
            <button
              type="button"
              onClick={handleGenerateAIFrame}
              disabled={isGeneratingAIFrame}
              aria-busy={isGeneratingAIFrame}
              aria-label="AI 프레임 만들기"
              className={`relative w-full py-3 rounded-xl overflow-hidden transition-all flex items-center justify-center gap-2 text-[13px] font-medium ${
                isGeneratingAIFrame
                  ? 'cursor-wait bg-[#efecfc] text-[#7b6cd4]'
                  : 'bg-[#efecfc] text-[#5a56d0] hover:bg-[#e5e1fa]'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAIFrame ? 'animate-spin' : ''}`} strokeWidth={2} />
              <span>
                {aiDecorationUrl ? '다시 만들기' : 'AI 프레임 만들기'}
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

      {aiFrameMessage && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 bottom-[120px] z-[90] -translate-x-1/2 rounded-full bg-[#2a2a2a]/90 px-5 py-3 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] animate-fade-in"
        >
          {aiFrameMessage}
        </div>
      )}

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
