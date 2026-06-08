import { useLayoutEffect, useRef } from 'react';

const activeLockIds = new Set<symbol>();
let lockedScrollY = 0;
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

// Returns true when the touch target is anywhere inside the bottom sheet panel
// (header buttons, scrollable content, drag handle — everything inside the sheet)
// This lets native iOS scroll and tap events work correctly inside the sheet.
const isInsideBottomSheet = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest<HTMLElement>('.bottom-sheet-panel, [data-bottom-sheet-scrollable="true"]'),
  );
};

// NOTE: We intentionally do NOT use a "can this sheet scroll?" check here.
// The original canScrollSheet() logic caused two iOS Safari bugs:
//   1. .bottom-sheet-panel has overflow:hidden so scrollHeight===clientHeight → always false
//      → preventDefault() on header taps → iOS cancels the click event entirely
//   2. When body is position:fixed on iOS, clientHeight may be mis-reported as 0
// Instead we rely on overscroll-behavior:contain on .bottom-sheet-scrollable to
// handle scroll boundaries (scroll doesn't bleed to body).
const handleTouchMove = (event: TouchEvent) => {
  if (activeLockIds.size === 0) return;
  // Inside the sheet: allow native scroll and tap – do NOT call preventDefault
  if (isInsideBottomSheet(event.target)) return;
  // Outside the sheet (backdrop, page behind): block body scroll / rubber-band
  event.preventDefault();
};

const isIOSBrowser = () => {
  if (typeof window === 'undefined') return false;
  const { platform, maxTouchPoints, userAgent } = window.navigator;
  return /iP(ad|hone|od)/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
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
    body.style.overflow === 'hidden';

  if (!hasStaleLock) return;

  const shouldRestoreScroll = lockMode === 'ios-fixed';
  const scrollToRestore = lockedScrollY;

  activeLockIds.clear();
  document.removeEventListener('touchmove', handleTouchMove);
  removeViewportHeightListeners();
  documentElement.classList.remove(lockClassName);
  body.classList.remove(lockClassName);
  body.style.height = '';
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  body.style.paddingRight = '';
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

  documentElement.classList.add(lockClassName);
  body.classList.add(lockClassName);
  body.style.overflow = 'hidden';

  if (shouldUseFixedLock) {
    // iOS: fix body in place to prevent rubber-band scroll behind the sheet.
    // We use position:fixed so the body doesn't move while the sheet is open.
    // Fixed child elements (the sheets themselves) remain correctly positioned
    // relative to the visual viewport.
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.height = '100%';
  }

  // Prevent body scroll for touches outside the sheet.
  // passive:false is required to allow event.preventDefault().
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
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
  document.removeEventListener('touchmove', handleTouchMove);
  removeViewportHeightListeners();
  const shouldRestoreScrollPosition = lockMode === 'ios-fixed';

  documentElement.classList.remove(lockClassName);
  body.classList.remove(lockClassName);
  body.style.height = originalBodyStyle.height;
  body.style.position = originalBodyStyle.position;
  body.style.top = originalBodyStyle.top;
  body.style.left = originalBodyStyle.left;
  body.style.right = originalBodyStyle.right;
  body.style.width = originalBodyStyle.width;
  body.style.overflow = originalBodyStyle.overflow;
  body.style.paddingRight = '';
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
