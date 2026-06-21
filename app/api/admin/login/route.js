import { NextResponse } from "next/server";
import { makeAdminCookieValue, ADMIN_COOKIE_NAME } from "@/lib/auth";

// Trial default: if ADMIN_PASSWORD isn't configured, fall back to this so you
// are never locked out while testing. SET ADMIN_PASSWORD in env before sharing
// the /admin URL with anyone — otherwise admin is open to whoever finds it.
const TRIAL_PASSWORD = "sungate";

export async function POST(req) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD || TRIAL_PASSWORD;
  if (password !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, makeAdminCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
