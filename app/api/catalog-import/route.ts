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

const BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.20-beta-0309-reasoning";
const TIMEOUT_MS = 180000;
const PDF_URL_REGEX = /(https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?)/i;

const extractOutputText = (data: unknown) => {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content?: unknown }).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const partRecord = part as { type?: unknown; text?: unknown };
      if (partRecord.type === "output_text" && typeof partRecord.text === "string") {
        chunks.push(partRecord.text);
      }
    }
  }

  return chunks.join("\n").trim();
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

const buildImportPrompt = (locale: "zh" | "en", pdfUrl: string, pdfText: string) => {
  const truncatedText = pdfText.slice(0, 18000);
  if (locale === "zh") {
    return [
      "你是 Wayne Kerr 型錄匯入助理。",
      "請從提供的 PDF 文字中抽取可匯入 catalog_products 的產品資料。",
      "只輸出 JSON，不要 Markdown，不要額外說明。",
      "若 PDF 主要描述單一產品，products 陣列只放 1 筆。",
      "如果某欄沒有明確資訊，請填 null 或空陣列，不要捏造。",
      "summary_zh 必須是繁體中文；summary_en 必須是英文。",
      "measurement_functions 請盡量用短縮寫，例如 L, C, R, Z, Q, D, ESR。",
      "dc_bias_support 若文件沒明寫，填 null。",
      `source_pdf_url: ${pdfUrl}`,
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
    "If the PDF mainly describes one product, return a single item in products.",
    "If a field is not explicit, use null or an empty array and do not invent values.",
    "summary_zh must be Traditional Chinese; summary_en must be English.",
    "Use short abbreviations for measurement_functions when possible, such as L, C, R, Z, Q, D, ESR.",
    "If DC bias support is not clearly stated, set dc_bias_support to null.",
    `source_pdf_url: ${pdfUrl}`,
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

const normalizeProducts = (value: unknown) => {
  if (!value || typeof value !== "object") return [];
  const products = Array.isArray((value as { products?: unknown }).products)
    ? ((value as { products?: unknown }).products as unknown[])
    : [];
  return products
    .filter((item): item is ParsedCatalogProduct => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.model === "string" && item.model.trim().length > 0)
    .map((item) => ({
      model: item.model?.trim(),
      product_name: item.product_name?.trim() || item.model?.trim(),
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
};

const extractPdfText = async (pdfBuffer: Buffer) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });

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
  const apiKey = process.env.XAI_API_KEY;
  const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing XAI_API_KEY." }, { status: 500 });
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

    const aiResponse = await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: buildImportPrompt(locale, pdfUrl, pdfText) }]
          }
        ],
        store: false,
        temperature: 0
      }),
      signal: controller.signal
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { error: errorText || `xAI request failed (${aiResponse.status}).` },
        { status: aiResponse.status }
      );
    }

    const aiData = await aiResponse.json();
    const outputText = extractOutputText(aiData);
    const parsed = outputText ? extractFirstJson(outputText) : null;
    const products = normalizeProducts(parsed);

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
