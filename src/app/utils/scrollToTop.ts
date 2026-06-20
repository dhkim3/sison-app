export const scrollToTop = (target?: HTMLElement | null) => {
  target?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};
