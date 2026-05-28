import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, MapPin, Calendar, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';

interface StoryUploadViewProps {
  activity: any;
  onBack: () => void;
  onSave: () => void;
  onCreateCard: () => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  storyText: string;
  onTextChange: (text: string) => void;
  onNavigate: (screen: string) => void;
}

export function StoryUploadView({
  activity,
  onBack,
  onSave,
  onCreateCard,
  photos,
  onPhotosChange,
  storyText,
  onTextChange,
  onNavigate,
}: StoryUploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const previewUrl = URL.createObjectURL(file);
    onPhotosChange([previewUrl]);
    event.target.value = '';
  };

  const handleRemovePhoto = () => {
    onPhotosChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              <h2>스토리 업로드</h2>
            </div>
          </div>
        </header>

        <div className="px-6 py-5 space-y-6">
          {/* Selected Activity Info */}
          <section>
            <div className="bg-[#e8f5ed] rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm">
                <img
                  src={activity.imageUrl}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#2a2a2a] text-[14px] font-medium mb-1 line-clamp-1 leading-snug">{activity.title}</p>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#999]" strokeWidth={2} />
                    <span className="text-[11px] text-[#999] line-clamp-1">{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#999]" strokeWidth={2} />
                    <span className="text-[11px] text-[#999]">{activity.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Photo Upload */}
          <section>
            <div className="mb-3">
              <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">여행 사진</h4>
              <p className="text-[11px] text-[#bbb]">
                사진을 더하면 오늘의 장면이 조금 더 선명해져요
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photos.length === 0 ? (
              // Empty state
              <button
                type="button"
                onClick={handleAddPhoto}
                className="flex h-[128px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/10 bg-[#f8f8f5] transition-all hover:border-[#a8d5ba] hover:bg-[#e8f5ed]/30"
              >
                <ImageIcon className="h-8 w-8 text-[#aaa]" strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[#5a5a5a]">사진 추가하기</p>
                </div>
              </button>
            ) : (
              // Selected representative photo
              <div className="space-y-2.5">
                <div className="relative h-[128px] overflow-hidden rounded-2xl bg-[#f8f8f5]">
                  <img
                    src={photos[0]}
                    alt="선택한 여행 사진"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    aria-label="사진 삭제"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="w-full rounded-xl bg-[#f8f8f5] py-2.5 text-[13px] font-medium text-[#5a5a5a] transition-colors hover:bg-[#e8f5ed]"
                >
                  다른 사진 선택
                </button>
              </div>
            )}
          </section>

          {/* Text Input */}
          <section>
            <div className="mb-3.5">
              <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">기록</h4>
              <p className="text-[11px] text-[#bbb]">그날의 장면을 짧게 남겨보세요</p>
            </div>

            <textarea
              value={storyText}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="오늘 여행에서 기억에 남은 순간을 남겨보세요."
              className="w-full h-28 p-3.5 bg-white rounded-xl border border-black/10 text-[13px] leading-relaxed placeholder:text-[#bbb] outline-none focus:ring-1 focus:ring-[#a8d5ba]/40 transition-all resize-none"
              maxLength={300}
            />

            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[11px] text-[#bbb]">{storyText.length} / 300</span>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onSave}
              className="w-full bg-[#2a2a2a] text-white py-3.5 rounded-xl transition-all hover:bg-[#1a1a1a] text-[14px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            >
              업로드
            </button>

            <button
              type="button"
              onClick={onCreateCard}
              disabled={photos.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#17233d_0%,#2f4d78_52%,#6a5aa8_100%)] py-3.5 text-[14px] font-medium text-white shadow-[0_8px_18px_rgba(50,68,112,0.14)] transition-all hover:brightness-[1.04] active:scale-[0.99] disabled:bg-none disabled:bg-[#f1f1ec] disabled:text-[#b8b5ad] disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100"
            >
              <Sparkles className="w-4.5 h-4.5" strokeWidth={2} />
              <span>나만의 AI 카드 만들기</span>
            </button>
          </section>
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
