import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

interface ProfileHeaderProps {
  imageUrl?: string;
  nickname: string;
  bio: string;
  onImageChange: (file: File) => void;
  onNicknameChange: (value: string) => void;
  onBioClick: () => void;
}

export function ProfileHeader({
  imageUrl,
  nickname,
  bio,
  onImageChange,
  onNicknameChange,
  onBioClick,
}: ProfileHeaderProps) {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingNickname) {
      nicknameInputRef.current?.focus();
      nicknameInputRef.current?.select();
    }
  }, [isEditingNickname]);

  const handleNicknameBlur = () => {
    if (nickname.trim().length === 0) {
      onNicknameChange('여행자');
    }

    setIsEditingNickname(false);
  };

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative block w-24 h-24 rounded-full bg-[#f0f0eb] overflow-hidden shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#a8d5ba]/40"
          aria-label="프로필 사진 변경"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={nickname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-9 h-9 text-[#d0d0c8]" strokeWidth={1.5} />
            </div>
          )}
          <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm">
            <Camera className="h-3.5 w-3.5 text-[#6fa985]" strokeWidth={1.8} />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImageChange(file);
            }
            event.target.value = '';
          }}
        />
      </div>
      {isEditingNickname ? (
        <input
          ref={nicknameInputRef}
          type="text"
          value={nickname}
          maxLength={16}
          onChange={(event) => onNicknameChange(event.target.value)}
          onBlur={handleNicknameBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          className="mb-2 w-40 rounded-full bg-white px-3 py-1.5 text-center text-[17px] font-semibold text-[#2a2a2a] outline-none ring-1 ring-[#a8d5ba]/35 transition-shadow focus:ring-[#a8d5ba]/70"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditingNickname(true)}
          className="mb-2 rounded-full px-2 py-1 text-[17px] font-semibold text-[#2a2a2a] transition-colors hover:bg-black/[0.03]"
        >
          {nickname}
        </button>
      )}
      <button
        type="button"
        onClick={onBioClick}
        className="max-w-xs rounded-2xl px-3 py-1.5 text-sm leading-relaxed text-[#999] transition-colors hover:bg-white/70 hover:text-[#777]"
      >
        {bio}
      </button>
    </div>
  );
}
