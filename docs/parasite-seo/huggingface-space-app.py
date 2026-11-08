# LAMP TIK — Hugging Face Space (Gradio)

A single-file Space that accepts any TikTok / Instagram / Facebook / YouTube
link and returns a one-click button that opens
`https://www.lamptik.online/?url=<encoded link>`, where the file actually
resolves. It also links the four creator tools.

## Honest framing (read before publishing)

- **This app does not download anything itself.** It is a doorway to the web
  tool. Say so on the Space card and in the app footer — a Space that claims to
  fetch video and then hands you a link gets reported, and reports are what
  remove Spaces.
- Affiliate/ownership disclosure is mandatory when you are the operator of the
  destination site: "Built and maintained by the LAMP TIK team."
- Hugging Face Spaces are for ML demos. A pure redirect Space can be removed
  under their content policy at any time; it is a 24–48h visibility play, not
  an asset. Do not build other mechanics on top of it.
- Name it for what it does: the title below is accurate. Do not promise
  watermark removal that a given source may not deliver.

## Deploy

1. huggingface.co → New Space → **Gradio** SDK → CPU basic (free).
2. Paste this file as `app.py`, add `requirements.txt` with `gradio==5.*`.
3. Set the Space title/description to the same wording as the app.
4. Wait for the build, then submit the Space URL to Google yourself (Search
   Console → URL Inspection → Request Indexing) — Spaces are indexed fast but
   not automatically.

```python
# app.py
import urllib.parse
import gradio as gr

SITE = "https://www.lamptik.online"
TOOLS = [
    ("TikTok video + MP3", f"{SITE}/tiktok-downloader"),
    ("Instagram Reels + audio", f"{SITE}/instagram-reels-downloader"),
    ("YouTube Shorts + MP3", f"{SITE}/youtube-downloader"),
    ("Facebook video", f"{SITE}/facebook-downloader"),
]

HOSTS = (
    "tiktok.com", "instagram.com", "facebook.com", "fb.watch",
    "youtube.com", "youtu.be", "x.com", "twitter.com",
)


def build(url: str):
    url = (url or "").strip()
    if not url:
        return (
            "Paste a video link first.",
            gr.update(visible=False),
            gr.update(visible=False),
        )
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname or ""
    host = host[4:] if host.startswith("www.") else host
    if not any(host == h or host.endswith("." + h) for h in HOSTS):
        return (
            "That is not a TikTok, Instagram, Facebook, YouTube or X link.",
            gr.update(visible=False),
            gr.update(visible=False),
        )

    target = f"{SITE}/?url={urllib.parse.quote(url, safe='')}"
    summary = f"**{host}** link accepted.\n\nOpen it on LAMP TIK — the file starts resolving immediately:\n\n{target}"
    return summary, gr.update(value=target, visible=True), gr.update(visible=True)


with gr.Blocks(title="Video link → clean file") as demo:
    gr.Markdown(
        "# TikTok, Instagram Reels & YouTube video link opener\n"
        "Paste a video link. This Space does not store or fetch the file: it hands "
        "the link to **lamptik.online**, which resolves the clean stream and gives "
        "you MP4/M4A download buttons in your browser.\n\n"
        "*No login. No watermark on TikTok downloads. Nothing is stored server-side.*"
    )
    with gr.Row():
        link = gr.Textbox(
            label="Video link",
            placeholder="https://www.tiktok.com/@user/video/123…",
            scale=4,
        )
        go = gr.Button("Get download link", variant="primary", scale=1)

    out = gr.Markdown()
    open_btn = gr.Button("Open on LAMP TIK →", variant="primary", visible=False)
    open_link = gr.Markdown(visible=False)

    go.click(build, inputs=link, outputs=[out, open_btn, open_link])
    link.submit(build, inputs=link, outputs=[out, open_btn, open_link])

    gr.Markdown("### Creator tools")
    gr.Markdown(
        "\n".join(f"- [{label}]({href})" for label, href in TOOLS)
    )
    gr.Markdown(
        "---\n"
        "Built and maintained by the LAMP TIK team. This Space links to our own "
        "tool; it does not host media and does not bypass any platform's terms. "
        "Download only content you have the right to save."
    )


if __name__ == "__main__":
    demo.launch()
```

## Why the `?url=` form

The site resolves `?url=` on mount (see `components/downloader.tsx`), so the
visitor lands on a result instead of an empty input. That is the difference
between a Space that sends traffic and one that sends a bounce.
