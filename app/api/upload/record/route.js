import { NextResponse } from "next/server";
import { isAdminRequest, newId } from "@/lib/auth";
import { readManifest, writeManifest } from "@/lib/blob";

export const dynamic = "force-dynamic";

/* After the browser uploads the file to Blob, it sends the resulting URL plus
   metadata here. We append the asset to the manifest. No transcoding: short
   clips and images play and download straight from the Blob URL. */
export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url, pages, meta } = await req.json();
  if (!url || !meta?.artistId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const isImage = (meta.contentType || "").startsWith("image/");

  const manifest = await readManifest();
  manifest.assets.push({
    id: newId("a"),
    artistId: meta.artistId,
    url,
    file: meta.file,
    sizeBytes: meta.sizeBytes || 0,
    caption: meta.caption || "",
    tags: meta.tags || "",
    type: meta.type || "Asset",
    sound: meta.sound || "",
    kind: isImage ? "image" : "video",
    aspect: meta.aspect || (isImage ? "square" : "vertical"),
    pages: Array.isArray(pages) && pages.length ? pages : null,
    assetType: meta.assetType || (isImage ? "Image" : "Video"),
    status: "in-review",
    batch: meta.batch || null,
    note: "",
    createdAt: Date.now(),
  });
  await writeManifest(manifest);
  return NextResponse.json({ ok: true });
}
