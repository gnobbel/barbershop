import { jwtVerify, SignJWT } from "jose";

// Edge-safe helpers shared by middleware and server code.
export const SESSION_COOKIE = "bs_admin";
export const SESSION_DAYS = 30;

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export async function signSession() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySession(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
