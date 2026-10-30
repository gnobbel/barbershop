import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authSecret } from "./env";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./session";

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startSession() {
  authSecret(); // fail loudly if misconfigured
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdmin() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Call at the top of every admin server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Secret part of the barber's calendar subscription URL. */
export function calendarFeedKey() {
  return createHmac("sha256", authSecret()).update("calendar-feed").digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
