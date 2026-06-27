import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getOrCreatePlan } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a fresh plan with a random, unguessable id (seeded from the guest list). */
export async function POST() {
  const planId = nanoid(10);
  const plan = await getOrCreatePlan(planId);
  return NextResponse.json({ planId: plan.planId });
}
