"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * SVG icon for the Feed tab in the Celo MiniPay bottom navigation bar.
 * @since 1.0.0
 * Stroked in the active (`#D4700A`) or inactive (`#8B4513`) brand colour.
 */
function IconFeed({ active }: { active: boolean }) {
  const c = active ? "#D4700A" : "#8B4513";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <polyline points="8 21 12 17 16 21" />
    </svg>
  );
}

/**
 * SVG icon for the Explore tab in the Celo MiniPay bottom navigation bar.
 * @since 1.0.0
 * Stroked in the active (`#D4700A`) or inactive (`#8B4513`) brand colour.
 */
function IconExplore({ active }: { active: boolean }) {
  const c = active ? "#D4700A" : "#8B4513";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/** SVG icon for the Dashboard tab — stroked in the active/inactive brand color. */
function IconPortfolio({ active }: { active: boolean }) {
  const c = active ? "#D4700A" : "#8B4513";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Feed", Icon: IconFeed },
  { href: "/search", label: "Explore", Icon: IconExplore },
  { href: "/dashboard", label: "Dashboard", Icon: IconPortfolio },
];

/**
 * Fixed bottom navigation bar for the Celo MiniPay mobile layout.
 *
 * Three tabs: Feed (`/`), Explore (`/search`), Dashboard (`/dashboard`).
 * The Feed tab treats `/tasks` as active to match the `SwipeNav` tab index.
 * Icons are SVG-only (no external libraries) — stroked in `#D4700A` when
 * active, `#8B4513` when inactive, matching the AgentHands brand palette.
 *
 * Respects iOS safe-area insets via `pb-[max(…,env(safe-area-inset-bottom))]`
 * so the nav chrome doesn't overlap the home-indicator bar on Celo phone
 * users running the app as a PWA or inside MiniPay's WebView.
 */
export default function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/tasks";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-solid)]/95 backdrop-blur-lg border-t border-[var(--border)]">
      <div className="max-w-md mx-auto flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] transition-colors ${
                active ? "text-[#D4700A]" : "text-[#8B4513]"
              }`}
            >
              <Icon active={active} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
