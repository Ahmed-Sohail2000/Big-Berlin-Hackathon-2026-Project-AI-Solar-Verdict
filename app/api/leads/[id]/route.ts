import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BomSchema } from "@/data/schema";
import {
  acceptLead,
  approveLead,
  deleteLead,
  getLead,
  sendOffer,
  updateLeadPreview,
} from "@/lib/leads/store";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

// Route param is always a non-empty string; validate defensively so a blank id
// (e.g. "/api/leads/%20") is rejected as a 400 rather than a silent 404.
const IdSchema = z.string().trim().min(1);

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
  z.object({
    action: z.literal("sync-preview"),
    roofFacts: z
      .object({
        totalAreaM2: z.number().optional(),
        pitchDeg: z.number().optional(),
        azimuth: z.number().optional(),
        segmentsCount: z.number().optional(),
      })
      .optional(),
    panelCount: z.number().positive().optional(),
    roofSegments: z
      .array(
        z.object({
          pitchDegrees: z.number(),
          azimuthDegrees: z.number(),
          areaMeters2: z.number(),
          annualSunshineHours: z.number(),
        }),
      )
      .optional(),
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
        error: "invalid patch payload (expected action: approve | accept | offer | sync-preview)",
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

  if (body.action === "sync-preview") {
    const updated = updateLeadPreview(id, {
      roofFacts: body.roofFacts,
      panelCount: body.panelCount,
      roofSegments: body.roofSegments,
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

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      {
        error: "invalid lead id",
        issues: parsedId.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }
  const removed = deleteLead(parsedId.data);
  if (!removed) {
    return NextResponse.json(
      {
        error: "not found",
        // The lead store is in-process server state — always "live".
        apiStatus: { source: "live", status: "ok", latencyMs: 0 },
      },
      { status: 404 },
    );
  }
  return NextResponse.json(
    {
      deleted: true,
      id: parsedId.data,
      apiStatus: { source: "live", status: "ok", latencyMs: 0 },
    },
    { status: 200 },
  );
}
