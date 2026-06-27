import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getOrCreatePlan } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a fresh plan with a random, unguessable id (seeded from the guest list). */
export async function POST() {
  try {
    const planId = nanoid(16);
    const plan = await getOrCreatePlan(planId);
    return NextResponse.json({ planId: plan.planId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "failed to create plan" }, { status: 500 });
  }
}
