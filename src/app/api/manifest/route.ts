import { getSettings } from "@/lib/data";
import { BRAND } from "@/lib/brand-image";

export const dynamic = "force-dynamic";

/**
 * Web app manifest, so "Add to Home Screen" gives a proper icon and opens
 * without browser chrome. ?app=admin opens the barber's dashboard instead of
 * the booking page.
 */
export async function GET(req: Request) {
  const admin = new URL(req.url).searchParams.get("app") === "admin";
  const s = await getSettings();
  const icons = [192, 512].flatMap((size) =>
    (["any", "maskable"] as const).map((purpose) => ({
      src: `/api/icon?size=${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose,
    })),
  );
  const manifest = {
    id: admin ? "/admin" : "/",
    name: admin ? `${s.businessName} · Admin` : s.businessName,
    short_name: admin ? "Afspraken" : s.businessName,
    description: s.tagline,
    lang: "nl",
    start_url: admin ? "/admin" : "/",
    scope: admin ? "/admin" : "/",
    display: "standalone",
    background_color: BRAND.bone,
    theme_color: BRAND.bone,
    icons,
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
