import { Home, Search, BookOpen, Bookmark, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BottomNavigationKey = 'home' | 'search' | 'story' | 'saved' | 'profile';

interface BottomNavigationItem {
  icon: LucideIcon;
  label: string;
  key: BottomNavigationKey;
}

export const bottomNavigationItems: readonly BottomNavigationItem[] = [
  { icon: Home, label: '홈', key: 'home' },
  { icon: Search, label: '검색', key: 'search' },
  { icon: BookOpen, label: '스토리', key: 'story' },
  { icon: Bookmark, label: '저장', key: 'saved' },
  { icon: User, label: '내 정보', key: 'profile' },
];

interface BottomNavigationProps {
  activeTab?: BottomNavigationKey;
  onNavigate?: (screen: string, options?: any) => void;
}

export function BottomNavigation({ activeTab = 'home', onNavigate }: BottomNavigationProps) {
  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed bottom-0 left-0 right-0 box-border bg-white/95 border-t border-black/5 safe-area-inset-bottom z-30"
      style={{
        height: 'calc(76px + env(safe-area-inset-bottom))',
        WebkitBackdropFilter: 'blur(18px)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div className="max-w-[430px] mx-auto w-full" style={{ height: 76 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            alignItems: 'stretch',
            height: 76,
            padding: '6px 12px 8px',
          }}
        >
          {bottomNavigationItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onNavigate?.(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className="rounded-2xl transition-colors duration-200 ease-out active:bg-[#e8f5ed]"
                style={{
                  appearance: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  width: '100%',
                  minWidth: 0,
                  height: 62,
                  padding: 0,
                  color: isActive ? '#2a2a2a' : '#999',
                  opacity: isActive ? 1 : 0.72,
                  transition: 'color 180ms ease, opacity 180ms ease, background-color 180ms ease',
                }}
              >
                <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
                  <Icon
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      color: isActive ? '#a8d5ba' : '#999',
                      transition: 'color 180ms ease',
                    }}
                    strokeWidth={2.25}
                  />
                </span>
                <span
                  className="text-xs font-medium"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 16,
                    lineHeight: '16px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    color: isActive ? '#2a2a2a' : '#999',
                    transition: 'color 180ms ease',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomTabBar(props: BottomNavigationProps) {
  return <BottomNavigation {...props} />;
}
