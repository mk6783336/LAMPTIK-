import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APK_PATH = path.join(process.cwd(), "public", "downloads", "lamptik-v2.2.apk");

/**
 * GET /api/apk — serves the compiled, cryptographically signed LAMP TIK
 * Android WebView APK with standard package-installer headers.
 */
export async function GET() {
  try {
    const buffer = await readFile(APK_PATH);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="LAMP-TIK-v2.2.apk"',
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/downloads/lamptik-v2.2.apk", "https://www.lamptik.online"), 302);
  }
}
