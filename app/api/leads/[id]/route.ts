import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BomSchema } from "@/data/schema";
import { acceptLead, approveLead, getLead, sendOffer } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    installerName: z.string().optional(),
    installerLogoEmoji: z.string().optional(),
    finalBom: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
  }),
  z.object({
    action: z.literal("accept"),
    acceptedByInstallerId: z.string().optional(),
    installerName: z.string().optional(),
    installerLogoEmoji: z.string().optional(),
  }),
  z.object({
    action: z.literal("offer"),
    bom: BomSchema.optional(),
    totalEur: z.number().positive().optional(),
    installerNotes: z.string().optional(),
  }),
]);

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const lead = getLead(id);
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    lead,
    apiStatus: { source: "live", status: "ok", latencyMs: 0 },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid patch payload (expected action: approve | accept | offer)",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }
  const body = parsed.data;

  if (body.action === "approve") {
    const updated = approveLead(id, {
      installerName: body.installerName ?? "Berlin Solar Pro",
      installerLogoEmoji: body.installerLogoEmoji ?? "☀",
      finalBom: body.finalBom,
    });
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ lead: updated });
  }

  if (body.action === "accept") {
    const updated = acceptLead(id, {
      acceptedByInstallerId: body.acceptedByInstallerId,
      installerName: body.installerName,
      installerLogoEmoji: body.installerLogoEmoji,
    });
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ lead: updated });
  }

  // action === "offer"
  const existing = getLead(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const bom = body.bom ?? existing.publicPreview.bomVariants[1].bom;
  const updated = sendOffer(id, {
    bom,
    totalEur: body.totalEur,
    installerNotes: body.installerNotes,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ lead: updated, success: true });
}
