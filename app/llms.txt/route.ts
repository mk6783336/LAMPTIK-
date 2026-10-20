import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  try {
    const file = await readFile(join(process.cwd(), "public", "llms.txt"), "utf8");
    return new Response(file, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("LAMP TIK — https://www.lamptik.online/llms-full.txt\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
