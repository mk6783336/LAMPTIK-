import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { androidApp } from "@/lib/site";

export const runtime = "nodejs";

const APK_PATH = path.join(process.cwd(), "public", "downloads", androidApp.fileName);

/**
 * GET /api/apk — serves the compiled, cryptographically signed LAMP TIK
 * native Android APK with standard package-installer headers.
 *
 * The filename and the fallback redirect come from `androidApp`, so this route
 * always hands out the same build the site advertises.
 */
export async function GET() {
  try {
    const buffer = await readFile(APK_PATH);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${androidApp.downloadName}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(
      new URL(`/downloads/${androidApp.fileName}`, "https://www.lamptik.online"),
      302,
    );
  }
}
