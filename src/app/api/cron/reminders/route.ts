import { safeEqual } from "@/lib/auth";
import { sendDueReminders } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * Sends 24-hour reminders. Called every 15 minutes by the GitHub Actions
 * workflow in .github/workflows/reminders.yml (or Vercel Cron).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendDueReminders();
  return Response.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
