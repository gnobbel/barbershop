export const REMINDER_LEAD_MS = 24 * 60 * 60_000;
/**
 * A booking confirmed less than this long before the appointment already has
 * a fresh confirmation in the inbox, so it doesn't get a separate reminder.
 */
export const REMINDER_MIN_CONFIRM_GAP_MS = 25 * 60 * 60_000;

type ReminderCandidate = {
  status: string;
  email: string | null;
  startAt: Date;
  confirmedAt: Date;
  reminderSentAt: Date | null;
};

/** Mirrors the SQL in `claimDueReminders` so the rule can be unit tested. */
export function isReminderDue(b: ReminderCandidate, now: Date): boolean {
  const start = b.startAt.getTime();
  return (
    b.status === "confirmed" &&
    !!b.email &&
    b.reminderSentAt === null &&
    start > now.getTime() &&
    start <= now.getTime() + REMINDER_LEAD_MS &&
    start - b.confirmedAt.getTime() >= REMINDER_MIN_CONFIRM_GAP_MS
  );
}
