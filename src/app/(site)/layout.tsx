import Link from "next/link";
import { getSettings, loadSlotInput } from "@/lib/data";
import { formatTime, initials, relativeDay } from "@/lib/format";
import { generateSlots } from "@/lib/slots";
import { HeaderStatus } from "@/components/HeaderStatus";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const now = new Date();
  const next = s.bookingOpen ? generateSlots(await loadSlotInput(s, now))[0]?.slots[0] : undefined;

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
                <span className="text-muted">
                  Next<span className="hidden sm:inline"> opening</span>{" "}
                </span>
                <span className="tabular">
                  {relativeDay(next, s.timezone, now)} {formatTime(next, s.timezone)}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="dot !bg-faint !shadow-none" aria-hidden />
              <span className="text-muted">{s.bookingOpen ? "Fully booked" : "Bookings paused"}</span>
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
