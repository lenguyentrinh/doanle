'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  isActive: boolean;
  disabled?: boolean;
  badge?: { value: number; tone: 'accent' | 'alert' };
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SharedSidebarProps {
  sections: NavSection[];
  showEditorial?: boolean;
  /** Admin session footer (e.g. the signed-in admin's email). Ignored when
   * `showEditorial` is true — the two footer slots are mutually exclusive. */
  sessionEmail?: string;
}

const BADGE_TONE_CLASSES: Record<'accent' | 'alert', string> = {
  accent: 'bg-accent text-white',
  alert: 'bg-alert-bg text-alert',
};

export default function SharedSidebar({
  sections,
  showEditorial = true,
  sessionEmail,
}: SharedSidebarProps) {
  const itemClasses = (active: boolean, disabled?: boolean) => {
    if (disabled) return 'text-ink-faint cursor-not-allowed';
    return active
      ? 'bg-fill text-ink'
      : 'text-ink-secondary transition-all duration-200 hover:bg-fill hover:text-ink';
  };

  return (
    <>
    <MobileNav sections={sections} />
    <aside className="hidden md:block md:w-[232px] md:shrink-0">
      <div className="sticky top-[76px] flex h-[calc(100dvh-76px)] flex-col overflow-y-auto border-r border-line px-6 pt-10 pb-7">
        <nav className="flex shrink-0 flex-col gap-10">
          {sections.map((section, idx) => (
            <div key={section.title || idx} className="flex flex-col gap-1.5">
              {section.title && (
                <h3 className="mb-2.5 text-label-xs text-ink-muted">{section.title}</h3>
              )}
              {section.items.map((item) => {
                const inner = (
                  <>
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`h-3.5 w-[2px] shrink-0 rounded-full ${item.isActive ? 'bg-accent' : 'bg-transparent'}`}
                      />
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-[7px] py-0.5 text-[10px] font-semibold tabular-nums ${BADGE_TONE_CLASSES[item.badge.tone]}`}
                      >
                        {item.badge.value}
                      </span>
                    )}
                  </>
                );

                return item.disabled ? (
                  <span
                    key={item.label}
                    aria-disabled="true"
                    title="Sắp ra mắt"
                    className={`flex items-center justify-between gap-2.5 rounded-[9px] px-3 py-2.5 text-body-sm ${itemClasses(false, true)}`}
                  >
                    {inner}
                  </span>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={item.isActive ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2.5 rounded-[9px] px-3 py-2.5 text-body-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${itemClasses(item.isActive)}`}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {showEditorial ? (
          <div className="mt-auto h-[180px] w-full shrink-0 overflow-hidden rounded-[12px] bg-fill">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/account-editorial.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover grayscale transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:grayscale-0"
            />
          </div>
        ) : (
          sessionEmail && (
            <div className="mt-auto flex flex-col gap-2 border-t border-line pt-[18px]">
              <span className="font-display text-[14px] italic text-ink-muted">
                Phiên quản trị
              </span>
              <span className="text-caption text-ink-faint">{sessionEmail}</span>
            </div>
          )
        )}
      </div>
    </aside>
    </>
  );
}

// Below md the sidebar is hidden, which left admin/account with no navigation
// at all. This renders the same items as a horizontally scrolling pill bar;
// the active pill is scrolled into view so deep pages don't hide it off-screen.
function MobileNav({ sections }: { sections: NavSection[] }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  const items = sections.flatMap((section) => section.items);

  return (
    <nav
      aria-label="Điều hướng"
      className="flex gap-2 overflow-x-auto border-b border-line px-5 py-3 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) =>
        item.disabled ? (
          <span
            key={`${item.label}-${item.href}`}
            aria-disabled="true"
            className="shrink-0 cursor-not-allowed whitespace-nowrap rounded-full border border-line px-4 py-2 text-body-sm text-ink-faint"
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={`${item.label}-${item.href}`}
            ref={item.isActive ? activeRef : undefined}
            href={item.href}
            aria-current={item.isActive ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-body-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              item.isActive
                ? 'border-ink bg-ink text-white'
                : 'border-line text-ink-secondary hover:bg-fill hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
