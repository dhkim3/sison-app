interface AICardPreviewProps {
  photoUrl?: string;
  activityTitle: string;
  date: string;
  locationLabel?: string;
  style?: 'polaroid' | 'film' | 'minimal' | 'postcard';
}

function TravelCardCaption({
  title,
  date,
  locationLabel,
  titleClassName = 'text-sm font-semibold text-[#2a2a2a]',
  signatureClassName = 'text-xs text-[#a8d5ba]',
}: {
  title: string;
  date: string;
  locationLabel?: string;
  titleClassName?: string;
  signatureClassName?: string;
}) {
  return (
    <div>
      <p className={`line-clamp-1 leading-snug ${titleClassName}`}>{title}</p>
      <div className="mt-3 space-y-1">
        {locationLabel && (
          <p className="text-xs font-medium leading-[1.35] text-[#6f6f6f]">{locationLabel}</p>
        )}
        <p className="text-xs font-normal leading-[1.35] text-[#b6b6b6]">{date}</p>
      </div>
      <div className="mt-3 border-t border-black/5 pt-2">
        <p className={`text-center ${signatureClassName} opacity-70`}>시선</p>
      </div>
    </div>
  );
}

export function AICardPreview({
  photoUrl,
  activityTitle,
  date,
  locationLabel,
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
                <span className="text-sm text-[#5F6368]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="pb-2 text-center">
            <TravelCardCaption title={activityTitle} date={date} locationLabel={locationLabel} />
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
                  <span className="text-sm text-[#5F6368]">사진을 선택해주세요</span>
                </div>
              )}
            </div>
            <div className="pb-1 text-center">
              <TravelCardCaption
                title={activityTitle}
                date={date}
                locationLabel={locationLabel}
                titleClassName="text-xs font-semibold text-[#2a2a2a]"
                signatureClassName="text-xs text-[#5F6368]"
              />
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
                <span className="text-sm text-[#5F6368]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="p-6">
            <TravelCardCaption title={activityTitle} date={date} locationLabel={locationLabel} />
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
                <span className="text-sm text-[#5F6368]">사진을 선택해주세요</span>
              </div>
            )}
          </div>
          <div className="bg-white p-5">
            <TravelCardCaption
              title={activityTitle}
              date={date}
              locationLabel={locationLabel}
              titleClassName="text-sm font-semibold italic text-[#2a2a2a]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
