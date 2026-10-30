import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Book a haircut", template: "%s · Book a haircut" },
  description: "Haircuts by appointment.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
