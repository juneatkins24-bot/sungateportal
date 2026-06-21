import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "sg_admin";

function sign(value) {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dev-secret")
    .update(value)
    .digest("hex");
}

export function makeAdminCookieValue() {
  const payload = `admin.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function isAdminRequest() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return false;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export const ADMIN_COOKIE_NAME = COOKIE;

export function newArtistToken() {
  // URL-safe, unguessable; this IS the artist's "login"
  return crypto.randomBytes(18).toString("base64url");
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}
