import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptLead } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

const AcceptSchema = z.object({
  acceptedByInstallerId: z.string().optional(),
  installerName: z.string().optional(),
  installerLogoEmoji: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = AcceptSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid accept payload",
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }
  const lead = acceptLead(id, {
    acceptedByInstallerId: parsed.data.acceptedByInstallerId,
    installerName: parsed.data.installerName,
    installerLogoEmoji: parsed.data.installerLogoEmoji,
  });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ lead, success: true });
}
