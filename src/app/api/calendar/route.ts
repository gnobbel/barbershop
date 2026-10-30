import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { calendarFeedKey, safeEqual } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildIcs, sequenceFor } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** Private iCal feed of every confirmed booking, for the barber's own calendar app. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!safeEqual(key, calendarFeedKey())) return new Response("Not found", { status: 404 });

  const s = await getSettings();
  const since = new Date(Date.now() - 60 * 24 * 60 * 60_000);
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), gte(bookings.startAt, since)));

  const body = buildIcs(
    rows.map((b) => ({
      uid: `${b.id}@barbershop`,
      start: b.startAt,
      end: b.endAt,
      summary: `✂ ${b.name}`,
      description: [b.phone && `Phone: ${b.phone}`, b.email && `Email: ${b.email}`, b.notes]
        .filter(Boolean)
        .join("\n"),
      sequence: sequenceFor(b.confirmedAt),
    })),
    { name: s.businessName },
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
