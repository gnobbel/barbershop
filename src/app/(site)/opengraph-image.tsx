import { ImageResponse } from "next/og";
import { BRAND, brandFonts } from "@/lib/brand-image";
import { getSettings } from "@/lib/data";
import { formatDuration, formatPrice, initials } from "@/lib/format";

export const dynamic = "force-dynamic";
export const alt = "Book an appointment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when the booking link is shared (WhatsApp, iMessage…). */
export default async function OpenGraphImage() {
  const [s, fonts] = await Promise.all([getSettings(), brandFonts()]);
  const meta = [s.serviceName, formatDuration(s.durationMin), formatPrice(s.pricePence, s.currency)]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BRAND.bone,
          color: BRAND.ink,
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              background: BRAND.ink,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {initials(s.businessName)}
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.businessName}</div>
        </div>

        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.035em", maxWidth: 980 }}>
          {s.tagline}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: BRAND.muted }}>{meta}</div>
          <div
            style={{
              display: "flex",
              padding: "20px 36px",
              borderRadius: 999,
              background: BRAND.ink,
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Book online
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
