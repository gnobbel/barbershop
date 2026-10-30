import Link from "next/link";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[960px] flex-col px-5 sm:px-10">
      <header className="flex items-center justify-between py-7 sm:py-9">
        <Link href="/" className="display text-[22px] tracking-[0.02em] sm:text-2xl">
          {s.businessName}
        </Link>
        <Link href="/book" className="eyebrow link !text-ink">
          Book
        </Link>
      </header>
      <hr className="rule" />
      <main className="flex-1 py-12 sm:py-20">{children}</main>
      <hr className="rule" />
      <footer className="flex flex-col gap-2 py-8 text-[13px] text-muted sm:flex-row sm:justify-between">
        <span>{s.businessName}</span>
        <span>{s.address || "By appointment only"}</span>
      </footer>
    </div>
  );
}
