import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type CatalogImportRequest = {
  text?: string;
  locale?: "zh" | "en";
};

type ParsedCatalogProduct = {
  model?: string;
  product_name?: string;
  category?: string;
  min_frequency_value?: number | null;
  max_frequency_value?: number | null;
  frequency_unit?: string | null;
  measurement_functions?: string[];
  dc_bias_support?: boolean | null;
  summary_zh?: string;
  summary_en?: string;
  raw_specs_json?: Record<string, unknown>;
};

type NormalizedCatalogProduct = {
  model: string | undefined;
  product_name: string | null;
  category: string | null;
  min_frequency_value: number | null;
  max_frequency_value: number | null;
  frequency_unit: string | null;
  measurement_functions: string[];
  dc_bias_support: boolean | null;
  summary_zh: string | null;
  summary_en: string | null;
  raw_specs_json: Record<string, unknown>;
};

type ParsedCatalogDocument = {
  title?: string;
  doc_type?: string;
  language?: string;
  related_models?: string[];
  summary_zh?: string;
  summary_en?: string;
  tags?: string[];
};

type NormalizedCatalogDocument = {
  title: string;
  doc_type: string;
  language: string;
  related_models: string[];
  summary_zh: string | null;
  summary_en: string | null;
  tags: string[];
};

const BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";
const TIMEOUT_MS = 180000;
const PDF_URL_REGEX = /(https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?)/i;

const extractOutputText = (data: unknown) => {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;

  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0] as { message?: { content?: unknown } } | undefined;
  const messageContent = firstChoice?.message?.content;

  if (typeof messageContent === "string" && messageContent.trim()) {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    const chunks = messageContent
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const partRecord = part as { type?: unknown; text?: unknown };
        return partRecord.type === "text" && typeof partRecord.text === "string"
          ? partRecord.text
          : "";
      })
      .filter(Boolean);

    if (chunks.length > 0) {
      return chunks.join("\n").trim();
    }
  }

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  const legacyChunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content?: unknown }).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const partRecord = part as { type?: unknown; text?: unknown };
      if (partRecord.type === "output_text" && typeof partRecord.text === "string") {
        legacyChunks.push(partRecord.text);
      }
    }
  }

  return legacyChunks.join("\n").trim();
};

const extractFirstJson = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeModelHint = (value: string) => value.replace(/[^A-Z0-9-]/gi, "").toUpperCase();

const extractModelCodes = (value: string) =>
  Array.from(new Set(value.toUpperCase().match(/[A-Z]{0,3}\d{3,5}[A-Z]{0,3}/g) ?? []))
    .map(normalizeModelHint)
    .filter((candidate) => candidate.length >= 4);

const getPdfFilename = (pdfUrl: string) => {
  try {
    return decodeURIComponent(new URL(pdfUrl).pathname.split("/").pop() || "");
  } catch {
    return "";
  }
};

const getDocumentType = (pdfUrl: string) => {
  const filename = getPdfFilename(pdfUrl).toLowerCase();
  if (/(user\s*manual|operating\s*manual|instruction\s*manual)/.test(filename)) return "manual";
  if (/(fixture|test\s*fixture|adapter|test\s*lead)/.test(filename)) return "fixture";
  if (/(accessory|accessories|option)/.test(filename)) return "accessory";
  if (/(application\s*note|app\s*note)/.test(filename)) return "application_note";
  return "datasheet";
};

const isCatalogDocument = (pdfUrl: string) => {
  const filename = getPdfFilename(pdfUrl).toLowerCase();
  return (
    new URL(pdfUrl).pathname.toLowerCase().includes("/catalog_documents/") ||
    /(user\s*manual|operating\s*manual|instruction\s*manual|fixture|test\s*fixture|adapter|test\s*lead|accessory|application\s*note)/.test(
      filename
    )
  );
};

const extractModelHintsFromPdfUrl = (pdfUrl: string) => {
  return extractModelCodes(getPdfFilename(pdfUrl));
};

const extractModelHintsFromPdfText = (pdfText: string) => {
  const hintSet = new Set<string>();

  const patterns = [
    /\b\d[A-Z]{2,}\d{3,}[A-Z0-9-]*\b/g,
    /\b[A-Z]{0,3}\d{3,5}[A-Z]{0,3}\b/g,
    /Wayne\s+Kerr\s+([A-Z0-9-]{4,})/gi
  ];

  for (const pattern of patterns) {
    for (const match of pdfText.matchAll(pattern)) {
      const candidate = normalizeModelHint(match[1] || match[0] || "");
      if (candidate.length >= 4) {
        hintSet.add(candidate);
      }
    }
  }

  return Array.from(hintSet).slice(0, 24);
};

const modelMatchesHint = (model: string, hint: string) =>
  model === hint || model.includes(hint) || hint.includes(model);

const buildImportPrompt = (
  locale: "zh" | "en",
  pdfUrl: string,
  pdfText: string,
  modelHints: string[]
) => {
  const truncatedText = pdfText.slice(0, 18000);
  const modelHintLine =
    modelHints.length > 0 ? `Possible model / fixture codes found in PDF: ${modelHints.join(", ")}` : "";
  if (locale === "zh") {
    return [
      "你是 Wayne Kerr 型錄匯入助理。",
      "請從提供的 PDF 文字中抽取可匯入 catalog_products 的產品資料。",
      "只輸出 JSON，不要 Markdown，不要額外說明。",
      "如果 PDF 中出現多個不同型號、fixture、accessory 或 option code，products 陣列必須拆成多筆，一個型號一筆。",
      "不要把多個型號合併成單一系列摘要列；即使它們同屬一個 family，也要逐一輸出。",
      "如果某欄沒有明確資訊，請填 null 或空陣列，不要捏造。",
      "summary_zh 必須是繁體中文；summary_en 必須是英文。",
      "measurement_functions 請盡量用短縮寫，例如 L, C, R, Z, Q, D, ESR。",
      "dc_bias_support 若文件沒明寫，填 null。",
      "若是治具、fixture、accessory、test lead、adapter，category 請填 Fixture 或 Accessory，不要誤分類成儀器。",
      `source_pdf_url: ${pdfUrl}`,
      modelHintLine,
      `PDF text:\n${truncatedText}`,
      `Schema:
{
  "products": [
    {
      "model": "6500B",
      "product_name": "Wayne Kerr 6500B",
      "category": "Precision Impedance Analyzer",
      "min_frequency_value": 20,
      "max_frequency_value": 15000000,
      "frequency_unit": "Hz",
      "measurement_functions": ["L", "C", "R", "Z", "Q", "D"],
      "dc_bias_support": null,
      "summary_zh": "...",
      "summary_en": "...",
      "raw_specs_json": {
        "frequency_range_text": "...",
        "notable_specs": ["..."]
      }
    }
  ]
}`
    ].join("\n");
  }

  return [
    "You are a Wayne Kerr catalog import assistant.",
    "Extract catalog_products-ready product records from the provided PDF text.",
    "Output JSON only, no Markdown and no extra explanation.",
    "If the PDF contains multiple distinct models, fixtures, accessories, or option codes, products must contain multiple items, one model per item.",
    "Do not collapse multiple models into a single family-level summary row, even if they belong to one family.",
    "If a field is not explicit, use null or an empty array and do not invent values.",
    "summary_zh must be Traditional Chinese; summary_en must be English.",
    "Use short abbreviations for measurement_functions when possible, such as L, C, R, Z, Q, D, ESR.",
    "If DC bias support is not clearly stated, set dc_bias_support to null.",
    "For fixtures, accessories, test leads, or adapters, set category to Fixture or Accessory instead of treating them as instruments.",
    `source_pdf_url: ${pdfUrl}`,
    modelHintLine,
    `PDF text:\n${truncatedText}`,
    `Schema:
{
  "products": [
    {
      "model": "6500B",
      "product_name": "Wayne Kerr 6500B",
      "category": "Precision Impedance Analyzer",
      "min_frequency_value": 20,
      "max_frequency_value": 15000000,
      "frequency_unit": "Hz",
      "measurement_functions": ["L", "C", "R", "Z", "Q", "D"],
      "dc_bias_support": null,
      "summary_zh": "...",
      "summary_en": "...",
      "raw_specs_json": {
        "frequency_range_text": "...",
        "notable_specs": ["..."]
      }
    }
  ]
}`
  ].join("\n");
};

const buildDocumentImportPrompt = (
  locale: "zh" | "en",
  pdfUrl: string,
  pdfText: string,
  modelHints: string[],
  docType: string
) => {
  const filename = getPdfFilename(pdfUrl);
  const instruction =
    locale === "zh"
      ? [
          "你是 Wayne Kerr 文件匯入助理。",
          "這是一份操作手冊、治具文件、附件文件或 datasheet；請建立一筆 catalog_documents 的中繼資料。",
          "只輸出 JSON，不要 Markdown，不要額外說明。",
          "不要產生 catalog_products，也不要把文件內容當成單一產品規格。",
          "related_models 必須列出這份文件適用的 Wayne Kerr 型號或系列；只列文件明確涵蓋的型號。",
          "summary_zh 必須是繁體中文；summary_en 必須是英文。",
          "tags 請使用 4 至 10 個短英文技術關鍵字。",
          `文件類型預判：${docType}`,
          `檔名：${filename}`,
          modelHints.length ? `可能的型號：${modelHints.join(", ")}` : "",
          `PDF text:\n${pdfText.slice(0, 32000)}`,
          `Schema:\n{
  "title": "...",
  "doc_type": "${docType}",
  "language": "en",
  "related_models": ["3255B"],
  "summary_zh": "...",
  "summary_en": "...",
  "tags": ["setup", "calibration", "fixture"]
}`
        ]
      : [
          "You are a Wayne Kerr document import assistant.",
          "This is a manual, fixture document, accessory document, or datasheet. Create one catalog_documents metadata record.",
          "Output JSON only, with no Markdown or extra explanation.",
          "Do not create catalog_products and do not treat this document as a single product specification.",
          "related_models must list only Wayne Kerr models or series explicitly covered by this document.",
          "summary_zh must be Traditional Chinese; summary_en must be English.",
          "tags must contain 4 to 10 short English technical keywords.",
          `Detected document type: ${docType}`,
          `Filename: ${filename}`,
          modelHints.length ? `Possible models: ${modelHints.join(", ")}` : "",
          `PDF text:\n${pdfText.slice(0, 32000)}`,
          `Schema:\n{
  "title": "...",
  "doc_type": "${docType}",
  "language": "en",
  "related_models": ["3255B"],
  "summary_zh": "...",
  "summary_en": "...",
  "tags": ["setup", "calibration", "fixture"]
}`
        ];

  return instruction.filter(Boolean).join("\n");
};

const normalizeCatalogDocument = (
  value: unknown,
  pdfUrl: string,
  modelHints: string[],
  detectedDocType: string
): NormalizedCatalogDocument => {
  const record = value && typeof value === "object" ? (value as ParsedCatalogDocument) : {};
  const relatedModels = Array.isArray(record.related_models)
    ? record.related_models
        .filter((item): item is string => typeof item === "string")
        .flatMap(extractModelCodes)
    : [];

  return {
    title: record.title?.trim() || getPdfFilename(pdfUrl).replace(/\.pdf$/i, ""),
    doc_type: record.doc_type?.trim() || detectedDocType,
    language: record.language?.trim().toLowerCase() || "en",
    related_models: Array.from(new Set([...relatedModels, ...modelHints])).slice(0, 24),
    summary_zh: record.summary_zh?.trim() || null,
    summary_en: record.summary_en?.trim() || null,
    tags: Array.isArray(record.tags)
      ? Array.from(
          new Set(record.tags.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))
        ).slice(0, 12)
      : []
  };
};

const normalizeProducts = (value: unknown): NormalizedCatalogProduct[] => {
  if (!value || typeof value !== "object") return [];
  const products = Array.isArray((value as { products?: unknown }).products)
    ? ((value as { products?: unknown }).products as unknown[])
    : [];
  const normalized = products
    .filter((item): item is ParsedCatalogProduct => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.model === "string" && item.model.trim().length > 0)
    .map((item) => ({
      model: item.model?.trim()?.toUpperCase(),
      product_name: item.product_name?.trim() || item.model?.trim() || null,
      category: item.category?.trim() || null,
      min_frequency_value:
        typeof item.min_frequency_value === "number" ? item.min_frequency_value : null,
      max_frequency_value:
        typeof item.max_frequency_value === "number" ? item.max_frequency_value : null,
      frequency_unit: item.frequency_unit?.trim() || null,
      measurement_functions: Array.isArray(item.measurement_functions)
        ? item.measurement_functions.filter((entry): entry is string => typeof entry === "string")
        : [],
      dc_bias_support:
        typeof item.dc_bias_support === "boolean" ? item.dc_bias_support : null,
      summary_zh: item.summary_zh?.trim() || null,
      summary_en: item.summary_en?.trim() || null,
      raw_specs_json:
        item.raw_specs_json && typeof item.raw_specs_json === "object" ? item.raw_specs_json : {}
    }));

  const deduped = new Map<string, NormalizedCatalogProduct>();
  for (const product of normalized) {
    const key = product.model || "";
    if (!key) continue;
    deduped.set(key, product);
  }

  return Array.from(deduped.values());
};

const reconcileProductsWithHints = (
  products: NormalizedCatalogProduct[],
  modelHints: string[]
) => {
  if (products.length === 0 || modelHints.length === 0) {
    return products;
  }

  const matched = products.filter(
    (product) =>
      product.model &&
      modelHints.some((hint) => modelMatchesHint(product.model || "", hint))
  );

  if (matched.length > 0) {
    return matched;
  }

  if (products.length === 1 && modelHints.length === 1) {
    const forcedModel = modelHints[0];
    return [
      {
        ...products[0],
        model: forcedModel,
        product_name:
          products[0].product_name && !products[0].product_name.includes(products[0].model || "")
            ? products[0].product_name
            : `Wayne Kerr ${forcedModel}`
      }
    ];
  }

  return products;
};

const ensureDomMatrixPolyfill = async () => {
  if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix !== "undefined") {
    return;
  }

  const BaseDOMMatrix = (await import("@thednp/dommatrix")).default ?? (await import("@thednp/dommatrix"));

  class DOMMatrixPolyfill extends (BaseDOMMatrix as new (init?: unknown) => {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    multiply(other: unknown): {
      a: number;
      b: number;
      c: number;
      d: number;
      e: number;
      f: number;
    };
    multiplySelf(other: unknown): unknown;
    translate(x?: number, y?: number): unknown;
    scale(x?: number, y?: number): unknown;
  }) {
    preMultiplySelf(other: {
      multiply?: (value: unknown) => { a: number; b: number; c: number; d: number; e: number; f: number };
    }) {
      if (other && typeof other.multiply === "function") {
        const result = other.multiply(this);
        this.a = result.a;
        this.b = result.b;
        this.c = result.c;
        this.d = result.d;
        this.e = result.e;
        this.f = result.f;
      }
      return this;
    }

    invertSelf() {
      const det = this.a * this.d - this.b * this.c;
      if (!det) {
        this.a = NaN;
        this.b = NaN;
        this.c = NaN;
        this.d = NaN;
        this.e = NaN;
        this.f = NaN;
        return this;
      }

      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;
      const e = this.e;
      const f = this.f;

      this.a = d / det;
      this.b = -b / det;
      this.c = -c / det;
      this.d = a / det;
      this.e = (c * f - d * e) / det;
      this.f = (b * e - a * f) / det;
      return this;
    }
  }

  (globalThis as { DOMMatrix?: unknown }).DOMMatrix = DOMMatrixPolyfill;
};

const ensurePdfJsWorkerGlobal = async () => {
  const globalRecord = globalThis as {
    pdfjsWorker?: { WorkerMessageHandler?: unknown };
  };

  if (globalRecord.pdfjsWorker?.WorkerMessageHandler) {
    return;
  }

  const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  globalRecord.pdfjsWorker = {
    WorkerMessageHandler: workerModule.WorkerMessageHandler
  };
};

const extractPdfText = async (pdfBuffer: Buffer) => {
  await ensureDomMatrixPolyfill();
  await ensurePdfJsWorkerGlobal();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const documentInit = {
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  } as Parameters<typeof pdfjs.getDocument>[0];
  const loadingTask = pdfjs.getDocument(documentInit);

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      pages.push(pageText);
    }
  } finally {
    await pdf.destroy();
  }

  return pages.join("\n").trim();
};

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing DEEPSEEK_API_KEY." }, { status: 500 });
  }
  if (!postgresUrl) {
    return NextResponse.json(
      { error: "Missing POSTGRES_URL. Connect Neon/Supabase before importing catalogs." },
      { status: 500 }
    );
  }

  let body: CatalogImportRequest;
  try {
    body = (await request.json()) as CatalogImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const locale: "zh" | "en" = body.locale === "en" ? "en" : "zh";
  const pdfUrl = text.match(PDF_URL_REGEX)?.[1];

  if (!pdfUrl) {
    return NextResponse.json(
      {
        error:
          locale === "zh"
            ? "請貼上可存取的 PDF URL 才能匯入型錄。"
            : "Please provide an accessible PDF URL to import a catalog."
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const pdfResponse = await fetch(pdfUrl, { signal: controller.signal });
    if (!pdfResponse.ok) {
      return NextResponse.json(
        {
          error:
            locale === "zh"
              ? `下載 PDF 失敗（${pdfResponse.status}）。`
              : `Failed to download PDF (${pdfResponse.status}).`
        },
        { status: pdfResponse.status }
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const pdfText = await extractPdfText(pdfBuffer);
    const modelHints = Array.from(
      new Set([...extractModelHintsFromPdfUrl(pdfUrl), ...extractModelHintsFromPdfText(pdfText)])
    );

    if (!pdfText) {
      return NextResponse.json(
        {
          error:
            locale === "zh"
              ? "PDF 沒有可抽取的文字內容，暫時無法自動匯入。"
              : "The PDF does not contain extractable text, so automatic import is not available yet."
        },
        { status: 400 }
      );
    }

    if (isCatalogDocument(pdfUrl)) {
      const detectedDocType = getDocumentType(pdfUrl);
      const aiResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: buildDocumentImportPrompt(
                locale,
                pdfUrl,
                pdfText,
                modelHints,
                detectedDocType
              )
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0
        }),
        signal: controller.signal
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        return NextResponse.json(
          { error: errorText || `DeepSeek request failed (${aiResponse.status}).` },
          { status: aiResponse.status }
        );
      }

      const aiData = await aiResponse.json();
      const outputText = extractOutputText(aiData);
      const parsed = outputText ? extractFirstJson(outputText) : null;
      const documentRecord = normalizeCatalogDocument(parsed, pdfUrl, modelHints, detectedDocType);
      const sql = neon(postgresUrl);

      await sql`
        insert into catalog_documents (
          title,
          doc_type,
          language,
          related_models,
          source_pdf_url,
          content_text,
          summary_zh,
          summary_en,
          tags,
          updated_at
        ) values (
          ${documentRecord.title},
          ${documentRecord.doc_type},
          ${documentRecord.language},
          ${documentRecord.related_models},
          ${pdfUrl},
          ${pdfText},
          ${documentRecord.summary_zh},
          ${documentRecord.summary_en},
          ${documentRecord.tags},
          now()
        )
        on conflict (source_pdf_url) do update set
          title = excluded.title,
          doc_type = excluded.doc_type,
          language = excluded.language,
          related_models = excluded.related_models,
          content_text = excluded.content_text,
          summary_zh = excluded.summary_zh,
          summary_en = excluded.summary_en,
          tags = excluded.tags,
          updated_at = now()
      `;

      return NextResponse.json({
        text:
          locale === "zh"
            ? `已匯入 ${documentRecord.title} 到文件資料庫，類型為 ${documentRecord.doc_type}。它不會覆蓋任何產品規格，現在可以直接詢問 ${documentRecord.related_models.join("、") || "這份文件"} 的操作、適配治具與量測限制。`
            : `Imported ${documentRecord.title} into the document library as ${documentRecord.doc_type}. No product specifications were overwritten; you can now ask about operating procedures, compatible fixtures, and measurement limits.`
      });
    }

    const aiResponse = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: buildImportPrompt(locale, pdfUrl, pdfText, modelHints)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      }),
      signal: controller.signal
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { error: errorText || `DeepSeek request failed (${aiResponse.status}).` },
        { status: aiResponse.status }
      );
    }

    const aiData = await aiResponse.json();
    const outputText = extractOutputText(aiData);
    const parsed = outputText ? extractFirstJson(outputText) : null;
    let products = reconcileProductsWithHints(normalizeProducts(parsed), modelHints);

    if (modelHints.length > 1 && products.length < Math.min(modelHints.length, 3)) {
      const retryResponse = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content:
                buildImportPrompt(locale, pdfUrl, pdfText, modelHints) +
                "\nIMPORTANT: The PDF appears to contain multiple distinct model or fixture codes. You must output one products item per distinct code if that code corresponds to a separate item."
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0
        }),
        signal: controller.signal
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryText = extractOutputText(retryData);
        const retryParsed = retryText ? extractFirstJson(retryText) : null;
        const retryProducts = reconcileProductsWithHints(normalizeProducts(retryParsed), modelHints);
        if (retryProducts.length > products.length) {
          products = retryProducts;
        }
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        {
          error:
            locale === "zh"
              ? "模型沒有從 PDF 裡抽出可匯入的產品資料。"
              : "The model did not extract any importable product records from the PDF."
        },
        { status: 400 }
      );
    }

    const sql = neon(postgresUrl);

    for (const product of products) {
      await sql`
        insert into catalog_products (
          brand,
          model,
          product_name,
          category,
          min_frequency_value,
          max_frequency_value,
          frequency_unit,
          measurement_functions,
          dc_bias_support,
          summary_zh,
          summary_en,
          source_pdf_url,
          raw_specs_json,
          updated_at
        ) values (
          'Wayne Kerr',
          ${product.model || null},
          ${product.product_name || null},
          ${product.category},
          ${product.min_frequency_value},
          ${product.max_frequency_value},
          ${product.frequency_unit},
          ${product.measurement_functions || []},
          ${product.dc_bias_support},
          ${product.summary_zh},
          ${product.summary_en},
          ${pdfUrl},
          ${JSON.stringify(product.raw_specs_json || {})}::jsonb,
          now()
        )
        on conflict (model) do update set
          product_name = excluded.product_name,
          category = excluded.category,
          min_frequency_value = excluded.min_frequency_value,
          max_frequency_value = excluded.max_frequency_value,
          frequency_unit = excluded.frequency_unit,
          measurement_functions = excluded.measurement_functions,
          dc_bias_support = excluded.dc_bias_support,
          summary_zh = excluded.summary_zh,
          summary_en = excluded.summary_en,
          source_pdf_url = excluded.source_pdf_url,
          raw_specs_json = excluded.raw_specs_json,
          updated_at = now()
      `;
    }

    const importedModels = products.map((product) => product.model).filter(Boolean);
    return NextResponse.json({
      text:
        locale === "zh"
          ? `已匯入 ${products.length} 筆產品資料：${importedModels.join("、")}。現在可以直接在產品目錄問答裡詢問這些型號。`
          : `Imported ${products.length} catalog record(s): ${importedModels.join(", ")}. You can now ask about these models in Catalog Q&A.`
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? locale === "zh"
        ? "型錄匯入逾時。"
        : "Catalog import timed out."
      : error instanceof Error
        ? error.message
        : locale === "zh"
          ? "未知錯誤"
          : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
