import { Camera, Plus, X } from 'lucide-react';

interface PhotoUploadProps {
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onAddPhoto, onRemovePhoto, maxPhotos = 5 }: PhotoUploadProps) {
  const canAddMore = photos.length < maxPhotos;

  return (
    <div>
      {/* Upload Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-[#f8f8f5]">
            <img src={photo} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => onRemovePhoto(index)}
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" strokeWidth={2} />
            </button>
          </div>
        ))}

        {/* Upload Button */}
        {canAddMore && (
          <button
            onClick={onAddPhoto}
            className="aspect-square rounded-2xl bg-[#f8f8f5] border-2 border-dashed border-[#e0e0e0] flex flex-col items-center justify-center gap-2 hover:border-[#a8d5ba] transition-colors"
          >
            <Camera className="w-6 h-6 text-[#5F6368]" strokeWidth={2} />
            <span className="text-xs text-[#5F6368]">{photos.length}/{maxPhotos}</span>
          </button>
        )}
      </div>

      {/* Upload Button */}
      {photos.length === 0 && (
        <button
          onClick={onAddPhoto}
          className="w-full mt-3 py-4 rounded-2xl bg-white border border-black/10 hover:border-[#a8d5ba] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 text-[#5a5a5a]" strokeWidth={2} />
          <span className="text-sm text-[#5a5a5a]">갤러리에서 사진 선택</span>
        </button>
      )}
    </div>
  );
}
