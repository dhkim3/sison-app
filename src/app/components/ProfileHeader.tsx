import { Camera } from 'lucide-react';

interface ProfileHeaderProps {
  imageUrl?: string;
  nickname: string;
  bio: string;
}

export function ProfileHeader({ imageUrl, nickname, bio }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="relative mb-4">
        <div className="w-24 h-24 rounded-full bg-[#f0f0eb] overflow-hidden shadow-sm">
          {imageUrl ? (
            <img src={imageUrl} alt={nickname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-9 h-9 text-[#d0d0c8]" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>
      <h3 className="text-[#2a2a2a] mb-2">{nickname}</h3>
      <p className="text-sm text-[#999] leading-relaxed max-w-xs">
        {bio}
      </p>
    </div>
  );
}
