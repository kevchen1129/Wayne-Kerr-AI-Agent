import type { AnalysisMode, ImportedMeasurementFile, ImportedMeasurementSession } from "@/lib/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type SessionRecord = ImportedMeasurementSession & {
  expiresAt: number;
};

const sessionStore = new Map<string, SessionRecord>();

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const toDataUrl = async (file: File) => {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
};

const parseDelimitedText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const delimiter = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes(",")
      ? ","
      : null;

  if (!delimiter) {
    return null;
  }

  const columns = lines[0]
    .split(delimiter)
    .map((cell) => cell.trim())
    .filter(Boolean);

  if (columns.length === 0) {
    return null;
  }

  const rows = lines.slice(1, 7).map((line) => {
    const values = line.split(delimiter).map((cell) => cell.trim());
    return columns.reduce<Record<string, string>>((acc, column, index) => {
      acc[column] = values[index] ?? "";
      return acc;
    }, {});
  });

  return { columns, rows };
};

const buildContextText = (
  files: ImportedMeasurementFile[],
  sourceApp?: string,
  question?: string
) => {
  const sections: string[] = [];

  if (sourceApp) {
    sections.push(`Source app: ${sourceApp}`);
  }

  if (question) {
    sections.push(`Requested analysis: ${question}`);
  }

  const imageNames = files.filter((file) => file.kind === "image").map((file) => file.name);
  if (imageNames.length > 0) {
    sections.push(`Imported sweep images: ${imageNames.join(", ")}`);
  }

  const tabularFiles = files.filter((file) => file.tablePreview);
  if (tabularFiles.length > 0) {
    const tableBlocks = tabularFiles.map((file) => {
      const columns = file.tablePreview?.columns.join(", ") || "";
      const rows =
        file.tablePreview?.rows
          .map((row) =>
            Object.entries(row)
              .map(([key, value]) => `${key}=${value}`)
              .join("; ")
          )
          .join("\n") || "";
      return `Table file: ${file.name}\nColumns: ${columns}\nSample rows:\n${rows}`;
    });
    sections.push(tableBlocks.join("\n\n"));
  }

  const notes = files
    .filter((file) => file.note)
    .map((file) => `${file.name}: ${file.note}`)
    .join("\n");
  if (notes) {
    sections.push(`Attachment notes:\n${notes}`);
  }

  return sections.join("\n\n").trim();
};

const buildSummaryText = (files: ImportedMeasurementFile[], sourceApp?: string) => {
  const imageCount = files.filter((file) => file.kind === "image").length;
  const tableCount = files.filter((file) => file.tablePreview).length;
  const xlsxCount = files.filter((file) => file.kind === "spreadsheet").length;

  const parts = [
    sourceApp ? `已從 ${sourceApp} 匯入資料。` : "已匯入外部量測資料。",
    imageCount > 0 ? `圖片 ${imageCount} 張` : null,
    tableCount > 0 ? `可解析表格 ${tableCount} 份` : null,
    xlsxCount > 0 ? `Excel 附件 ${xlsxCount} 份` : null
  ].filter(Boolean);

  return parts.join("，");
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (session.expiresAt <= now) {
      sessionStore.delete(id);
    }
  }
};

export const createImportedMeasurementSession = async (params: {
  files: File[];
  mode?: AnalysisMode;
  sourceApp?: string;
  question?: string;
}) => {
  cleanupExpiredSessions();

  const normalizedFiles: ImportedMeasurementFile[] = [];

  for (const file of params.files) {
    const mimeType = file.type || "application/octet-stream";
    const lowerName = file.name.toLowerCase();
    const baseFile = {
      id: makeId(),
      name: file.name,
      mimeType,
      sizeBytes: file.size
    };

    if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lowerName)) {
      normalizedFiles.push({
        ...baseFile,
        kind: "image",
        dataUrl: await toDataUrl(file)
      });
      continue;
    }

    if (
      mimeType.includes("csv") ||
      mimeType.startsWith("text/") ||
      /\.(csv|txt|tsv)$/i.test(lowerName)
    ) {
      const rawText = await file.text();
      const tablePreview = parseDelimitedText(rawText);
      normalizedFiles.push({
        ...baseFile,
        kind: "csv",
        textPreview: rawText.slice(0, 4000),
        tablePreview: tablePreview || undefined,
        note: tablePreview
          ? undefined
          : "Plain text imported, but a CSV/TSV table could not be parsed automatically."
      });
      continue;
    }

    if (
      mimeType.includes("sheet") ||
      /\.(xlsx|xls)$/i.test(lowerName)
    ) {
      normalizedFiles.push({
        ...baseFile,
        kind: "spreadsheet",
        note: "Excel file attached. Current MVP stores the file metadata, but structured parsing is not enabled yet. Export CSV for best analysis quality."
      });
      continue;
    }

    normalizedFiles.push({
      ...baseFile,
      kind: "spreadsheet",
      note: "Unsupported file type stored as attachment metadata only."
    });
  }

  const id = makeId();
  const createdAt = new Date().toISOString();
  const summaryText = buildSummaryText(normalizedFiles, params.sourceApp);
  const contextText = buildContextText(normalizedFiles, params.sourceApp, params.question);

  const session: SessionRecord = {
    id,
    mode: params.mode ?? "interpret_graph",
    sourceApp: params.sourceApp,
    question: params.question,
    summaryText,
    contextText,
    files: normalizedFiles,
    createdAt,
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  sessionStore.set(id, session);
  return session;
};

export const getImportedMeasurementSession = (id: string): ImportedMeasurementSession | null => {
  cleanupExpiredSessions();
  const session = sessionStore.get(id);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessionStore.delete(id);
    return null;
  }

  const { expiresAt: _expiresAt, ...rest } = session;
  return rest;
};
