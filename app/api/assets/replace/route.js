import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { isAdminRequest } from "@/lib/auth";
import { readManifest, writeManifest } from "@/lib/blob";

export const dynamic = "force-dynamic";

/* Admin-only. Swaps an asset's file while keeping its caption, type, aspect,
   batch, and feed position. The browser uploads the new file to Blob first
   (via /api/upload/token), then sends the new URL here. We delete the old
   blob so we are not paying to store the replaced file. */
export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { assetId, url, file, sizeBytes, contentType } = await req.json();
  if (!assetId || !url) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const manifest = await readManifest();
  const asset = manifest.assets.find((a) => a.id === assetId);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldUrls = [];
  if (asset.url) oldUrls.push(asset.url);
  if (Array.isArray(asset.pages)) oldUrls.push(...asset.pages);
  await Promise.allSettled(oldUrls.map((u) => del(u)));

  asset.url = url;
  asset.file = file || asset.file;
  asset.sizeBytes = sizeBytes || asset.sizeBytes;
  if (contentType) {
    asset.kind = contentType.startsWith("image/") ? "image" : "video";
  }
  asset.pages = null;
  asset.replacedAt = Date.now();

  await writeManifest(manifest);
  return NextResponse.json({ ok: true });
}
