import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

type CatalogQaRequest = {
  text?: string;
  locale?: "zh" | "en";
  history?: Array<{ role: "user" | "assistant"; text: string }>;
};

type CatalogRow = {
  id: number;
  brand: string;
  model: string;
  product_name: string | null;
  category: string | null;
  min_frequency_value: string | number | null;
  max_frequency_value: string | number | null;
  frequency_unit: string | null;
  measurement_functions: string[] | null;
  dc_bias_support: boolean | null;
  summary_zh: string | null;
  summary_en: string | null;
  source_pdf_url: string | null;
  source_page: number | null;
  raw_specs_json: unknown;
};

type CatalogDocumentRow = {
  id: number;
  title: string;
  doc_type: string;
  language: string;
  related_models: string[] | null;
  source_pdf_url: string;
  content_text: string;
  summary_zh: string | null;
  summary_en: string | null;
  tags: string[] | null;
};

const BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";
const TIMEOUT_MS = 120000;
const OFFICIAL_SITE_BASE = "https://www.waynekerr.com";
const OFFICIAL_INSTRUMENTS_URL = `${OFFICIAL_SITE_BASE}/en-GB/products/instruments`;

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

const sanitizeCatalogAnswer = (text: string, locale: "zh" | "en") => {
  const sourcePattern =
    locale === "zh"
      ? /^\s*來源\s*[:：].*$/gim
      : /^\s*source\s*[:：].*$/gim;

  return text
    .replace(/\*\*/g, "")
    .replace(sourcePattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const decodeHtml = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (html: string) =>
  decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

type OfficialLink = {
  href: string;
  text: string;
};

type OfficialSnippet = {
  url: string;
  title: string;
  text: string;
};

type FrequencyCandidate = {
  valueHz: number;
  label: string;
};

const extractOfficialLinks = (html: string): OfficialLink[] => {
  const matches = Array.from(
    html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)
  );

  return matches
    .map((match) => ({
      href: match[1]?.trim() || "",
      text: stripHtml(match[2] || "")
    }))
    .filter((link) => link.href && link.text);
};

const buildOfficialCandidates = (modelHints: string[]) => {
  const candidates = new Set<string>();

  for (const hint of modelHints) {
    const normalized = hint.toUpperCase();
    const numericOnly = normalized.replace(/[^0-9]/g, "");
    candidates.add(normalized);
    if (numericOnly) {
      candidates.add(numericOnly);
    }
    if (numericOnly.length >= 4) {
      candidates.add(numericOnly.slice(0, 4));
    }
  }

  return Array.from(candidates).filter(Boolean);
};

const findMatchingOfficialUrls = (links: OfficialLink[], candidates: string[]) => {
  const urls = new Set<string>();

  for (const link of links) {
    const haystack = `${link.text} ${link.href}`.toUpperCase();
    if (!candidates.some((candidate) => haystack.includes(candidate))) {
      continue;
    }

    const absoluteUrl = link.href.startsWith("http")
      ? link.href
      : new URL(link.href, OFFICIAL_SITE_BASE).toString();

    if (!absoluteUrl.startsWith(OFFICIAL_SITE_BASE)) {
      continue;
    }

    urls.add(absoluteUrl);
  }

  return Array.from(urls).slice(0, 4);
};

const fetchOfficialFallbackSnippets = async (modelHints: string[]) => {
  if (modelHints.length === 0) {
    return [];
  }

  const listingResponse = await fetch(OFFICIAL_INSTRUMENTS_URL, {
    headers: { "User-Agent": "WK Insight Catalog QA" },
    cache: "no-store"
  });

  if (!listingResponse.ok) {
    return [];
  }

  const listingHtml = await listingResponse.text();
  const links = extractOfficialLinks(listingHtml);
  const candidates = buildOfficialCandidates(modelHints);
  const matchedUrls = findMatchingOfficialUrls(links, candidates);

  const snippets = await Promise.all(
    matchedUrls.map(async (url) => {
      try {
        const pageResponse = await fetch(url, {
          headers: { "User-Agent": "WK Insight Catalog QA" },
          cache: "no-store"
        });
        if (!pageResponse.ok) {
          return null;
        }

        const html = await pageResponse.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = stripHtml(titleMatch?.[1] || url);
        const text = stripHtml(html).slice(0, 5000);
        if (!text) {
          return null;
        }

        return { url, title, text } satisfies OfficialSnippet;
      } catch {
        return null;
      }
    })
  );

  return snippets.filter((item): item is OfficialSnippet => Boolean(item));
};

const extractModelCandidates = (text: string) => {
  const matches = text.toUpperCase().match(/[A-Z]{0,3}\d{3,5}[A-Z]{0,3}/g) ?? [];
  const normalized = matches
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
  return Array.from(new Set(normalized)).slice(0, 8);
};

const getCatalogRowMatchScore = (row: CatalogRow, modelHints: string[]) => {
  if (modelHints.length === 0) {
    return 0;
  }

  const textFields = [
    row.model,
    row.product_name || "",
    row.category || "",
    row.summary_zh || "",
    row.summary_en || "",
    JSON.stringify(row.raw_specs_json || {})
  ].map((value) => value.toUpperCase());

  let bestScore = -1;

  for (const hint of modelHints) {
    const normalizedHint = hint.toUpperCase();
    const model = row.model.toUpperCase();
    const productName = (row.product_name || "").toUpperCase();

    if (model === normalizedHint) {
      bestScore = Math.max(bestScore, 100);
      continue;
    }

    if (productName === normalizedHint || productName.endsWith(` ${normalizedHint}`)) {
      bestScore = Math.max(bestScore, 95);
      continue;
    }

    if (model.startsWith(normalizedHint) || productName.includes(normalizedHint)) {
      bestScore = Math.max(bestScore, 80);
      continue;
    }

    if (textFields.some((field) => field.includes(normalizedHint))) {
      bestScore = Math.max(bestScore, 50);
    }
  }

  return bestScore;
};

const matchesCatalogRow = (row: CatalogRow, modelHints: string[]) => {
  return modelHints.length === 0 || getCatalogRowMatchScore(row, modelHints) >= 0;
};

const getCatalogDocumentMatchScore = (document: CatalogDocumentRow, modelHints: string[]) => {
  if (modelHints.length === 0) return 0;

  const relatedModels = (document.related_models || []).map((model) => model.toUpperCase());
  const searchable = [
    document.title,
    document.doc_type,
    document.summary_zh || "",
    document.summary_en || "",
    ...(document.tags || [])
  ]
    .join(" ")
    .toUpperCase();

  let bestScore = -1;
  for (const hint of modelHints) {
    const normalizedHint = hint.toUpperCase();
    if (relatedModels.includes(normalizedHint)) {
      bestScore = Math.max(bestScore, 100);
    } else if (relatedModels.some((model) => model.startsWith(normalizedHint) || normalizedHint.startsWith(model))) {
      bestScore = Math.max(bestScore, 85);
    } else if (searchable.includes(normalizedHint)) {
      bestScore = Math.max(bestScore, 50);
    }
  }
  return bestScore;
};

const isMaxFrequencyQuestion = (text: string) =>
  /(最高頻率|最大頻率|頻率上限|max(?:imum)? frequency|highest frequency|frequency limit)/i.test(
    text
  );

const extractFrequencyCandidatesFromText = (text: string) => {
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(Hz|kHz|MHz|GHz)\b/gi));

  return matches
    .map((match) => {
      const rawValue = Number(match[1]);
      const unit = match[2];
      if (!Number.isFinite(rawValue)) return null;

      const normalizedUnit = unit.toUpperCase();
      const multiplier =
        normalizedUnit === "GHZ"
          ? 1_000_000_000
          : normalizedUnit === "MHZ"
            ? 1_000_000
            : normalizedUnit === "KHZ"
              ? 1_000
              : 1;

      return {
        valueHz: rawValue * multiplier,
        label: `${match[1]} ${unit}`
      } satisfies FrequencyCandidate;
    })
    .filter((item): item is FrequencyCandidate => Boolean(item));
};

const formatFrequencyFromHz = (valueHz: number) => {
  if (valueHz >= 1_000_000_000) {
    return `${Number((valueHz / 1_000_000_000).toFixed(3)).toString()} GHz`;
  }
  if (valueHz >= 1_000_000) {
    return `${Number((valueHz / 1_000_000).toFixed(3)).toString()} MHz`;
  }
  if (valueHz >= 1_000) {
    return `${Number((valueHz / 1_000).toFixed(3)).toString()} kHz`;
  }
  return `${Number(valueHz.toFixed(3)).toString()} Hz`;
};

const getStructuredMaxFrequency = (row: CatalogRow) => {
  const rawValue =
    typeof row.max_frequency_value === "number"
      ? row.max_frequency_value
      : typeof row.max_frequency_value === "string"
        ? Number(row.max_frequency_value)
        : NaN;

  if (!Number.isFinite(rawValue)) {
    return null;
  }

  const unit = (row.frequency_unit || "Hz").toUpperCase();
  const multiplier =
    unit === "GHZ" ? 1_000_000_000 : unit === "MHZ" ? 1_000_000 : unit === "KHZ" ? 1_000 : 1;

  const valueHz = rawValue * multiplier;
  return {
    valueHz,
    label: `${rawValue} ${row.frequency_unit || "Hz"}`
  } satisfies FrequencyCandidate;
};

const getRowMaxFrequency = (row: CatalogRow) => {
  const structured = getStructuredMaxFrequency(row);
  if (structured) {
    return structured;
  }

  const combinedText = [
    row.summary_zh || "",
    row.summary_en || "",
    JSON.stringify(row.raw_specs_json || {})
  ].join(" ");

  const candidates = extractFrequencyCandidatesFromText(combinedText);
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => (current.valueHz > best.valueHz ? current : best));
};

const getPrimaryMatchedRow = (rows: CatalogRow[], modelHints: string[]) => {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort(
    (a, b) => getCatalogRowMatchScore(b, modelHints) - getCatalogRowMatchScore(a, modelHints)
  )[0];
};

const getSeriesRowsForPrimary = (
  primaryRow: CatalogRow,
  allRows: CatalogRow[],
  seriesHint?: string
) => {
  if (!primaryRow.source_pdf_url) {
    return [primaryRow];
  }

  const primaryModel = primaryRow.model.toUpperCase();
  const normalizedHint = (seriesHint || primaryModel).toUpperCase();
  const numericHint = normalizedHint.replace(/[^0-9]/g, "");
  const prefix = (numericHint || primaryModel.replace(/[^0-9]/g, "")).slice(0, 2);
  const hintSuffix = normalizedHint.match(/[A-Z]+$/)?.[0] || "";
  const primarySuffix = primaryModel.match(/[A-Z]+$/)?.[0] || "";
  const suffix = hintSuffix || primarySuffix;

  const siblings = allRows.filter((row) => {
    if (row.source_pdf_url !== primaryRow.source_pdf_url) {
      return false;
    }

    const model = row.model.toUpperCase();
    const modelDigits = model.replace(/[^0-9]/g, "");
    const modelSuffix = model.match(/[A-Z]+$/)?.[0] || "";

    if (prefix && !modelDigits.startsWith(prefix)) {
      return false;
    }

    if (suffix && modelSuffix && modelSuffix !== suffix) {
      return false;
    }

    return true;
  });

  return siblings.length > 1 ? siblings : [primaryRow];
};

const formatSeriesFrequencyAnswer = (
  locale: "zh" | "en",
  seriesLabel: string,
  seriesRows: CatalogRow[]
) => {
  const rowCandidates = seriesRows
    .map((row) => ({
      row,
      frequency: getRowMaxFrequency(row)
    }))
    .filter(
      (item): item is { row: CatalogRow; frequency: FrequencyCandidate } => Boolean(item.frequency)
    );

  if (rowCandidates.length === 0) {
    return null;
  }

  const highest = rowCandidates.reduce((best, current) =>
    current.frequency.valueHz > best.frequency.valueHz ? current : best
  );

  const variants = rowCandidates
    .sort((a, b) => a.frequency.valueHz - b.frequency.valueHz)
    .map((item) => `${item.row.model} ${formatFrequencyFromHz(item.frequency.valueHz)}`);

  if (locale === "zh") {
    return `${seriesLabel} 是一個系列，旗下包含 ${variants.join("、")}。目前最高到 ${highest.row.model} 的 ${formatFrequencyFromHz(highest.frequency.valueHz)}。`;
  }

  return `${seriesLabel} is a series that includes ${variants.join(", ")}. The highest variant currently identified is ${highest.row.model} at ${formatFrequencyFromHz(highest.frequency.valueHz)}.`;
};

const buildCatalogPrompt = (
  locale: "zh" | "en",
  question: string,
  records: CatalogRow[],
  documents: CatalogDocumentRow[],
  history: Array<{ role: "user" | "assistant"; text: string }>
) => {
  const serializedRecords = JSON.stringify(records, null, 2);
  const serializedDocuments = JSON.stringify(
    documents.map((document) => ({
      ...document,
      content_text: document.content_text.slice(0, 14000)
    })),
    null,
    2
  );
  const recentHistory = history
    .slice(-4)
    .map((item) => `${item.role}: ${item.text}`)
    .join("\n");
  if (locale === "zh") {
    return [
      "你是 Wayne Kerr 產品目錄問答助理。",
      "你只能根據提供的 catalog_records 與 catalog_documents 回答，不可以捏造不存在的規格。",
      "catalog_records 是產品規格；catalog_documents 是操作手冊、治具與附件文件，可用來回答設定、相容性、應用與量測限制。",
      "所有回覆都必須使用繁體中文；型號、單位、參數縮寫可以保留英文。",
      "如果資料表裡沒有明確寫出答案，請直接說目前已上傳的型錄資料沒有這個欄位。",
      "若能回答，優先直接回答問題，再用 2–4 點條列補充相關規格。",
      "不要附上來源、網址、檔名或 source_pdf_url。",
      "不要使用 Markdown 粗體、星號標記或 ** 符號。",
      recentHistory ? `最近對話：\n${recentHistory}` : "",
      `使用者問題：${question}`,
      `catalog_records:\n${serializedRecords}`,
      `catalog_documents:\n${serializedDocuments}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "You are a Wayne Kerr catalog Q&A assistant.",
    "Answer strictly from the provided catalog_records and catalog_documents and do not invent missing specs.",
    "catalog_records contain product specifications. catalog_documents contain manuals, fixture documents, and accessory documents for setup, compatibility, applications, and measurement limits.",
    "All human-readable output must be in English only.",
    "If the answer is not explicitly present in the records, say that the uploaded catalog data does not currently contain that field.",
    "When possible, answer directly first, then add 2–4 short bullets with supporting specs.",
    "Do not include sources, URLs, filenames, or source_pdf_url in the answer.",
    "Do not use Markdown bold or ** markers.",
    recentHistory ? `Recent conversation:\n${recentHistory}` : "",
    `User question: ${question}`,
    `catalog_records:\n${serializedRecords}`,
    `catalog_documents:\n${serializedDocuments}`
  ]
    .filter(Boolean)
    .join("\n");
};

const buildOfficialFallbackPrompt = (
  locale: "zh" | "en",
  question: string,
  snippets: OfficialSnippet[],
  history: Array<{ role: "user" | "assistant"; text: string }>
) => {
  const serializedSnippets = JSON.stringify(snippets, null, 2);
  const recentHistory = history
    .slice(-4)
    .map((item) => `${item.role}: ${item.text}`)
    .join("\n");

  if (locale === "zh") {
    return [
      "你是 Wayne Kerr 官網產品問答助理。",
      "資料庫沒有命中時，你可以根據提供的 Wayne Kerr 官網頁面片段回答。",
      "你只能根據 official_site_snippets 回答，不可以捏造不存在的規格。",
      "所有回覆都必須使用繁體中文；型號、單位、參數縮寫可以保留英文。",
      "如果片段裡沒有明確答案，請直接說 Wayne Kerr 官網目前抓到的內容沒有明確寫出這個欄位。",
      "直接回答問題即可，必要時補 2–4 點條列。",
      "不要附上來源、網址、檔名或任何 Markdown 粗體符號。",
      recentHistory ? `最近對話：\n${recentHistory}` : "",
      `使用者問題：${question}`,
      `official_site_snippets:\n${serializedSnippets}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "You are a Wayne Kerr website product Q&A assistant.",
    "When the database has no matching records, answer from the provided Wayne Kerr official website snippets.",
    "Answer strictly from official_site_snippets and do not invent missing specs.",
    "All human-readable output must be in English only.",
    "If the snippets do not explicitly contain the answer, say the Wayne Kerr website content retrieved so far does not clearly state that field.",
    "Answer directly, then add 2–4 short bullets only if helpful.",
    "Do not include sources, URLs, filenames, or Markdown bold markers.",
    recentHistory ? `Recent conversation:\n${recentHistory}` : "",
    `User question: ${question}`,
    `official_site_snippets:\n${serializedSnippets}`
  ]
    .filter(Boolean)
    .join("\n");
};

const formatNoDataMessage = (locale: "zh" | "en", modelHints: string[]) => {
  if (locale === "zh") {
    return modelHints.length > 0
      ? `目前雲端型錄資料庫裡還找不到 ${modelHints.join("、")} 的產品資料。請先把這些型號匯入 catalog_products，或換一個已建立的型號再試。`
      : "目前雲端型錄資料庫裡還沒有可回答的產品資料。請先把 Wayne Kerr 型號匯入 catalog_products 後再試。";
  }
  return modelHints.length > 0
    ? `I couldn't find product records for ${modelHints.join(", ")} in the cloud catalog yet. Please import those models into catalog_products first, or ask about a model that already exists.`
    : "The cloud catalog does not contain usable product records yet. Please import Wayne Kerr models into catalog_products first.";
};

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

  if (!postgresUrl) {
    return NextResponse.json(
      {
        error:
          "Missing POSTGRES_URL. Connect Neon/Supabase to this Vercel project before using Catalog Q&A."
      },
      { status: 500 }
    );
  }

  let body: CatalogQaRequest;
  try {
    body = (await request.json()) as CatalogQaRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Empty input." }, { status: 400 });
  }

  const locale: "zh" | "en" = body.locale === "en" ? "en" : "zh";
  const history = Array.isArray(body.history) ? body.history : [];
  const contextText = [...history.slice(-4).map((item) => item.text), text].join(" ");
  const modelHints = extractModelCandidates(contextText);

  const sql = neon(postgresUrl);

  let rows: CatalogRow[] = [];
  let allRows: CatalogRow[] = [];
  let allDocuments: CatalogDocumentRow[] = [];
  let documents: CatalogDocumentRow[] = [];
  try {
    allRows = (await sql`
      select
        id,
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
        source_page,
        raw_specs_json
      from catalog_products
      order by model asc
      limit 50
    `) as CatalogRow[];

    allDocuments = (await sql`
      select
        id,
        title,
        doc_type,
        language,
        related_models,
        source_pdf_url,
        content_text,
        summary_zh,
        summary_en,
        tags
      from catalog_documents
      order by updated_at desc
      limit 30
    `) as CatalogDocumentRow[];

    rows =
      modelHints.length > 0
        ? allRows
            .filter((row) => matchesCatalogRow(row, modelHints))
            .sort(
              (a, b) =>
                getCatalogRowMatchScore(b, modelHints) - getCatalogRowMatchScore(a, modelHints)
            )
            .slice(0, 8)
        : allRows.slice(0, 8);

    documents =
      modelHints.length > 0
        ? allDocuments
            .filter((document) => getCatalogDocumentMatchScore(document, modelHints) >= 0)
            .sort(
              (a, b) =>
                getCatalogDocumentMatchScore(b, modelHints) -
                getCatalogDocumentMatchScore(a, modelHints)
            )
            .slice(0, 4)
        : allDocuments.slice(0, 4);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database query failed.";
    const missingDocumentTable = /catalog_documents.*does not exist/i.test(message);
    return NextResponse.json(
      {
        error:
          locale === "zh"
            ? missingDocumentTable
              ? "找不到 catalog_documents 資料表。請先在 Neon SQL Editor 執行建立文件資料表的 SQL。"
              : `產品目錄資料庫查詢失敗：${message}`
            : `Catalog database query failed: ${message}`
      },
      { status: 500 }
    );
  }

  if (rows.length === 0 && documents.length === 0) {
    let officialSnippets: OfficialSnippet[] = [];

    try {
      officialSnippets = await fetchOfficialFallbackSnippets(modelHints);
    } catch {
      officialSnippets = [];
    }

    if (officialSnippets.length === 0) {
      return NextResponse.json({ text: formatNoDataMessage(locale, modelHints) });
    }

    if (!apiKey) {
      const fallback =
        locale === "zh"
          ? "資料庫沒有命中，但已從 Wayne Kerr 官網找到相關頁面；目前未設定 DEEPSEEK_API_KEY，因此無法整理成自然語言答案。"
          : "The database had no match, but relevant Wayne Kerr website pages were found. DEEPSEEK_API_KEY is not configured, so I cannot summarize them into a natural-language answer yet.";
      return NextResponse.json({ text: fallback });
    }

    const websiteController = new AbortController();
    const websiteTimeout = setTimeout(() => websiteController.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
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
              content: buildOfficialFallbackPrompt(locale, text, officialSnippets, history)
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0
        }),
        signal: websiteController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: errorText || `DeepSeek request failed (${response.status}).` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const outputText = extractOutputText(data);
      return NextResponse.json({
        text: outputText
          ? sanitizeCatalogAnswer(outputText, locale)
          : formatNoDataMessage(locale, modelHints)
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "未知錯誤"
            : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    } finally {
      clearTimeout(websiteTimeout);
    }
  }

  if (isMaxFrequencyQuestion(text)) {
    const primaryRow = getPrimaryMatchedRow(rows, modelHints);
    if (primaryRow && modelHints.length > 0) {
      const seriesRows = getSeriesRowsForPrimary(primaryRow, allRows, modelHints[0]);
      if (seriesRows.length > 1) {
        const seriesAnswer = formatSeriesFrequencyAnswer(locale, modelHints[0], seriesRows);
        if (seriesAnswer) {
          return NextResponse.json({ text: seriesAnswer });
        }
      }
    }

    const bestMatchScore = rows.reduce(
      (best, row) => Math.max(best, getCatalogRowMatchScore(row, modelHints)),
      -1
    );
    const scopedRows =
      bestMatchScore >= 0
        ? rows.filter((row) => getCatalogRowMatchScore(row, modelHints) === bestMatchScore)
        : rows;

    const rowCandidates = scopedRows
      .map((row) => ({
        row,
        frequency: getRowMaxFrequency(row)
      }))
      .filter(
        (item): item is { row: CatalogRow; frequency: FrequencyCandidate } => Boolean(item.frequency)
      );

    if (rowCandidates.length > 0) {
      const best = rowCandidates.reduce((currentBest, item) =>
        item.frequency.valueHz > currentBest.frequency.valueHz ? item : currentBest
      );

      const primaryLabel =
        modelHints[0] ||
        best.row.model ||
        scopedRows.map((row) => row.model).join("、");
      const answer =
        locale === "zh"
          ? `${primaryLabel} 目前可確認的最高頻率是 ${formatFrequencyFromHz(
              best.frequency.valueHz
            )}。`
          : `The highest confirmed frequency for ${primaryLabel} is ${formatFrequencyFromHz(
              best.frequency.valueHz
            )}.`;

      return NextResponse.json({ text: answer });
    }
  }

  if (!apiKey) {
    const fallback =
      locale === "zh"
        ? `已找到 ${rows.map((row) => row.model).join("、")} 的產品資料，但目前未設定 DEEPSEEK_API_KEY，所以只能先確認資料已連上。`
        : `I found catalog records for ${rows.map((row) => row.model).join(", ")}, but DEEPSEEK_API_KEY is not configured, so I can only confirm the data connection for now.`;
    return NextResponse.json({ text: fallback });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
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
              content: buildCatalogPrompt(locale, text, rows, documents, history)
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || `DeepSeek request failed (${response.status}).` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const outputText = extractOutputText(data);
    if (!outputText) {
      return NextResponse.json({
        text:
          locale === "zh"
            ? "已找到產品資料，但模型沒有回傳內容，請再試一次。"
            : "Catalog data was found, but the model returned an empty response. Please try again."
      });
    }

    return NextResponse.json({ text: sanitizeCatalogAnswer(outputText, locale) });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? locale === "zh"
        ? "產品目錄問答逾時。"
        : "Catalog Q&A request timed out."
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
