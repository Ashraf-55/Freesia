"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string; leaving?: boolean };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "✨",
};

const ACCENTS: Record<ToastKind, string> = {
  success: "border-s-4 border-[var(--success)]",
  error: "border-s-4 border-[var(--error)]",
  info: "border-s-4 border-gold-500",
};

/**
 * Lightweight, dependency-free toast system (no new colors — reuses
 * the existing success/error/gold tokens). Mount once near the root
 * via <ToastProvider>, then call useToast() anywhere on the client.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-[var(--shadow-lift)] ${ACCENTS[t.kind]} ${
              t.leaving ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                t.kind === "error" ? "bg-[var(--error)]" : t.kind === "info" ? "bg-gold-500" : "bg-[var(--success)]"
              }`}
            >
              {ICONS[t.kind]}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? (() => {});
}
