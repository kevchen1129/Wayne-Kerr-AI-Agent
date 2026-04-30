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

const BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.20-beta-0309-reasoning";
const TIMEOUT_MS = 120000;
const OFFICIAL_SITE_BASE = "https://www.waynekerr.com";
const OFFICIAL_INSTRUMENTS_URL = `${OFFICIAL_SITE_BASE}/en-GB/products/instruments`;

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

const buildCatalogPrompt = (
  locale: "zh" | "en",
  question: string,
  records: CatalogRow[],
  history: Array<{ role: "user" | "assistant"; text: string }>
) => {
  const serializedRecords = JSON.stringify(records, null, 2);
  const recentHistory = history
    .slice(-4)
    .map((item) => `${item.role}: ${item.text}`)
    .join("\n");
  if (locale === "zh") {
    return [
      "你是 Wayne Kerr 產品目錄問答助理。",
      "你只能根據提供的 catalog_records 回答，不可以捏造不存在的規格。",
      "所有回覆都必須使用繁體中文；型號、單位、參數縮寫可以保留英文。",
      "如果資料表裡沒有明確寫出答案，請直接說目前已上傳的型錄資料沒有這個欄位。",
      "若能回答，優先直接回答問題，再用 2–4 點條列補充相關規格。",
      "不要附上來源、網址、檔名或 source_pdf_url。",
      "不要使用 Markdown 粗體、星號標記或 ** 符號。",
      recentHistory ? `最近對話：\n${recentHistory}` : "",
      `使用者問題：${question}`,
      `catalog_records:\n${serializedRecords}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "You are a Wayne Kerr catalog Q&A assistant.",
    "Answer strictly from the provided catalog_records and do not invent missing specs.",
    "All human-readable output must be in English only.",
    "If the answer is not explicitly present in the records, say that the uploaded catalog data does not currently contain that field.",
    "When possible, answer directly first, then add 2–4 short bullets with supporting specs.",
    "Do not include sources, URLs, filenames, or source_pdf_url in the answer.",
    "Do not use Markdown bold or ** markers.",
    recentHistory ? `Recent conversation:\n${recentHistory}` : "",
    `User question: ${question}`,
    `catalog_records:\n${serializedRecords}`
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
  const apiKey = process.env.XAI_API_KEY;
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
  try {
    const allRows = (await sql`
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

    rows =
      modelHints.length > 0
        ? allRows
            .filter((row) =>
              modelHints.some((hint) =>
                row.model.toUpperCase().includes(hint) ||
                (row.product_name || "").toUpperCase().includes(hint)
              )
            )
            .slice(0, 8)
        : allRows.slice(0, 8);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database query failed.";
    return NextResponse.json(
      {
        error:
          locale === "zh"
            ? `產品目錄資料庫查詢失敗：${message}`
            : `Catalog database query failed: ${message}`
      },
      { status: 500 }
    );
  }

  if (rows.length === 0) {
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
          ? "資料庫沒有命中，但已從 Wayne Kerr 官網找到相關頁面；目前未設定 XAI_API_KEY，因此無法整理成自然語言答案。"
          : "The database had no match, but relevant Wayne Kerr website pages were found. XAI_API_KEY is not configured, so I cannot summarize them into a natural-language answer yet.";
      return NextResponse.json({ text: fallback });
    }

    const websiteController = new AbortController();
    const websiteTimeout = setTimeout(() => websiteController.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}/responses`, {
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
              content: [
                {
                  type: "input_text",
                  text: buildOfficialFallbackPrompt(locale, text, officialSnippets, history)
                }
              ]
            },
            {
              role: "user",
              content: [{ type: "input_text", text }]
            }
          ],
          store: false,
          temperature: 0
        }),
        signal: websiteController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: errorText || `xAI request failed (${response.status}).` },
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

  if (!apiKey) {
    const fallback =
      locale === "zh"
        ? `已找到 ${rows.map((row) => row.model).join("、")} 的產品資料，但目前未設定 XAI_API_KEY，所以只能先確認資料已連上。`
        : `I found catalog records for ${rows.map((row) => row.model).join(", ")}, but XAI_API_KEY is not configured, so I can only confirm the data connection for now.`;
    return NextResponse.json({ text: fallback });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/responses`, {
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
            content: [{ type: "input_text", text: buildCatalogPrompt(locale, text, rows, history) }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text }]
          }
        ],
        store: false,
        temperature: 0
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || `xAI request failed (${response.status}).` },
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
