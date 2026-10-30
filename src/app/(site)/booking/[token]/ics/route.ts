import { getBookingByToken } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { buildIcs, sequenceFor } from "@/lib/ics";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [b, s] = await Promise.all([getBookingByToken(token), getSettings()]);
  if (!b) return new Response("Not found", { status: 404 });

  const manage = `${siteUrl()}/booking/${b.manageToken}`;
  const body = buildIcs([
    {
      uid: `${b.id}@barbershop`,
      start: b.startAt,
      end: b.endAt,
      summary: `${s.serviceName} · ${s.businessName}`,
      description: `Manage or cancel: ${manage}`,
      location: s.address || undefined,
      url: manage,
      cancelled: b.status === "cancelled",
      sequence: sequenceFor(b.confirmedAt),
    },
  ]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appointment.ics"',
      "Cache-Control": "no-store",
    },
  });
}
