import { NextResponse, type NextRequest } from "next/server";

import { adsterraBannerUrl } from "@/lib/monetization";

export const runtime = "nodejs";

/**
 * Isolated ad frame.
 *
 * Why a route instead of `srcdoc`: a `srcdoc` iframe inherits the embedding
 * document's Content-Security-Policy. Adsterra's creative loader calls
 * `eval()`, and its Social Bar creative fetches from cdn.show-sb.com — both of
 * which the *site* policy blocks (correctly). Serving the frame from its own
 * URL means the frame gets its own policy headers: permissive enough for the
 * network, while the page a visitor actually browses keeps a strict,
 * eval-free CSP.
 *
 * The key is validated as hex so a crafted query string cannot inject markup
 * or point the frame at a different host.
 */
const KEY_PATTERN = /^[a-f0-9]{16,48}$/i;
const SIZES: Record<string, { width: number; height: number }> = {
  "728x90": { width: 728, height: 90 },
  "300x250": { width: 300, height: 250 },
};

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const key = (params.get("key") ?? "").trim();
  const size = SIZES[`${params.get("w")}x${params.get("h")}`];

  if (!KEY_PATTERN.test(key) || !size) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const tag = adsterraBannerUrl(key);
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="referrer" content="no-referrer-when-downgrade">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}body{display:flex;align-items:center;justify-content:center}</style>
</head><body>
<script type="text/javascript">atOptions={"key":${JSON.stringify(key)},"format":"iframe","height":${size.height},"width":${size.width},"params":{}};</script>
<script type="text/javascript" src="${tag}"></script>
<script type="text/javascript">
(function(){
  var sent=false;
  function signalFill(){
    if(sent)return;
    var frames=document.querySelectorAll('iframe');
    for(var i=0;i<frames.length;i++){
      var frame=frames[i];
      var width=Number(frame.getAttribute('width'))||frame.width||0;
      var height=Number(frame.getAttribute('height'))||frame.height||0;
      if(width>0&&height>0){
        sent=true;
        parent.postMessage({type:'lamptik-ad-fill',key:${JSON.stringify(key)}},location.origin);
        return;
      }
    }
  }
  var observer=new MutationObserver(signalFill);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(signalFill,250);
  setTimeout(function(){observer.disconnect()},4000);
})();
</script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer-when-downgrade",
      // Frame-scoped policy: the creative loader needs eval, and the
      // networks rotate hundreds of RTB creative domains that cannot be
      // enumerated — so the frame allows the full https: scheme on every
      // ad-carrying directive instead of a whitelist that would silently
      // kill live creatives (Adsterra bellnewyork.org + Monetag n6wxm.com /
      // uplcm.com / 3nbf4.com included).
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:",
        "style-src 'self' 'unsafe-inline' https: data:",
        "img-src * data: blob:",
        "connect-src * data: blob:",
        "frame-src https: blob:",
        "child-src https: blob:",
        "font-src 'self' data: https:",
        "media-src * blob:",
        "object-src 'none'",
      ].join("; "),
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
