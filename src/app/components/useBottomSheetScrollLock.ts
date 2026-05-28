import { useLayoutEffect, useRef } from 'react';

const activeLockIds = new Set<symbol>();
let lockedScrollY = 0;
let lastTouchY = 0;
let lockMode: 'ios-fixed' | 'standard' | null = null;
const lockClassName = 'bottom-sheet-scroll-locked';
const viewportHeightVariable = '--sison-viewport-height';

const originalBodyStyle = {
  height: '',
  left: '',
  overflow: '',
  position: '',
  right: '',
  top: '',
  width: '',
};

const originalHtmlStyle = {
  overflow: '',
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
  if (activeLockIds.size === 0 || event.touches.length === 0) return;

  const currentTouchY = event.touches[0].clientY;
  const touchDeltaY = currentTouchY - lastTouchY;
  lastTouchY = currentTouchY;

  const scrollableSheet = getScrollableSheet(event.target);
  if (!scrollableSheet || !canScrollSheet(scrollableSheet, touchDeltaY)) {
    event.preventDefault();
  }
};

const updateViewportHeight = () => {
  if (typeof window === 'undefined') return;

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(viewportHeightVariable, `${viewportHeight}px`);
};

const addViewportHeightListeners = () => {
  updateViewportHeight();
  window.addEventListener('resize', updateViewportHeight);
  window.visualViewport?.addEventListener('resize', updateViewportHeight);
  window.visualViewport?.addEventListener('scroll', updateViewportHeight);
};

const removeViewportHeightListeners = () => {
  window.removeEventListener('resize', updateViewportHeight);
  window.visualViewport?.removeEventListener('resize', updateViewportHeight);
  window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
  // CSS 변수는 App.tsx에서 항상 유지하므로 여기서 제거하지 않음
};

export const clearStaleScrollLock = () => {
  if (typeof window === 'undefined') return;

  const activeSheet = document.querySelector('.bottom-sheet-panel');
  if (activeLockIds.size > 0 && activeSheet) return;

  const { body, documentElement } = document;
  const hasStaleLock =
    body.classList.contains(lockClassName) ||
    documentElement.classList.contains(lockClassName) ||
    body.style.overflow === 'hidden' ||
    documentElement.style.overflow === 'hidden';

  if (!hasStaleLock) return;

  const shouldRestoreScroll = lockMode === 'ios-fixed';
  const scrollToRestore = lockedScrollY;

  activeLockIds.clear();
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  removeViewportHeightListeners();
  documentElement.classList.remove(lockClassName);
  body.classList.remove(lockClassName);
  documentElement.style.overflow = '';
  body.style.height = '';
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  lockMode = null;

  if (shouldRestoreScroll) {
    window.scrollTo(0, scrollToRestore);
  }
};

const lockBodyScroll = (lockId: symbol) => {
  if (typeof window === 'undefined') return;

  clearStaleScrollLock();

  if (activeLockIds.has(lockId)) return;

  activeLockIds.add(lockId);
  if (activeLockIds.size > 1) return;

  const { body, documentElement } = document;
  const shouldUseFixedLock = isIOSBrowser();
  lockedScrollY = window.scrollY;
  lockMode = shouldUseFixedLock ? 'ios-fixed' : 'standard';
  addViewportHeightListeners();

  originalBodyStyle.left = body.style.left;
  originalBodyStyle.height = body.style.height;
  originalBodyStyle.overflow = body.style.overflow;
  originalBodyStyle.position = body.style.position;
  originalBodyStyle.right = body.style.right;
  originalBodyStyle.top = body.style.top;
  originalBodyStyle.width = body.style.width;
  originalHtmlStyle.overflow = documentElement.style.overflow;

  documentElement.style.overflow = 'hidden';
  documentElement.classList.add(lockClassName);
  body.classList.add(lockClassName);
  body.style.overflow = 'hidden';

  if (shouldUseFixedLock) {
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.height = '100%';
  }

  if (shouldUseFixedLock) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
  }
};

const unlockBodyScroll = (lockId: symbol) => {
  if (typeof window === 'undefined') return;

  if (!activeLockIds.has(lockId)) {
    clearStaleScrollLock();
    return;
  }

  activeLockIds.delete(lockId);
  if (activeLockIds.size > 0) return;

  const { body, documentElement } = document;
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  removeViewportHeightListeners();
  const shouldRestoreScrollPosition = lockMode === 'ios-fixed';

  documentElement.style.overflow = originalHtmlStyle.overflow;
  documentElement.classList.remove(lockClassName);
  body.classList.remove(lockClassName);
  body.style.height = originalBodyStyle.height;
  body.style.position = originalBodyStyle.position;
  body.style.top = originalBodyStyle.top;
  body.style.left = originalBodyStyle.left;
  body.style.right = originalBodyStyle.right;
  body.style.width = originalBodyStyle.width;
  body.style.overflow = originalBodyStyle.overflow;
  lockMode = null;

  if (shouldRestoreScrollPosition) {
    window.scrollTo(0, lockedScrollY);
  }
};

export function useBottomSheetScrollLock(isOpen: boolean) {
  const lockIdRef = useRef<symbol | null>(null);

  if (!lockIdRef.current) {
    lockIdRef.current = Symbol('bottom-sheet-scroll-lock');
  }

  useLayoutEffect(() => {
    const lockId = lockIdRef.current;
    if (!lockId) return undefined;

    if (!isOpen) {
      unlockBodyScroll(lockId);
      clearStaleScrollLock();
      return undefined;
    }

    lockBodyScroll(lockId);
    return () => unlockBodyScroll(lockId);
  }, [isOpen]);
}
