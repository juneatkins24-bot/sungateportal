import { put, head, list } from "@vercel/blob";

/* ── Vercel Blob storage layer (replaces R2 + Stream) ──
   Short social clips and images: no transcoding needed, they play and
   download straight from the Blob URL. The data manifest is a single JSON
   blob. Single-admin write model; swap for a database only if Sungate ever
   has concurrent uploaders. */

const MANIFEST_PATH = "manifest/manifest.json";

export async function readManifest() {
  try {
    // manifest is stored at a stable pathname; fetch its current URL via list
    const { blobs } = await list({ prefix: "manifest/", limit: 1 });
    if (!blobs.length) return { artists: [], assets: [] };
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return { artists: [], assets: [] };
    return await res.json();
  } catch (err) {
    return { artists: [], assets: [] };
  }
}

export async function writeManifest(manifest) {
  await put(MANIFEST_PATH, JSON.stringify(manifest, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false, // stable path so we always overwrite the same object
    allowOverwrite: true,
  });
}

/* Store an asset file. Returns the public URL it can be played/downloaded from. */
export async function putAsset(pathname, body, contentType) {
  const blob = await put(pathname, body, {
    access: "public",
    contentType: contentType || "application/octet-stream",
    addRandomSuffix: true,
  });
  return blob.url;
}
