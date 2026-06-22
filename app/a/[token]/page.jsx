import { notFound } from "next/navigation";
import { readManifest } from "@/lib/blob";
import ArtistApp from "@/components/ArtistApp";

export const dynamic = "force-dynamic";

export default async function ArtistFeed({ params }) {
  const manifest = await readManifest();
  const artist = manifest.artists.find((a) => a.token === params.token);
  if (!artist) notFound();

  const assets = manifest.assets
    .filter((x) => x.artistId === artist.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((x) => ({
      id: x.id,
      file: x.file,
      caption: x.caption || "",
      tags: x.tags || "",
      type: x.type || "Asset",
      assetType: x.assetType || (x.kind === "image" ? "Image" : "Video"),
      aspect: x.aspect || (x.kind === "image" ? "square" : "vertical"),
      sound: x.sound || "Original audio · Sungate Records",
      sizeBytes: x.sizeBytes || 0,
      createdAt: x.createdAt,
      kind: x.kind || "video",
      status: x.status || "approved",
      archived: x.archived || false,
      note: x.note || "",
      batch: x.batch || null,
      // Blob is a direct URL for both playback and image display
      url: x.url,
      hls: null,
      thumb: null,
      img: x.kind === "image" ? x.url : null,
      pages: Array.isArray(x.pages) ? x.pages : null,
      ready: true,
    }));

  const review = assets.filter((a) => a.status !== "approved");
  const delivery = assets.filter((a) => a.status === "approved" && !a.archived);

  return (
    <ArtistApp
      artist={{ name: artist.name, handle: artist.handle, initials: artist.initials }}
      token={params.token}
      review={review}
      delivery={delivery}
    />
  );
}
