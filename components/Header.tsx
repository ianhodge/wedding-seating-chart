"use client";

import { useState } from "react";
import Image from "next/image";

export default function Header({ coupleName }: { coupleName: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <header className="border-b-4 border-rose/40 bg-white/60 px-4 py-6 text-center backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-rose shadow-lg">
          <Image
            src="/matt-and-ian.jpg"
            alt={coupleName}
            fill
            sizes="96px"
            className="object-cover"
            priority
          />
        </div>
        <h1 className="font-script text-4xl text-rose drop-shadow-sm sm:text-5xl">
          {coupleName}
        </h1>
        <p className="font-serif text-base italic opacity-80 sm:text-lg">
          💕 Pick a seat, not a side 💕
        </p>
        <button
          onClick={onShare}
          className="mt-1 rounded-full bg-rose px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:brightness-110"
        >
          {copied ? "Link copied! 💌" : "🔗 Share with the wedding crew"}
        </button>
      </div>
    </header>
  );
}
