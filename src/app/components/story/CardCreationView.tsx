import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { getCompactLocationLabel } from '../TravelCardCarousel';
import { captureElementAsPng, downloadBlob } from '../../utils/captureElementAsImage';
import { getDeviceKey, storyApi } from '../../storyInteractionState';
import {
  makeAIFrameJobTargetKey,
  startAIFrameJob,
  useAIFrameJob,
} from '../../aiFrameJobState';

interface CardCreationViewProps {
  activity: any;
  photo: string;
  storyTitle?: string;
  storyId?: number;
  onBack: () => void;
  onSaved?: () => void;
  onNavigate: (screen: string, options?: { savedTab?: 0 | 1 | 2 }) => void;
  onActiveAIFrameTargetChange?: (targetKey: string | null) => void;
  onDismissAIFrameJob?: (jobId: string) => void;
  onSaveTravelCard?: (card: {
    id: number | string;
    storyId: number | null;
    title: string;
    subtitle: string;
    imageUrl: string;
    createdAt: string;
    frameType?: string;
    cardPreviewDataUrl?: string;
    finalCardImageUrl?: string;
    aiFrameBackgroundUrl?: string | null;
    aiFrameOverlayUrl?: string | null;
    photoUrl?: string;
    region?: string;
    date?: string;
  }) => void;
}

const BASE_FRAMES = ['기본', '바다', '숲', '노을', '블랙'];
const AI_FRAME = 'AI';
const FRAME_ID_KEYS: Record<string, string> = {
  기본: 'default',
  바다: 'sea',
  숲: 'forest',
  노을: 'sunset',
  블랙: 'black',
  [AI_FRAME]: 'ai',
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('Card image encoding failed'));
  };
  reader.onerror = () => reject(new Error('Card image encoding failed'));
  reader.readAsDataURL(blob);
});

export function CardCreationView({
  activity,
  photo,
  storyTitle = '',
  storyId,
  onBack,
  onNavigate,
  onActiveAIFrameTargetChange,
  onDismissAIFrameJob,
  onSaveTravelCard,
}: CardCreationViewProps) {
  const [downloadMessage, setDownloadMessage] = useState('');
  const [isAIFrameStartToastVisible, setIsAIFrameStartToastVisible] = useState(false);
  const [isSaveCompletePromptVisible, setIsSaveCompletePromptVisible] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const aiFrameStartToastTimerRef = useRef<number | null>(null);
  const deviceKey = getDeviceKey();

  const compactLocation = getCompactLocationLabel(activity.location) || activity.region;
  const cardTitle = storyTitle.trim() || `"${activity.region}에서 남긴 작은 시선"`;
  const aiFrameTargetKey = makeAIFrameJobTargetKey({ storyId, activity, photo, storyTitle });
  const aiFrameJob = useAIFrameJob(aiFrameTargetKey);
  const aiFrameStatus = aiFrameJob?.status ?? 'idle';
  const aiFrameBackgroundUrl = aiFrameJob?.backgroundUrl ?? null;
  const errorMessage = aiFrameJob?.status === 'error' ? aiFrameJob.errorMessage : '';
  const [selectedFrame, setSelectedFrame] = useState<string>(() => (aiFrameJob ? AI_FRAME : '기본'));
  const didAutoSelectAIFrameRef = useRef(false);
  const isDarkFrame = selectedFrame === '블랙';
  const isAiFrameSelected = selectedFrame === AI_FRAME;
  const isGeneratingAIFrame = aiFrameStatus === 'generating';
  const isAiFrameReady = isAiFrameSelected && aiFrameStatus === 'ready' && !!aiFrameBackgroundUrl;
  const shouldShowAIFrameOption = aiFrameStatus !== 'idle' || isAiFrameSelected || !!aiFrameBackgroundUrl;
  const shouldShowAIPreviewAnimation = isGeneratingAIFrame && isAiFrameSelected;

  useEffect(() => {
    onActiveAIFrameTargetChange?.(aiFrameTargetKey);
    return () => {
      onActiveAIFrameTargetChange?.(null);
    };
  }, [aiFrameTargetKey, onActiveAIFrameTargetChange]);

  useEffect(() => {
    if (!aiFrameJob || didAutoSelectAIFrameRef.current) return;
    setSelectedFrame(AI_FRAME);
    didAutoSelectAIFrameRef.current = true;
  }, [aiFrameJob]);

  useEffect(() => {
    return () => {
      if (aiFrameStartToastTimerRef.current !== null) {
        window.clearTimeout(aiFrameStartToastTimerRef.current);
      }
    };
  }, []);

  const showAIFrameStartToast = () => {
    setIsAIFrameStartToastVisible(true);

    if (aiFrameStartToastTimerRef.current !== null) {
      window.clearTimeout(aiFrameStartToastTimerRef.current);
    }

    aiFrameStartToastTimerRef.current = window.setTimeout(() => {
      setIsAIFrameStartToastVisible(false);
      aiFrameStartToastTimerRef.current = null;
    }, 2600);
  };

  const handleGenerateAIFrame = () => {
    if (isGeneratingAIFrame) return;
    setSelectedFrame(AI_FRAME);
    didAutoSelectAIFrameRef.current = true;
    showAIFrameStartToast();
    startAIFrameJob({
      deviceKey,
      storyId,
      photo,
      activity,
      storyTitle,
    });
  };

  const dismissCurrentAIFrameJob = () => {
    if (!aiFrameJob || aiFrameJob.status === 'error') return;
    onDismissAIFrameJob?.(aiFrameJob.jobId);
  };

  const handleBack = () => {
    dismissCurrentAIFrameJob();
    onBack();
  };

  const handleDownload = async () => {
    if (isSavingCard) return;

    setIsSavingCard(true);
    setDownloadMessage('');
    setIsSaveCompletePromptVisible(false);

    try {
      // 클라이언트에서 합성한 카드 전체를 캡처한다. AI 이미지는 장식 레이어로만 포함된다.
      const previewElement = cardPreviewRef.current;
      if (!previewElement) throw new Error('Card preview unavailable');
      const captureBackground = isDarkFrame ? '#0a0a0a' : '#ffffff';
      const blob = await captureElementAsPng(previewElement, 2, { backgroundColor: captureBackground });
      const imageUrl = await blobToDataUrl(blob);
      const compactImageUrlPromise = captureElementAsPng(previewElement, 1, { backgroundColor: captureBackground })
        .then(blobToDataUrl)
        .catch((compactCaptureError) => {
          console.error('card compact capture failed, using full capture for server retry', compactCaptureError);
          return imageUrl;
        });
      downloadBlob(blob, `sison-card-${storyId ?? activity.id ?? 'my-card'}.png`);
      const activityId = Number(activity.id);
      const sourceId = storyId ?? (Number.isFinite(activityId) && activityId > 0 ? activityId : 'draft');
      const frameKey = FRAME_ID_KEYS[selectedFrame] || 'custom';
      const uniqueCardSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const savedCardId = `${sourceId}-${frameKey}-${uniqueCardSuffix}`;
      const draftCard = {
        id: savedCardId,
        storyId: storyId ?? null,
        title: cardTitle,
        subtitle: compactLocation || activity.region || '',
        imageUrl,
        frameType: selectedFrame,
        cardPreviewDataUrl: imageUrl,
        finalCardImageUrl: imageUrl,
        aiFrameBackgroundUrl,
        photoUrl: photo,
        region: activity.region || '',
        date: activity.date || '',
        createdAt: new Date().toISOString(),
      };
      let savedCard: Awaited<ReturnType<typeof storyApi.saveCard>>;
      try {
        savedCard = await storyApi.saveCard(deviceKey, draftCard);
      } catch (serverSaveError) {
        console.error('card server save failed, retrying with compact capture', serverSaveError);
        const compactImageUrl = await compactImageUrlPromise;
        savedCard = await storyApi.saveCard(deviceKey, {
          ...draftCard,
          imageUrl: compactImageUrl,
          cardPreviewDataUrl: compactImageUrl,
          finalCardImageUrl: compactImageUrl,
        });
      }
      onSaveTravelCard?.({
        ...draftCard,
        ...savedCard,
        frameType: savedCard.frameType || draftCard.frameType,
        photoUrl: savedCard.photoUrl || draftCard.photoUrl,
        region: savedCard.region || draftCard.region,
        date: savedCard.date || draftCard.date,
        cardPreviewDataUrl: savedCard.cardPreviewDataUrl || savedCard.finalCardImageUrl || savedCard.imageUrl,
        finalCardImageUrl: savedCard.finalCardImageUrl || savedCard.cardPreviewDataUrl || savedCard.imageUrl,
      });
      setDownloadMessage('');
      setIsSaveCompletePromptVisible(true);
      dismissCurrentAIFrameJob();
    } catch (error) {
      console.error('card save failed', error);
      setIsSaveCompletePromptVisible(false);
      setDownloadMessage('카드를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      window.setTimeout(() => setDownloadMessage(''), 2200);
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleViewSavedCards = () => {
    setIsSaveCompletePromptVisible(false);
    onNavigate('saved', { savedTab: 2 });
  };

  const getFrameStyle = (): React.CSSProperties => {
    if (selectedFrame === AI_FRAME) {
      if (aiFrameStatus !== 'idle') {
        return { background: '#ffffff' };
      }
      return { background: 'linear-gradient(180deg, #fdfcfa 0%, #f8f8f5 100%)' };
    }
    switch (selectedFrame) {
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
                onClick={handleBack}
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

              {shouldShowAIFrameOption && (
                <button
                  type="button"
                  onClick={() => setSelectedFrame(AI_FRAME)}
                  className={`ai-frame-option-enter flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    selectedFrame === AI_FRAME
                      ? 'bg-[#e8e6f5] text-[#5a56d0] shadow-[0_1px_3px_rgba(107,90,168,0.12)]'
                      : 'bg-[#f8f8f5] text-[#9a92c8] hover:bg-[#f0edf8]'
                  }`}
                >
                  <Sparkles
                    className={`w-3 h-3 ${isGeneratingAIFrame ? 'ai-frame-tab-sparkle-active' : ''}`}
                    strokeWidth={2}
                  />
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
                className="relative overflow-hidden rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                style={{ width: '300px', ...getFrameStyle() }}
              >
                {isAiFrameReady && aiFrameBackgroundUrl && (
                  <img
                    key={aiFrameBackgroundUrl}
                    src={aiFrameBackgroundUrl}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill [-webkit-user-drag:none]"
                  />
                )}

                <div className="relative z-10 mb-3">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    <img
                      src={photo}
                      alt="Travel memory"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {shouldShowAIPreviewAnimation && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[25] rounded-xl ai-frame-preview-aurora-border"
                  />
                )}

                <div className="relative z-20">
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
                    <div className={`mt-3 pt-2 ${isDarkFrame ? 'border-t border-white/15' : 'border-t border-black/10'}`}>
                      <p className={`text-center text-[11px] opacity-70 ${isDarkFrame ? 'text-white' : 'text-[#5F6368]'}`}>시선</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Frame button */}
          <section>
            <button
              type="button"
              onClick={handleGenerateAIFrame}
              disabled={isGeneratingAIFrame}
              aria-busy={isGeneratingAIFrame}
              aria-label={isGeneratingAIFrame ? 'AI 프레임 생성 중' : aiFrameStatus === 'ready' ? '다시 만들기' : 'AI 프레임 만들기'}
              className={`relative h-11 w-full overflow-hidden rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] font-medium ${
                isGeneratingAIFrame
                  ? 'cursor-wait border border-[rgba(139,109,255,0.18)] bg-[#f5f1ff] text-[#5F4BDB] shadow-none'
                  : 'bg-[#efecfc] text-[#5a56d0] hover:bg-[#e5e1fa]'
              }`}
            >
              {isGeneratingAIFrame ? (
                <>
                  <span aria-hidden="true" className="ai-frame-button-premium-bg" />
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <span>AI 프레임 만드는 중</span>
                    <span aria-hidden="true" className="ai-frame-button-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                  <span>{aiFrameStatus === 'ready' ? '다시 만들기' : 'AI 프레임 만들기'}</span>
                </>
              )}
            </button>
            {errorMessage && (
              <p className="mt-2 text-center text-[12px] leading-5 text-[#b76e65]" role="status" aria-live="polite">
                {errorMessage}
              </p>
            )}
          </section>

          {/* Download */}
          <section className="!-mt-3 space-y-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isSavingCard}
              aria-busy={isSavingCard}
              className="w-full bg-white border border-black/10 text-[#2a2a2a] py-3.5 rounded-xl transition-all hover:bg-[#f8f8f5] disabled:cursor-wait disabled:bg-[#f5f3ee] disabled:text-[#8d8982] flex items-center justify-center gap-2 text-[14px] font-medium"
            >
              {isSavingCard ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border-2 border-[#c7c2b8] border-t-[#6f6a61] animate-spin"
                  />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5" strokeWidth={2} />
                  <span>저장</span>
                </>
              )}
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

      {isAIFrameStartToastVisible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[90] flex justify-center px-5">
          <div
            className="w-full max-w-[340px] rounded-2xl border border-white/55 bg-[#2f3430]/92 px-4 py-3 text-white shadow-[0_10px_30px_rgba(34,39,34,0.18)] backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <p className="text-[13px] font-semibold leading-5">AI 프레임을 만들고 있어요</p>
            <p className="mt-0.5 text-[12px] leading-5 text-white/72">다른 탭을 둘러보셔도 괜찮아요.</p>
          </div>
        </div>
      )}

      {isSaveCompletePromptVisible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[95] flex justify-center px-5">
          <div
            className="pointer-events-auto w-full max-w-[340px] rounded-2xl border border-white/55 bg-[#2f3430]/92 px-4 py-3 text-white shadow-[0_10px_30px_rgba(34,39,34,0.18)] backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <p className="text-[13px] font-semibold leading-5">여행 카드가 저장됐어요</p>
            <p className="mt-0.5 text-[12px] leading-5 text-white/72">나중에 저장 탭에서 다시 볼 수 있어요.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setIsSaveCompletePromptVisible(false)}
                className="flex-1 rounded-xl bg-white/12 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/18"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={handleViewSavedCards}
                className="flex-1 rounded-xl bg-white py-2.5 text-[12.5px] font-semibold text-[#2f3430] transition-colors hover:bg-[#f2f2ee]"
              >
                저장 탭으로
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
