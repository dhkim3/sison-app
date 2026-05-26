import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  backgroundColor?: string;
  reserveBottomTabSpace?: boolean;
}

export function PageShell({
  children,
  backgroundColor = '#fdfcfa',
  reserveBottomTabSpace = true,
}: PageShellProps) {
  return (
    <div
      className="mobile-app-page"
      style={{
        backgroundColor,
        paddingBottom: reserveBottomTabSpace ? undefined : 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mobile-app-content max-w-[430px] mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
