"use client";

import { usePathname } from "next/navigation";

/** The "next opening" pill; hidden on a friend's own booking pages, where it's noise. */
export function HeaderStatus({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/booking/")) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 text-[13px] font-medium sm:px-4">
      {children}
    </span>
  );
}
