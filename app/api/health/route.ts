import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight liveness probe. */
export function GET() {
  return NextResponse.json({ ok: true });
}
