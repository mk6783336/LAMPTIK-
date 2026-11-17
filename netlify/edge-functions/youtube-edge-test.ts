/**
 * Temporary edge-egress probe.
 *
 * Netlify Functions run on AWS and YouTube answers them with a bot check. Edge
 * Functions run on the edge network, so this endpoint asks Innertube from that
 * network and returns the raw player response. If it contains a muxed MP4,
 * the Node resolver can use this as its last-resort transport.
 */
export default async (request: Request): Promise<Response> => {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return new Response(JSON.stringify({ error: "bad id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const body = {
    videoId: id,
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "21.26.364",
        androidSdkVersion: 30,
        osName: "Android",
        osVersion: "11",
        hl: "en",
        gl: "US",
      },
    },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const upstream = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "com.google.android.youtube/21.26.364 (Linux; U; Android 11) gzip",
      "X-YouTube-Client-Name": "3",
      "X-YouTube-Client-Version": "21.26.364",
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-edge-egress": "1",
    },
  });
};

export const config = { path: "/api/youtube-edge-test" };
