import { NextResponse } from "next/server";
import { isAdminRequest, newArtistToken, newId } from "@/lib/auth";
import { readManifest, writeManifest } from "@/lib/blob";

export async function GET() {
  if (!isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const manifest = await readManifest();
  return NextResponse.json(manifest);
}

export async function POST(req) {
  if (!isAdminRequest()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.action === "addArtist") {
    const manifest = await readManifest();
    const handle = String(body.handle || "").toLowerCase().replace(/[^a-z0-9._]/g, "");
    const name = String(body.name || "").trim();
    if (!name || !handle) return NextResponse.json({ error: "Name and handle required" }, { status: 400 });
    manifest.artists.push({
      id: newId("ar"),
      name,
      handle,
      initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      token: newArtistToken(),
    });
    await writeManifest(manifest);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
