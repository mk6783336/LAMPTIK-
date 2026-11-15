import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic route: reports what this deployment's network gets
 * from each YouTube source used by the live probe. Removed after use.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{11}$/.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

  async function page(url: string) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": ua, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+1" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      const t = await r.text();
      return {
        status: r.status,
        len: t.length,
        player: t.includes("ytInitialPlayerResponse"),
        liveContent: /"isLiveContent":true/.test(t),
        liveNow: /"isLive":[a-z]/.test(t) || /"isLiveNow":true/.test(t),
        title: /<title>([^<]{0,60})/.exec(t)?.[1] ?? null,
      };
    } catch (e) {
      return { error: String(e).slice(0, 120) };
    }
  }

  let nextReport: unknown;
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/next?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ua, "Accept-Language": "en-US,en;q=0.9" },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240701.00.00", hl: "en", gl: "US" },
        },
        videoId: id,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const t = await r.text();
    nextReport = {
      status: r.status,
      len: t.length,
      primary: t.includes("videoPrimaryInfoRenderer"),
      streamed: /"dateText":\{"simpleText":"Streamed live/.test(t),
      isLive: t.includes('"isLive":true'),
      head: t.slice(0, 80),
    };
  } catch (e) {
    nextReport = { error: String(e).slice(0, 120) };
  }

  let playerReport: unknown;
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ua },
      body: JSON.stringify({
        videoId: id,
        context: { client: { clientName: "WEB", clientVersion: "2.20240701.00.00", hl: "en", gl: "US" } },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const raw = await r.text();
    let status: string | null = null;
    let details: unknown = null;
    try {
      const root = JSON.parse(raw) as Record<string, unknown>;
      status = (root.playabilityStatus as { status?: string } | undefined)?.status ?? null;
      const vd = root.videoDetails as Record<string, unknown> | undefined;
      details = vd
        ? { isLive: vd.isLive, isLiveNow: vd.isLiveNow, isLiveContent: vd.isLiveContent }
        : null;
    } catch {
      // not json
    }
    playerReport = { http: r.status, len: raw.length, status, details, head: raw.slice(0, 80) };
  } catch (e) {
    playerReport = { error: String(e).slice(0, 120) };
  }

  return NextResponse.json(
    {
      id,
      page: await page(
        `https://www.youtube.com/watch?v=${id}&hl=en&gl=US&bpctr=9999999999&has_verified=1`,
      ),
      mobile: await page(`https://m.youtube.com/watch?v=${id}&hl=en`),
      next: nextReport,
      player: playerReport,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
