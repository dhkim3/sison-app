import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  backgroundColor?: string;
}

export function PageShell({ children, backgroundColor = '#fdfcfa' }: PageShellProps) {
  return (
    <div
      className="mobile-app-page"
      style={{ backgroundColor }}
    >
      <div className="mobile-app-content max-w-[430px] mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
