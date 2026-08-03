import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BomSchema } from "@/data/schema";
import { getLead, sendOffer } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const OfferSchema = z.object({
  bom: BomSchema.optional(),
  totalEur: z.number().positive().optional(),
  installerNotes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = OfferSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid offer payload",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }
  const existing = getLead(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const bom = parsed.data.bom ?? existing.publicPreview.bomVariants[1].bom;
  const lead = sendOffer(id, {
    bom,
    totalEur: parsed.data.totalEur,
    installerNotes: parsed.data.installerNotes,
  });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ lead, success: true });
}
