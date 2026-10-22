"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useEffect } from "react";

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
      // Solid opaque surface (NOT the translucent glass `.panel`): this stack
      // is `fixed bottom-4` over page content, and on 390px viewports the
      // error toast sat directly on top of the Download CTA with button text
      // bleeding through the glass. Opaque bg + blur + shadow keeps it legible.
      className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c12]/95 p-3.5 shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" style={{ color: style.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-2)]">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-[var(--text-3)] transition-colors duration-100 hover:bg-[var(--field)] hover:text-[var(--text)]"
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
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
