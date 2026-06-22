import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { isAdminRequest } from "@/lib/auth";
import { readManifest, writeManifest } from "@/lib/blob";

export const dynamic = "force-dynamic";

/* Admin-only. Fully removes an asset: drops it from the manifest and deletes
   the underlying file(s) from Blob so you are not storing or paying for test
   junk. Permanent, no undo. Multi-page documents delete every page blob. */
export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { assetId } = await req.json();
  if (!assetId) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const manifest = await readManifest();
  const asset = manifest.assets.find((a) => a.id === assetId);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // gather every blob URL this asset owns (cover + any deck pages)
  const urls = [];
  if (asset.url) urls.push(asset.url);
  if (Array.isArray(asset.pages)) urls.push(...asset.pages);

  // best-effort blob deletion; even if a file is already gone we still
  // remove the manifest entry so the asset disappears from the portal
  await Promise.allSettled(urls.map((u) => del(u)));

  manifest.assets = manifest.assets.filter((a) => a.id !== assetId);
  await writeManifest(manifest);

  return NextResponse.json({ ok: true });
}
