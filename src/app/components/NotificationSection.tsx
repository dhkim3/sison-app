import type { ReactNode } from 'react';

interface NotificationSectionProps {
  title: string;
  children: ReactNode;
}

export function NotificationSection({ title, children }: NotificationSectionProps) {
  return (
    <section>
      <h4 className="mb-2.5 px-1 text-[12px] font-semibold leading-none text-[#8d8d8d]">
        {title}
      </h4>
      <div className="space-y-2.5">
        {children}
      </div>
    </section>
  );
}
