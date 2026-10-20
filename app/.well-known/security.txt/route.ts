export const runtime = "nodejs";
export const dynamic = "force-static";

const BODY = `Contact: mailto:support@lamptik.online
Expires: 2027-10-20T00:00:00.000Z
Encryption: mailto:support@lamptik.online
Acknowledgments: https://www.lamptik.online/about
Policy: https://www.lamptik.online/privacy
Canonical: https://www.lamptik.online/.well-known/security.txt
Preferred-Languages: en
`;

export async function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
