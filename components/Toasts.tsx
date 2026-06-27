"use client";

import { usePlanCtx } from "./PlanContext";

const TONE: Record<string, string> = {
  info: "border-plum/40 bg-white text-foreground",
  warn: "border-gold bg-gold/20 text-amber-900",
  love: "border-rose bg-blush/60 text-rose",
};

export default function Toasts() {
  const { toasts } = usePlanCtx();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-md rounded-full border-2 px-4 py-2 text-sm font-semibold shadow-lg ${
            TONE[t.tone] ?? TONE.info
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
