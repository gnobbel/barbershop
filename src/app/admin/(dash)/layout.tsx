import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { getSettings } from "@/lib/data";
import { initials } from "@/lib/format";
import { logoutAction } from "../actions";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="mx-auto min-h-dvh max-w-[1040px] px-5 pb-20 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5 sm:py-7">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-bold text-white">
            {initials(s.businessName)}
          </span>
          <span className="title hidden truncate text-[17px] sm:inline">{s.businessName}</span>
          <span className="pill">Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn btn-secondary btn-sm">
            <span className="sm:hidden">Site</span>
            <span className="hidden sm:inline">View site</span>
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-secondary btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      <AdminNav />
      <main className="pt-8 sm:pt-10">{children}</main>
    </div>
  );
}
