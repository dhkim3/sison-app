interface AICardPreviewProps {
  photoUrl?: string;
  activityTitle: string;
  date: string;
  style?: 'polaroid' | 'film' | 'minimal' | 'postcard';
}

export function AICardPreview({
  photoUrl,
  activityTitle,
  date,
  style = 'polaroid',
}: AICardPreviewProps) {
  const isPolaroid = style === 'polaroid';
  const isFilm = style === 'film';
  const isMinimal = style === 'minimal';
  const isPostcard = style === 'postcard';

  return (
    <div className="flex items-center justify-center py-8">
      {/* Polaroid Style */}
      {isPolaroid && (
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg p-4">
          <div className="aspect-square bg-[#f8f8f5] rounded-xl overflow-hidden mb-4">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm text-[#999]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="text-center space-y-1 pb-2">
            <p className="text-sm text-[#2a2a2a]">{activityTitle}</p>
            <p className="text-xs text-[#999]">{date}</p>
            <p className="text-xs text-[#a8d5ba] mt-2">시선</p>
          </div>
        </div>
      )}

      {/* Film Style */}
      {isFilm && (
        <div className="w-full max-w-xs">
          <div className="bg-[#2a2a2a] rounded-t-2xl px-3 py-2 flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white/20 rounded-full" />
            ))}
          </div>
          <div className="bg-white rounded-b-2xl shadow-lg p-3">
            <div className="aspect-[3/2] bg-[#f8f8f5] rounded-lg overflow-hidden mb-3">
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm text-[#999]">사진을 선택해주세요</span>
                </div>
              )}
            </div>
            <div className="text-center space-y-0.5 pb-1">
              <p className="text-xs text-[#2a2a2a]">{activityTitle}</p>
              <p className="text-xs text-[#999]">{date} · 시선</p>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Style */}
      {isMinimal && (
        <div className="w-full max-w-xs bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="aspect-square bg-[#f8f8f5] overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm text-[#999]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="p-6 space-y-2">
            <p className="text-sm text-[#2a2a2a]">{activityTitle}</p>
            <p className="text-xs text-[#999]">{date}</p>
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-[#a8d5ba]">시선</p>
            </div>
          </div>
        </div>
      )}

      {/* Postcard Style */}
      {isPostcard && (
        <div className="w-full max-w-xs bg-[#fdfcfa] rounded-2xl shadow-lg overflow-hidden border-2 border-[#a8d5ba]/30">
          <div className="aspect-[3/2] bg-[#f8f8f5] overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm text-[#999]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="p-5 space-y-2 bg-white">
            <p className="text-sm text-[#2a2a2a] italic">{activityTitle}</p>
            <div className="flex items-center justify-between text-xs text-[#999]">
              <span>{date}</span>
              <span className="text-[#a8d5ba]">시선</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
