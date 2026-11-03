import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Book a haircut", template: "%s · Book a haircut" },
  description: "Haircuts by appointment.",
  manifest: "/api/manifest",
  icons: {
    icon: [{ url: "/api/icon?size=32", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/api/icon?size=180", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f5f2ed",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
