import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Brand colours, matching globals.css. */
export const BRAND = { bone: "#f5f2ed", paper: "#fbfaf7", ink: "#1f1f1f", muted: "#6b665f", line: "#e6e1d9" };

let fonts: Promise<{ name: string; data: Buffer; weight: 700 | 800; style: "normal" }[]> | null = null;

/** Plus Jakarta Sans for generated images (next/og reads woff, not woff2). */
export function brandFonts() {
  fonts ??= Promise.all(
    ([700, 800] as const).map(async (weight) => ({
      name: "Plus Jakarta Sans",
      data: await readFile(join(process.cwd(), `assets/fonts/plus-jakarta-sans-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/**
 * The initials mark as an app icon. Large sizes fill the square, so platforms
 * can apply their own mask; small ones (favicons) are a circle.
 */
export function IconMark({ initials, size }: { initials: string; size: number }) {
  const round = size <= 64;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.ink,
        borderRadius: round ? "50%" : 0,
        color: "#fff",
        fontFamily: "Plus Jakarta Sans",
        fontWeight: 800,
        // Keep the letters inside the maskable safe zone (the middle 80%).
        fontSize: Math.round(size * (round ? 0.42 : 0.34)),
        letterSpacing: "-0.03em",
      }}
    >
      {initials}
    </div>
  );
}
