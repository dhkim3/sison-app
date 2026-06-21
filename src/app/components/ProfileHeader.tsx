interface ProfileHeaderProps {
  imageUrl?: string;
  nickname: string;
  bio: string;
  onEditClick: () => void;
}

export function ProfileHeader({
  imageUrl,
  nickname,
  bio,
  onEditClick,
}: ProfileHeaderProps) {
  return (
    <div className="px-5 py-6 text-center">
      <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-[#f0f0eb] shadow-sm">
        {imageUrl ? (
          <img src={imageUrl} alt={nickname} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#eef5ef] text-[28px] font-semibold text-[#8ab99d]">
            {nickname.slice(0, 1)}
          </div>
        )}
      </div>
      <p className="text-[18px] font-semibold leading-tight text-[#2a2a2a]">{nickname}</p>
      <p className="mx-auto mt-2 max-w-[260px] text-[14px] leading-6 text-[#5F6368]">{bio}</p>
      <button
        type="button"
        onClick={onEditClick}
        className="mt-5 rounded-full border border-black/5 bg-[#f8f8f5] px-4 py-2 text-[13px] font-medium text-[#5f7f6a] transition-colors hover:bg-[#f1f6f2]"
      >
        프로필 편집
      </button>
    </div>
  );
}
