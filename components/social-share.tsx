"use client";

import { Check, Copy, Link2, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

import { siteUrl } from "@/lib/site";

/**
 * Share & bookmark magnet — rendered inside the "✓ Download Complete"
 * state. One-click viral referrals: WhatsApp, Telegram, X, Copy Link,
 * plus a Ctrl+D bookmark hint. Zero trackers, plain share intents.
 */
export function SocialShare({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shareText = encodeURIComponent("LAMP TIK — free HD TikTok, Reels & FB downloads, no watermark:");
  const shareUrl = encodeURIComponent(siteUrl);
  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      icon: <MessageCircle className="size-3.5" />,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
      icon: <Send className="size-3.5" />,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      icon: <span aria-hidden="true" className="text-[13px] font-bold leading-none">𝕏</span>,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(siteUrl);
    } catch {
      const input = document.createElement("input");
      input.value = siteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-3"
      }
    >
      {!compact ? (
        <p className="text-[12.5px] font-semibold tracking-tight">
          Loved the speed? Share or bookmark LAMP TIK
        </p>
      ) : null}
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "mt-2"}`}>
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${link.label}`}
            className="btn btn-ghost h-8 gap-1.5 px-2.5 text-[12px]"
          >
            {link.icon}
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="btn btn-ghost h-8 gap-1.5 px-2.5 text-[12px]"
        >
          {copied ? <Check className="size-3.5 text-[var(--ok)]" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <span className="micro hidden items-center gap-1 text-[var(--text-3)] sm:inline-flex">
          <Link2 className="size-3" />
          Ctrl+D to bookmark
        </span>
      </div>
    </div>
  );
}
