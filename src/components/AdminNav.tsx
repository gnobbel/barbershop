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
    <nav className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex gap-7">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`eyebrow block whitespace-nowrap border-b py-4 transition-colors ${
                  active ? "border-ink !text-ink" : "border-transparent hover:!text-ink"
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
