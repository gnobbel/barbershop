import { ImageResponse } from "next/og";
import { brandFonts, IconMark } from "@/lib/brand-image";
import { getSettings } from "@/lib/data";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

const SIZES = [32, 180, 192, 512];

/** App icon with the business initials: /api/icon?size=192 */
export async function GET(req: Request) {
  const asked = Number(new URL(req.url).searchParams.get("size"));
  const size = SIZES.includes(asked) ? asked : 192;
  const [s, fonts] = await Promise.all([getSettings(), brandFonts()]);
  return new ImageResponse(<IconMark initials={initials(s.businessName)} size={size} />, {
    width: size,
    height: size,
    fonts,
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
