import { NextResponse } from "next/server";
import { createImportedMeasurementSession } from "@/lib/import-session-store";
import type { AnalysisMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isAnalysisMode = (value: string): value is AnalysisMode =>
  value === "identify_dut" ||
  value === "interpret_graph" ||
  value === "dc_bias_saturation" ||
  value === "catalog_qa";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const modeValue = String(formData.get("mode") || "interpret_graph");
    const sourceApp = String(formData.get("sourceApp") || "").trim() || undefined;
    const question = String(formData.get("question") || "").trim() || undefined;
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files were uploaded. Use the `files` field and attach at least one PNG, CSV, or Excel file." },
        { status: 400 }
      );
    }

    const session = await createImportedMeasurementSession({
      files,
      mode: isAnalysisMode(modeValue) ? modeValue : "interpret_graph",
      sourceApp,
      question
    });

    return NextResponse.json({
      sessionId: session.id,
      openUrl: `/?importSession=${session.id}`,
      session
    });
  } catch (error) {
    console.error("import-measurement failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import measurement files." },
      { status: 500 }
    );
  }
}
