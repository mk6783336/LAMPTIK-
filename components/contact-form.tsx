"use client";

import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";

const SUPPORT_EMAIL = "support@lamptik.online";

const TOPICS = [
  "General support",
  "Copyright / DMCA takedown",
  "A video won't download",
  "Business or advertising",
  "Privacy question",
] as const;

interface FormState {
  name: string;
  email: string;
  topic: string;
  message: string;
}

const EMPTY: FormState = { name: "", email: "", topic: TOPICS[0], message: "" };

/**
 * Client-side contact form. There is no backend mailbox on this plan, so a
 * valid submission opens the visitor's mail client with everything prefilled
 * to support@lamptik.online — a real, working contact path with zero
 * server-side data retention (consistent with the privacy policy).
 */
export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }
    // Pragmatic email check: something@something.tld
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("Please enter a valid email address so we can reply.");
      return;
    }
    if (message.length < 10) {
      setError("Please write at least a sentence so we can help.");
      return;
    }

    const subject = `[${form.topic}] ${name} — lamptik.online`;
    const body = [
      message,
      "",
      "—",
      `From: ${name} <${email}>`,
      `Topic: ${form.topic}`,
      `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].join("\n");

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
    window.location.href = mailto;
  }

  if (sent) {
    return (
      <div
        role="status"
        className="panel p-5 sm:p-6"
      >
        <p className="text-[15px] font-medium tracking-tight">
          Your email app should be opening now.
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-2)]">
          Press send in the composed message and we&apos;ll reply to your
          address. If nothing opened, email us directly at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-[var(--accent-text)] underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY);
            setSent(false);
          }}
          className="btn btn-ghost mt-4 h-10 px-4 text-[13px]"
        >
          Write another message
        </button>
      </div>
    );
  }

  const fieldClass =
    "mt-1.5 w-full rounded-control border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5 text-[14px] text-[var(--text)] outline-none transition-colors duration-150 placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] font-medium text-[var(--text-2)]">
          Your name
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ada Creator"
            className={fieldClass}
          />
        </label>
        <label className="block text-[13px] font-medium text-[var(--text-2)]">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@example.com"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-[13px] font-medium text-[var(--text-2)]">
        Topic
        <select
          name="topic"
          value={form.topic}
          onChange={(event) => update("topic", event.target.value)}
          className={fieldClass}
        >
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[13px] font-medium text-[var(--text-2)]">
        Message
        <textarea
          name="message"
          rows={6}
          required
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Paste the link in question and describe what happened (for DMCA notices, include the work and the URL)."
          className={cn(fieldClass, "resize-y leading-relaxed")}
        />
      </label>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--err)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="submit" className="btn btn-primary h-11 px-5 text-[14px] font-semibold">
          Send message
        </button>
        <p className="text-[12px] text-[var(--text-3)]">
          Opens your email app, prefilled — nothing is stored here.
        </p>
      </div>
    </form>
  );
}
