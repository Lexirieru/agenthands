"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconFeed({ active }: { active: boolean }) {
  const c = active ? "#FFFFFF" : "#888888";
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

function IconExplore({ active }: { active: boolean }) {
  const c = active ? "#FFFFFF" : "#888888";
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

function IconPortfolio({ active }: { active: boolean }) {
  const c = active ? "#FFFFFF" : "#888888";
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

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "#FFFFFF" : "#888888";
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
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Feed", Icon: IconFeed },
  { href: "/search", label: "Explore", Icon: IconExplore },
  { href: "/dashboard", label: "Dashboard", Icon: IconPortfolio },
  { href: "/profile", label: "Profile", Icon: IconProfile },
];

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/tasks";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 minipay-tab-bar">
      <div className="max-w-md mx-auto flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          const c = active ? "#FFFFFF" : "#888888";
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-black uppercase tracking-tighter transition-all ${
                active ? "text-white scale-110" : "text-gray-500"
              }`}
            >
              <div className={active ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : ""}>
                <Icon active={active} />
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
