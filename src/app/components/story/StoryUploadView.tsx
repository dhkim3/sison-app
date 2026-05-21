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
  const MAX_PHOTOS = 5;

  const handleAddPhoto = () => {
    // Mock photo upload - in real app, this would open gallery
    if (photos.length < MAX_PHOTOS) {
      const mockPhotoUrl =
        activity?.imageUrl ||
        'https://images.unsplash.com/photo-1565803974275-dccd2f933cbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';
      onPhotosChange([...photos, mockPhotoUrl]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  // Auto-generate tags based on activity
  const suggestedTags = [
    `#${activity.region}`,
    '#바다',
    '#환경정화',
    `#${activity.region}여행`,
  ];

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
              <h2>스토리 만들기</h2>
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
            <div className="mb-3.5">
              <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">여행 사진</h4>
              <p className="text-[11px] text-[#bbb]">
                최대 {MAX_PHOTOS}장까지 선택할 수 있어요 ({photos.length} / {MAX_PHOTOS})
              </p>
            </div>

            {photos.length === 0 ? (
              // Empty state
              <button
                onClick={handleAddPhoto}
                className="w-full aspect-[4/3] bg-[#f8f8f5] rounded-2xl border-2 border-dashed border-black/10 hover:border-[#a8d5ba] hover:bg-[#e8f5ed]/30 transition-all flex flex-col items-center justify-center gap-3"
              >
                <ImageIcon className="w-12 h-12 text-[#999]" strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-[13px] text-[#5a5a5a] mb-0.5">여행 중 남긴 사진을 선택해주세요</p>
                  <p className="text-[11px] text-[#999]">갤러리에서 선택</p>
                </div>
              </button>
            ) : (
              // Photos grid
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" strokeWidth={2} />
                    </button>
                  </div>
                ))}

                {/* Add more button */}
                {photos.length < MAX_PHOTOS && (
                  <button
                    onClick={handleAddPhoto}
                    className="aspect-square bg-[#f8f8f5] rounded-xl border-2 border-dashed border-black/10 hover:border-[#a8d5ba] hover:bg-[#e8f5ed]/30 transition-all flex items-center justify-center"
                  >
                    <ImageIcon className="w-8 h-8 text-[#bbb]" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Text Input */}
          {photos.length > 0 && (
            <section>
              <div className="mb-3.5">
                <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">기록</h4>
                <p className="text-[11px] text-[#bbb]">그날의 장면을 짧게 남겨보세요</p>
              </div>

              <textarea
                value={storyText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="오전 봉사 후 가까운 맛집에서 점심을 즐기고, 오후엔 여유롭게 산책했어요..."
                className="w-full h-28 p-3.5 bg-white rounded-xl border border-black/10 text-[13px] leading-relaxed placeholder:text-[#bbb] outline-none focus:ring-1 focus:ring-[#a8d5ba]/40 transition-all resize-none"
                maxLength={300}
              />

              <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] text-[#bbb]">{storyText.length} / 300</span>
              </div>
            </section>
          )}

          {/* Suggested Tags */}
          {photos.length > 0 && (
            <section>
              <div className="mb-3">
                <h4 className="text-[#2a2a2a] mb-0.5 font-semibold">추천 태그</h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag, index) => (
                  <button
                    key={index}
                    className="px-3 py-1.5 bg-[#e8f5ed] text-[#5a5a5a] text-[13px] font-medium rounded-full hover:bg-[#a8d5ba] hover:text-white transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Action Buttons */}
          {photos.length > 0 && (
            <section className="space-y-2.5 pt-2">
              <button
                onClick={onSave}
                className="w-full bg-[#2a2a2a] text-white py-3.5 rounded-xl transition-all hover:bg-[#1a1a1a] text-[14px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              >
                스토리 저장하기
              </button>

              <button
                onClick={onCreateCard}
                className="w-full bg-[#e8f5ed] text-[#5a5a5a] py-3.5 rounded-xl transition-all hover:bg-[#a8d5ba] hover:text-white flex items-center justify-center gap-2 text-[14px] font-medium"
              >
                <Sparkles className="w-4.5 h-4.5" strokeWidth={2} />
                <span>카드 만들기</span>
              </button>
            </section>
          )}
        </div>
      </PageShell>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
