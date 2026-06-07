"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict } from "@/lib/i18n";

const TABS = [
  { href: "/", key: "home", label: dict.nav.home, icon: "M3 11l9-8 9 8M5 10v10h14V10" },
  { href: "/dates", key: "dates", label: dict.nav.dates, icon: "M4 6h16M4 6v14h16V6M8 3v4M16 3v4" },
  { href: "/her", key: "her", label: dict.nav.her, icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" },
  {
    href: "/inspiration",
    key: "inspiration",
    label: dict.nav.inspiration,
    icon: "M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10zM9 21h6",
  },
  { href: "/settings", key: "settings", label: dict.nav.settings, icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5L4.1 11a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5a7 7 0 00.1-1z" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 mx-auto w-full max-w-app border-t border-navy/10 bg-cream/95 backdrop-blur">
      <ul className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                className={`tap flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition ${
                  active ? "text-terracotta" : "text-navy/50"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
