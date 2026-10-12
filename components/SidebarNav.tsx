"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/search", label: "Find Buyers", icon: "🔍" },
  { href: "/leads", label: "Leads", icon: "📋" },
  { href: "/campaigns/new", label: "New Campaign", icon: "✉️" },
  { href: "/campaigns", label: "Campaigns", icon: "📊" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Home<span>Decor</span>
        <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginTop: 2 }}>
          Buyer Finder
        </div>
      </div>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname.startsWith(item.href) && item.href !== "/" ? "active" : ""}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
