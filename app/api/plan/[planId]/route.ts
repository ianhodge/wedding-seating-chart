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
  if (!planId) {
    return NextResponse.json({ error: "missing planId" }, { status: 400 });
  }
  try {
    const plan = await getOrCreatePlan(planId);
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "failed to load plan" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;

  let body: PlanDoc;
  try {
    body = (await req.json()) as PlanDoc;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (body.planId !== planId) {
    return NextResponse.json({ error: "planId mismatch" }, { status: 400 });
  }
  if (typeof body.version !== "number") {
    return NextResponse.json({ error: "missing version" }, { status: 400 });
  }

  try {
    const res = await getAdapter().put(body, body.version);
    if (!res.ok) {
      return NextResponse.json(
        { conflict: true, current: res.current },
        { status: 409 },
      );
    }
    return NextResponse.json(res.doc);
  } catch {
    return NextResponse.json({ error: "failed to save plan" }, { status: 500 });
  }
}
