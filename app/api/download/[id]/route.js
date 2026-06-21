import { NextResponse } from "next/server";
import { readManifest } from "@/lib/blob";

export const dynamic = "force-dynamic";

/* Blob URLs are public and directly downloadable. We just look up the asset
   and hand back its URL. Single tier: short social files don't need a
   separate phone-ready rendition. */
export async function GET(req, { params }) {
  const manifest = await readManifest();
  const asset = manifest.assets.find((a) => a.id === params.id);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ url: asset.url });
}
