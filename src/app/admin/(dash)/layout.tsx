import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { getSettings } from "@/lib/data";
import { logoutAction } from "../actions";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="mx-auto min-h-dvh max-w-[1040px] px-5 sm:px-10">
      <header className="flex items-center justify-between pt-7 sm:pt-9">
        <div className="flex items-baseline gap-4">
          <Link href="/admin" className="display text-[22px] sm:text-2xl">
            {s.businessName}
          </Link>
          <span className="eyebrow hidden sm:inline">Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="eyebrow link hidden sm:inline">
            View site
          </Link>
          <form action={logoutAction}>
            <button className="eyebrow link cursor-pointer">Sign out</button>
          </form>
        </div>
      </header>
      <div className="mt-5 border-b border-line">
        <AdminNav />
      </div>
      <main className="py-10 sm:py-14">{children}</main>
    </div>
  );
}
