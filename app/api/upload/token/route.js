import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Issues a short-lived token so the browser can upload a file directly to
   Vercel Blob without the bytes passing through this server. Admin-gated. */
export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  try {
    const json = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/*", "image/*"],
        maximumSizeInBytes: 250 * 1024 * 1024, // 250MB ceiling: ample for short social clips
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {}, // we record metadata via /record after the client finishes
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
