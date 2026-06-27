import { NextRequest, NextResponse } from "next/server";
import { getAdapter, getOrCreatePlan } from "@/lib/store";
import { PlanDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const plan = await getOrCreatePlan(planId);
  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const body = (await req.json()) as PlanDoc;
  if (body.planId !== planId) {
    return NextResponse.json({ error: "planId mismatch" }, { status: 400 });
  }
  const res = await getAdapter().put(body, body.version);
  if (!res.ok) {
    return NextResponse.json({ conflict: true, current: res.current }, { status: 409 });
  }
  return NextResponse.json(res.doc);
}
