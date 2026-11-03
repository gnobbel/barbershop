import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Afspraak maken", template: "%s · Afspraak maken" },
  description: "Knippen op afspraak.",
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
    <html lang="nl">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
