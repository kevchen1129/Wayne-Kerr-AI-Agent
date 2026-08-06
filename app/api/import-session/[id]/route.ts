import { NextResponse } from "next/server";
import { getImportedMeasurementSession } from "@/lib/import-session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = getImportedMeasurementSession(id);

  if (!session) {
    return NextResponse.json(
      { error: "Import session not found or has expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({ session });
}
