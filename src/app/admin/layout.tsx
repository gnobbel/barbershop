import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false },
  // Added to the home screen from /admin, it opens straight into the dashboard.
  manifest: "/api/manifest?app=admin",
  appleWebApp: { capable: true, title: "Appointments", statusBarStyle: "default" },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
