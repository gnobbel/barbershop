"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Appointments" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="inline-flex gap-1 rounded-full bg-chip p-1">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors ${
                  active
                    ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
