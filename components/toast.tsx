"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/cn";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

const TOAST_STYLES = {
  success: { icon: Check, color: "var(--ok)" },
  error: { icon: AlertTriangle, color: "var(--err)" },
  info: { icon: Info, color: "var(--accent)" },
} as const;

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const style = TOAST_STYLES[toast.kind];
  const Icon = style.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 5_200);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      role={toast.kind === "error" ? "alert" : "status"}
      // 100% solid opaque surfaces, rendered IN-FLOW below the tool buttons
      // (see ToastStack): nothing floats over the form any more, so no
      // underlying button text can bleed through. Error cards get the solid
      // `#120b10` + rose border treatment.
      className={cn(
        // Explicit light text on the dark card: the card's background is dark
        // in BOTH themes, so inheriting `var(--text)` made error titles black
        // on near-black in light mode (the unreadable box in the screenshot).
        "pointer-events-auto relative w-full overflow-hidden rounded-2xl p-3.5 text-white shadow-2xl",
        toast.kind === "error"
          ? "border-2 border-rose-500/50 bg-[#120b10]"
          : "border border-white/10 bg-[#0b0c12]",
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" style={{ color: style.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{toast.title}</p>
          {toast.description ? (
            <p
              className={cn(
                "mt-1 text-sm leading-relaxed",
                toast.kind === "error" ? "text-rose-200" : "text-[#c3cbdb]",
              )}
            >
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-white/60 transition-colors duration-100 hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-left"
        style={{ background: style.color, opacity: 0.5 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5.2, ease: "linear" }}
      />
    </motion.div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      // In-flow block below the tool buttons — deliberately NOT `position:
      // fixed`/`absolute`. On 390px screens the old fixed stack landed right
      // on top of the Download CTA and the translucent toast let the button
      // text bleed through.
      className="pointer-events-auto flex w-full flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
