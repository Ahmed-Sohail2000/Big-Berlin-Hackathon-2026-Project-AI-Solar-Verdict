import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BuildingTypeSchema,
  GoalSchema,
  GridTypeSchema,
  HeatingSchema,
  RoofSegmentSchema,
  RoofTypeSchema,
} from "@/data/schema";
import { createLead, listLeads } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

const PreferenceSchema = z.enum(["yes", "no", "idk"]);
const LeadStatusSchema = z.enum(["new", "accepted", "offer_sent", "closed"]);

// Lenient variant of RoofSegmentSchema: Solar API mappers default missing
// areas to 0 — a zero-area segment is skipped by the sizer, not an error.
const LenientRoofSegmentSchema = RoofSegmentSchema.extend({
  areaMeters2: z.number().nonnegative(),
});

// Zod defaults keep old clients working (heating/goal/ev were previously
// defaulted inline). Unknown keys (e.g. legacy `bomVariants`) are stripped —
// the installer side composes variants from the cached market catalog.
const CreateLeadSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().optional(),
  status: LeadStatusSchema.optional(),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  district: z.string().optional(),
  customerName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  monthlyBillEur: z.number().positive(),
  ev: z.boolean().default(false),
  heating: HeatingSchema.default("gas"),
  goal: z.union([GoalSchema, z.literal("independent")]).default("lower_bill"),
  evPref: PreferenceSchema.optional(),
  wantsBattery: PreferenceSchema.optional(),
  wantsHeatPump: PreferenceSchema.optional(),
  gridType: GridTypeSchema.optional(),
  // Commercial intake fields (additive; absent => residential / DE defaults).
  buildingType: BuildingTypeSchema.optional(),
  country: z.string().min(1).optional(),
  roofType: RoofTypeSchema.optional(),
  peakDemandKw: z.number().positive().optional(),
  roofSegments: z.array(LenientRoofSegmentSchema).optional(),
  // Gradium voice memo recorded on the intake page — stored in privateDetails.
  voiceNote: z
    .object({
      audioDataUrl: z.string().min(1),
      transcript: z.string().optional(),
      durationMs: z.number().nonnegative().optional(),
    })
    .optional(),
});

export async function GET() {
  return NextResponse.json({
    leads: listLeads(),
    // The lead store is in-process server state — always "live".
    apiStatus: { source: "live", status: "ok", latencyMs: 0 },
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = CreateLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid lead payload",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      lead: createLead(parsed.data),
      apiStatus: { source: "live", status: "ok", latencyMs: 0 },
    },
    { status: 201 },
  );
}
