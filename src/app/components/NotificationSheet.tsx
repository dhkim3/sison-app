import { X } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { NotificationSection } from './NotificationSection';
import { useBottomSheetScrollLock } from './useBottomSheetScrollLock';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSheet({ isOpen, onClose }: NotificationSheetProps) {
  useBottomSheetScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="bottom-sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] overflow-hidden rounded-t-[2rem] bg-[#fdfcfa] shadow-2xl animate-slide-up">
        <div className="pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#dedbd3]" />
        </div>

        <div className="flex items-start justify-between px-6 pb-4 pt-5">
          <div>
            <h3 className="text-[20px] font-semibold leading-tight text-[#2a2a2a]">알림</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8c8c8c]">
              필요한 소식만 모았어요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="알림 닫기"
            className="ml-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#5a5a5a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f6f5f0]"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div
          className="bottom-sheet-scrollable max-h-[66vh] overflow-y-auto px-5 pb-safe"
          data-bottom-sheet-scrollable="true"
        >
          <div className="space-y-6 border-t border-black/5 pt-5">
            <NotificationSection title="오늘">
              <NotificationItem
                title="광안리 해변 정화 활동이 내일 마감돼요"
                description="부산 여행 일정에 맞춰 가볍게 참여할 수 있어요."
                time="오전 9:20"
                unread
              />
            </NotificationSection>

            <NotificationSection title="이번 주">
              <NotificationItem
                title="제주 여행 일정에 새 활동을 넣었어요"
                description="숙소 근처에서 참여 가능한 짧은 활동을 확인해보세요."
                time="화요일"
                unread
              />
              <NotificationItem
                title="이번 주말, 강릉 안목해변에서 참여 가능한 활동이 있어요"
                description="바다 산책과 함께할 수 있는 활동이에요."
                time="월요일"
              />
            </NotificationSection>

            <NotificationSection title="이전">
              <NotificationItem
                title="지난 여행 기록을 카드로 남겨볼까요?"
                description="남겨둔 사진과 활동 기록으로 여행 카드를 만들 수 있어요."
                time="5월 18일"
              />
            </NotificationSection>
          </div>
        </div>
      </div>
    </>
  );
}
