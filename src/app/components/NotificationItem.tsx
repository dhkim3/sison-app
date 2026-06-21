interface NotificationItemProps {
  title: string;
  description?: string;
  time: string;
  unread?: boolean;
}

export function NotificationItem({
  title,
  description,
  time,
  unread = false,
}: NotificationItemProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '8px minmax(0, 1fr)',
          columnGap: 10,
          alignItems: 'start',
        }}
      >
        <span
          className={`mt-1.5 h-1.5 w-1.5 rounded-full ${unread ? 'bg-[#a8d5ba]' : 'bg-transparent'}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium leading-[1.45] text-[#2a2a2a]">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-[12px] leading-[1.5] text-[#5F6368]">
              {description}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-none text-[#b0aca5]">
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}
