import { NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/lib/blob";

export const dynamic = "force-dynamic";

/* Artist-facing, token-gated. The artist's feed/wall calls this to approve
   an edit or leave a change note. Option A: a note flips the asset to
   "changes-requested" and stores the text; Sungate re-uploads a new version
   into the same batch. No version history in v1. */
export async function POST(req) {
  const { token, assetId, action, note } = await req.json();
  if (!token || !assetId || !action) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const manifest = await readManifest();
  const artist = manifest.artists.find((a) => a.token === token);
  if (!artist) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asset = manifest.assets.find((x) => x.id === assetId && x.artistId === artist.id);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    asset.status = "approved";
    asset.note = "";
    asset.approvedAt = Date.now();
  } else if (action === "unapprove") {
    asset.status = "in-review";
    asset.approvedAt = null;
  } else if (action === "archive") {
    asset.archived = true;
    asset.archivedAt = Date.now();
  } else if (action === "request-change") {
    asset.status = "changes-requested";
    asset.note = String(note || "").slice(0, 1000);
    asset.noteAt = Date.now();
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await writeManifest(manifest);
  return NextResponse.json({ ok: true, status: asset.status });
}
