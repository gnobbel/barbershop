import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentSlotInput, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { capitalize, formatTime, initials, relativeDay } from "@/lib/format";
import { generateSlots } from "@/lib/slots";
import { HeaderStatus } from "@/components/HeaderStatus";

export const dynamic = "force-dynamic";

/** Titles and link previews (WhatsApp, iMessage) carry the business name. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const description = [s.tagline, s.serviceDescription].filter(Boolean).join(" ");
  return {
    metadataBase: new URL(siteUrl()),
    title: { absolute: s.businessName, template: `%s · ${s.businessName}` },
    description,
    appleWebApp: { capable: true, title: s.businessName, statusBarStyle: "default" },
    openGraph: { type: "website", siteName: s.businessName, title: s.businessName, description },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const now = new Date();
  const next = s.bookingOpen ? generateSlots(await getCurrentSlotInput())[0]?.slots[0] : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${s.businessName}, home`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-bold tracking-[-0.02em] text-white">
            {initials(s.businessName)}
          </span>
          <span className="title truncate text-[17px]">{s.businessName}</span>
        </Link>
        <HeaderStatus>
          {next ? (
            <>
              <span className="dot" aria-hidden />
              <span>
                <span className="sr-only sm:not-sr-only sm:text-muted">Eerstvolgende plek </span>
                <span className="tabular">
                  <span className="sm:hidden">{capitalize(relativeDay(next, s.timezone, now))}</span>
                  <span className="hidden sm:inline">{relativeDay(next, s.timezone, now)}</span>{" "}
                  {formatTime(next, s.timezone)}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="dot !bg-faint !shadow-none" aria-hidden />
              <span className="text-muted">{s.bookingOpen ? "Volgeboekt" : "Gepauzeerd"}</span>
            </>
          )}
        </HeaderStatus>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-16 pt-4 sm:px-8 sm:pt-8">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 border-t border-line px-5 py-7 text-[13px] text-muted sm:flex-row sm:justify-between sm:px-8">
        <span>© {now.getFullYear()} {s.businessName}</span>
        {s.address && <span className="whitespace-pre-line">{s.address.split("\n")[0]}</span>}
      </footer>
    </div>
  );
}
