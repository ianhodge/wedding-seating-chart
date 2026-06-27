"use client";

import { useEffect, type ReactNode } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-plum/30 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className={`my-auto w-full ${
          wide ? "max-w-4xl" : "max-w-lg"
        } rounded-3xl border-2 border-rose/30 bg-background p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold text-rose">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-rose/30 text-lg text-rose transition hover:bg-blush/40"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
