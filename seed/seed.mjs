/* Seed MARIAMI's demo feed into Vercel Blob.
   Run after deploying, with BLOB_READ_WRITE_TOKEN in env:  npm run seed
   (Get the token from Vercel → project → Storage → Blob → .env.local tab.) */

import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { put, list } from "@vercel/blob";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

try {
  for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Copy it from Vercel → Storage → Blob.");
  process.exit(1);
}

const id = (p) => `${p}_${crypto.randomBytes(6).toString("hex")}`;

async function readManifest() {
  try {
    const { blobs } = await list({ prefix: "manifest/", limit: 1 });
    if (!blobs.length) return { artists: [], assets: [] };
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return res.ok ? await res.json() : { artists: [], assets: [] };
  } catch { return { artists: [], assets: [] }; }
}
async function writeManifest(m) {
  await put("manifest/manifest.json", JSON.stringify(m, null, 2), {
    access: "public", contentType: "application/json",
    addRandomSuffix: false, allowOverwrite: true,
  });
}

const CAPTIONS = {
  "mariami-visualizer-demo.mp4": { type:"Visualizer", aspect:"vertical",
    caption:"First look at the visualizer treatment. Watch with sound.", tags:"#MARIAMI #NewDrop", sound:"MARIAMI · Sungate Records" },
};

const main = async () => {
  const manifest = await readManifest();
  let artist = manifest.artists.find((a) => a.handle === "mariami");
  if (!artist) {
    artist = { id: id("ar"), name: "MARIAMI", handle: "mariami", initials: "M",
      token: crypto.randomBytes(18).toString("base64url") };
    manifest.artists.push(artist);
    console.log("Created artist MARIAMI");
  }

  const files = readdirSync(resolve(here, "assets"));
  for (const f of files) {
    if (manifest.assets.some((a) => a.file === f)) { console.log(`skip: ${f}`); continue; }
    const body = readFileSync(resolve(here, "assets", f));
    const isImage = f.endsWith(".png") || f.endsWith(".jpg");
    const blob = await put(`assets/${Date.now()}_${f}`, body, {
      access: "public", contentType: isImage ? "image/png" : "video/mp4", addRandomSuffix: true,
    });
    const meta = CAPTIONS[f] || { type: isImage ? "Merch concept" : "Video", aspect: isImage ? "square" : "vertical", caption: "", tags: "#Merch" };
    manifest.assets.push({
      id: id("a"), artistId: artist.id, url: blob.url, file: f, sizeBytes: body.length,
      caption: meta.caption, tags: meta.tags, type: meta.type, sound: meta.sound || "",
      kind: isImage ? "image" : "video", aspect: meta.aspect,
      assetType: meta.type, status: "in-review", batch: "Batch 001", note: "", createdAt: Date.now(),
    });
    console.log(`uploaded: ${f}`);
  }
  await writeManifest(manifest);
  console.log("\nSeed complete. MARIAMI link path:  /a/" + artist.token);
};
main().catch((e) => { console.error(e); process.exit(1); });
