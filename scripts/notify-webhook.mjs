#!/usr/bin/env node
/**
 * POST an alert to a chat webhook — the phone-side mirror of the GitHub issue.
 *
 * The workflow issue is the alert of record (searchable, closes itself on
 * recovery). It is still the wrong shape for the first ten minutes after a
 * mirror dies: nobody watches the Issues tab. This adds the push.
 *
 *   node scripts/notify-webhook.mjs --title "…" --file twitter-health-alerts.md
 *   node scripts/notify-webhook.mjs --title "…" --text "one line"
 *
 * Configure with ONE environment variable / repository secret:
 *
 *   ALERT_WEBHOOK_URL   the chat endpoint. The payload is chosen from the host,
 *                       so the same secret works for every provider:
 *     Discord         https://discord.com/api/webhooks/…      → { content }
 *     Slack           https://hooks.slack.com/services/…       → { text }
 *     Google Chat     https://chat.googleapis.com/v1/spaces/…  → { text }
 *     Telegram        https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>
 *                                                              → { chat_id, text }
 *     anything else                                            → { text }
 *
 *   ALERT_WEBHOOK_FORMAT  optional override: telegram | discord | slack |
 *                         googlechat | text (for a proxy that hides the host).
 *
 * Telegram is the free route to a phone and needs no workspace: create a bot
 * with @BotFather, message it once, and put the chat id in the URL's `chat_id`
 * query parameter (it is stripped before the request is sent).
 *
 * Unset URL = a no-op with exit 0, so the workflow can call this
 * unconditionally. A *failed* delivery also exits 0 on purpose: the mirror
 * health result must never be masked by a notification problem, but the run
 * gets a `::warning::` annotation so it is still visible.
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);

function arg(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

const WEBHOOK = (process.env.ALERT_WEBHOOK_URL ?? "").trim();
const FORMAT = (process.env.ALERT_WEBHOOK_FORMAT ?? "").trim().toLowerCase();
const TITLE = (arg("title") ?? "LAMP TIK alert").trim();
const FILE = arg("file");
const INLINE = arg("text");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!WEBHOOK) {
  console.log("ALERT_WEBHOOK_URL is not set — chat notification skipped (the GitHub issue is still the alert of record).");
  process.exit(0);
}

function readSource() {
  if (FILE) {
    try {
      return readFileSync(FILE, "utf8");
    } catch (error) {
      return `Could not read ${FILE}: ${error.message}`;
    }
  }
  return INLINE ?? "";
}

/**
 * Markdown tables and fenced blocks do not render in a chat message, and the
 * table is the most useful part of the report — so each row becomes one plain
 * "• mirror — state — 3 renditions" line instead of a wall of pipes.
 */
function toPlainText(markdown) {
  const lines = [];
  let header = null;

  for (const raw of markdown.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("```")) continue;

    const isRow = trimmed.startsWith("|") && trimmed.endsWith("|");
    if (isRow) {
      const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue; // separator
      if (!header) {
        header = cells;
        continue;
      }
      lines.push(`• ${cells.join(" — ")}`);
      continue;
    }

    lines.push(raw.replace(/^#{1,6}\s*/, "").replace(/^\s*[-*]\s+/, "• "));
  }

  return lines
    .join("\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPayload(text) {
  let target = new URL(WEBHOOK);
  const host = target.hostname;
  const isTelegram = FORMAT === "telegram" || host === "api.telegram.org";

  if (isTelegram) {
    const chatId =
      target.searchParams.get("chat_id") ?? (process.env.ALERT_WEBHOOK_CHAT_ID ?? "").trim();
    if (!chatId) {
      return {
        error:
          "Telegram needs a chat id — append ?chat_id=<id> to ALERT_WEBHOOK_URL or set ALERT_WEBHOOK_CHAT_ID.",
      };
    }
    // The token lives in the path; the chat id must not be sent twice.
    target.searchParams.delete("chat_id");
    return {
      url: target.toString(),
      json: { chat_id: chatId, text: text.slice(0, 4_000), disable_web_page_preview: true },
    };
  }

  const isDiscord = FORMAT === "discord" || /(^|\.)discord(app)?\.com$/.test(host);
  const isSlack = FORMAT === "slack" || host === "hooks.slack.com";
  const isGoogleChat = FORMAT === "googlechat" || host === "chat.googleapis.com";

  // Discord's hard limit is 2000 characters; everything else takes ~4000.
  if (isDiscord) return { url: target.toString(), json: { content: text.slice(0, 1_900) } };
  if (isSlack || isGoogleChat) {
    return { url: target.toString(), json: { text: text.slice(0, 3_900) } };
  }
  return { url: target.toString(), json: { text: text.slice(0, 3_900) } };
}

const source = readSource();
const message = `${TITLE}\n\n${toPlainText(source)}`.trim();
const payload = buildPayload(message);

if (payload.error) {
  console.log(`::warning::chat webhook not sent: ${payload.error}`);
  process.exit(0);
}

let lastError = "no attempt made";
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const response = await fetch(payload.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.json),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      await response.body?.cancel().catch(() => undefined);
      console.log(`chat webhook delivered (HTTP ${response.status}).`);
      process.exit(0);
    }
    const body = await response.text().catch(() => "");
    lastError = `HTTP ${response.status} ${body.slice(0, 200)}`.trim();
    // 401/403/404 are configuration problems: retrying cannot fix them.
    if ([401, 403, 404].includes(response.status)) break;
  } catch (error) {
    lastError =
      error?.name === "TimeoutError" ? "timed out after 15s" : `${error?.name ?? "error"}: ${error?.message ?? error}`;
  }
  if (attempt < 3) await sleep(1_500 * attempt);
}

console.log(`::warning::chat webhook delivery failed: ${lastError}`);
process.exit(0);
