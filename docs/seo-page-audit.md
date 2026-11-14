# SEO page audit — 87 URLs, 2026-11-14

claude-seo page_checks 2.6.0 · sitemap `https://www.lamptik.online/sitemap.xml`

**Critical 0 · High 0 · Medium 0 · Low 78**

Severity contract: Critical/High/Medium fail the run; Low is informational
and currently means the wide-DOM heuristic, which counts the inline
`self.__next_f` scripts Next streams into `<body>` (one per ~4 KB of flight
data) as if they were the site's own DOM.

The static sprite check runs on the same HTML: every `<use href="#…">` must
resolve to a `<symbol id>` in that document, so a sprite that stops
matching its references fails the run as High rather than shipping
invisible icons.

## Findings above Low

_(none)_

## Low, informational

wide-dom-node

## New since the previous sweep

_(no pages added since the previous sweep)_

## Pages the sweep could not read

_(none)_
