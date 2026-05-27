import { useLayoutEffect } from 'react';

let lockCount = 0;
let lockedScrollY = 0;
let lastTouchY = 0;
let lockMode: 'ios-fixed' | 'standard' | null = null;

const originalBodyStyle = {
  height: '',
  left: '',
  overflow: '',
  paddingRight: '',
  position: '',
  right: '',
  top: '',
  width: '',
};

const originalHtmlStyle = {
  overflow: '',
  scrollbarGutter: '',
};

const getScrollableSheet = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLElement>('[data-bottom-sheet-scrollable="true"], .bottom-sheet-scrollable, .bottom-sheet-panel');
};

const isIOSBrowser = () => {
  if (typeof window === 'undefined') return false;

  const { platform, maxTouchPoints, userAgent } = window.navigator;
  return /iP(ad|hone|od)/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
};

const canScrollSheet = (sheet: HTMLElement, touchDeltaY: number) => {
  const maxScrollTop = sheet.scrollHeight - sheet.clientHeight;
  if (maxScrollTop <= 0) return false;

  if (touchDeltaY > 0) {
    return sheet.scrollTop > 0;
  }

  if (touchDeltaY < 0) {
    return sheet.scrollTop < maxScrollTop;
  }

  return true;
};

const handleTouchStart = (event: TouchEvent) => {
  lastTouchY = event.touches[0]?.clientY ?? 0;
};

const handleTouchMove = (event: TouchEvent) => {
  if (lockCount <= 0 || event.touches.length === 0) return;

  const currentTouchY = event.touches[0].clientY;
  const touchDeltaY = currentTouchY - lastTouchY;
  lastTouchY = currentTouchY;

  const scrollableSheet = getScrollableSheet(event.target);
  if (!scrollableSheet || !canScrollSheet(scrollableSheet, touchDeltaY)) {
    event.preventDefault();
  }
};

const lockBodyScroll = () => {
  if (typeof window === 'undefined') return;

  lockCount += 1;
  if (lockCount > 1) return;

  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  const shouldUseFixedLock = isIOSBrowser();
  lockedScrollY = window.scrollY;
  lockMode = shouldUseFixedLock ? 'ios-fixed' : 'standard';

  originalBodyStyle.left = body.style.left;
  originalBodyStyle.height = body.style.height;
  originalBodyStyle.overflow = body.style.overflow;
  originalBodyStyle.paddingRight = body.style.paddingRight;
  originalBodyStyle.position = body.style.position;
  originalBodyStyle.right = body.style.right;
  originalBodyStyle.top = body.style.top;
  originalBodyStyle.width = body.style.width;
  originalHtmlStyle.overflow = documentElement.style.overflow;
  originalHtmlStyle.scrollbarGutter = documentElement.style.scrollbarGutter;

  documentElement.style.overflow = 'hidden';
  documentElement.style.scrollbarGutter = 'stable both-edges';
  documentElement.classList.add('bottom-sheet-scroll-locked');
  body.classList.add('bottom-sheet-scroll-locked');
  body.style.overflow = 'hidden';

  if (shouldUseFixedLock) {
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.height = '100%';
  }

  if (scrollbarWidth > 0 && !window.CSS?.supports('scrollbar-gutter: stable')) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  if (shouldUseFixedLock) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
  }
};

const unlockBodyScroll = () => {
  if (typeof window === 'undefined' || lockCount <= 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const { body, documentElement } = document;
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  const shouldRestoreScrollPosition = lockMode === 'ios-fixed';

  documentElement.style.overflow = originalHtmlStyle.overflow;
  documentElement.style.scrollbarGutter = originalHtmlStyle.scrollbarGutter;
  documentElement.classList.remove('bottom-sheet-scroll-locked');
  body.classList.remove('bottom-sheet-scroll-locked');
  body.style.height = originalBodyStyle.height;
  body.style.position = originalBodyStyle.position;
  body.style.top = originalBodyStyle.top;
  body.style.left = originalBodyStyle.left;
  body.style.right = originalBodyStyle.right;
  body.style.width = originalBodyStyle.width;
  body.style.overflow = originalBodyStyle.overflow;
  body.style.paddingRight = originalBodyStyle.paddingRight;
  lockMode = null;

  if (shouldRestoreScrollPosition) {
    window.scrollTo(0, lockedScrollY);
  }
};

export function useBottomSheetScrollLock(isOpen: boolean) {
  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    lockBodyScroll();
    return unlockBodyScroll;
  }, [isOpen]);
}
