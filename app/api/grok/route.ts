import { NextResponse } from "next/server";
import type { AnalysisMode } from "@/lib/types";

type GrokRequest = {
  text?: string;
  images?: string[];
  mode?: AnalysisMode;
  locale?: "zh" | "en";
  textOnly?: boolean;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
};

const BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.20-beta-0309-reasoning";
const TIMEOUT_MS = 180000;

const SYSTEM_PROMPTS: Record<"zh" | "en", Record<AnalysisMode, string>> = {
  zh: {
    identify_dut:
      "你是精密量測智慧助理。請根據使用者文字與圖片，辨識元件類型並給出量測建議。請只輸出 JSON（不要 Markdown），格式見 schema。",
    interpret_graph:
      "Use step-by-step reasoning. Verify facts. Avoid hallucinations. Think deeply like Grok 4.20 multi-agent mode. 你是精密量測智慧助理。此類圖片通常為 LCR/阻抗儀的 Ls/Rs vs Frequency 掃頻截圖（不是電化學 Nyquist 圖）。請只在「電感/電容/電阻」元件模型中推測等效電路，禁止輸出 Randles/Warburg/Rct 等電化學模型。若圖表顯示 Ls/Rs 隨頻率變化，請優先使用電感等效模型（Series Ls–Rs + Cp 或 Rs + (Ls || Cp)）。請務必讀出座標軸頻率範圍與單位；忽略畫面上的 ExtMaxF/設定值；無法判讀的欄位請省略，不要填「未知」。請提供一段較長的詳細分析（analysisText），涵蓋：等效電路判斷、工作頻率/有效範圍、損耗/皮膚效應、以及量測/設置建議。請只輸出 JSON（不要 Markdown），格式見 schema。",
    dc_bias_saturation:
      "你是精密量測智慧助理。請根據 DC bias 曲線判讀飽和點與建議測試。請估計座標軸範圍與 20% 下降點，並填入 dcBiasMeta 以利標註到圖上。若無法辨識，請用合理估計並標註為推論。請只輸出 JSON（不要 Markdown），格式見 schema。"
  },
  en: {
    identify_dut:
      "You are a precision measurement assistant. Identify the component and suggest measurement setup. Output JSON only (no Markdown) using the schema.",
    interpret_graph:
      "Use step-by-step reasoning. Verify facts. Avoid hallucinations. Think deeply like Grok 4.20 multi-agent mode. You are a precision measurement assistant. These images are typically LCR/impedance meter screenshots of Ls/Rs vs Frequency (not electrochemical Nyquist plots). You must only choose R/L/C component models and must NOT output Randles/Warburg/Rct electrochemical circuits. If the plot shows Ls/Rs vs frequency, prefer inductor models (Series Ls–Rs + Cp or Rs + (Ls || Cp)). You must read the frequency axis range and unit; ignore ExtMaxF or instrument settings; if unreadable, omit the field (do not output \"Unknown\"). Provide a longer detailed analysis (analysisText) covering: equivalent circuit rationale, working frequency/valid range, loss/skin effect, and measurement/setup suggestions. Output JSON only (no Markdown) using the schema.",
    dc_bias_saturation:
      "You are a precision measurement assistant. Analyze DC bias curves for saturation points and next tests. Estimate axis ranges and the 20% drop point and fill dcBiasMeta for image annotation. If unreadable, provide a reasonable estimate and mark as inference. Output JSON only (no Markdown) using the schema."
  }
};

const SCHEMA_BY_MODE: Record<AnalysisMode, string> = {
  identify_dut: `{
  "type": "dut_result",
  "componentType": "Inductor|Capacitor|Resistor|Unknown",
  "confidence": 0.0,
  "packageGuess": {"zh": "...", "en": "..."},
  "estimatedWorkingRange": {
    "recommendedFrequencyBand": {"zh": "...", "en": "..."},
    "srFEstimate": {"zh": "...", "en": "..."},
    "notes": {"zh": "...", "en": "..."}
  },
  "recommendedSetup": {
    "mode": "Series|Parallel",
    "primaryParams": [{"zh": "...", "en": "..."}],
    "testFrequencySuggestions": [
      {"label": {"zh": "...", "en": "..."}, "value": {"zh": "...", "en": "..."}, "rationale": {"zh": "...", "en": "..."}}
    ],
    "testLevel": {"zh": "...", "en": "..."},
    "dcBias": {"zh": "...", "en": "..."},
    "fixture": {"zh": "...", "en": "..."},
    "compensation": [{"zh": "...", "en": "..."}]
  },
  "whatToConfirm": [{"zh": "...", "en": "..."}],
  "warnings": [{"zh": "...", "en": "..."}]
}`,
  interpret_graph: `{
  "type": "graph_result",
  "graphTypeGuess": "...",
  "title": {"zh": "...", "en": "..."},
  "confidence": 0.0,
  "resonanceFrequency": "...",
  "summaryCards": [
    {"label": {"zh": "等效電路", "en": "Equivalent circuit"}, "value": {"zh": "...", "en": "..."}, "tone": "info"},
    {"label": {"zh": "...", "en": "..."}, "value": {"zh": "...", "en": "..."}, "tone": "default|info|warning"}
  ],
  "summaryText": {"zh": "...", "en": "..."},
  "analysisText": {"zh": "...", "en": "..."},
  "detectedFeatures": [{"feature": "Resonance|Anti-resonance|Q-peak|ESR-min|Parasitic-dominant|Noise/aliasing|Inductance-drop", "frequency": "...", "notes": "..."}],
  "interpretation": ["..."],
  "recommendedNextTests": [{"action": "...", "why": "..."}],
  "recommendedMeasurementBand": "...",
  "suggestedEquivalentCircuit": "..."
}`,
  dc_bias_saturation: `{
  "type": "graph_result",
  "graphTypeGuess": "L vs DC Current (DC bias sweep)",
  "title": {"zh": "...", "en": "..."},
  "confidence": 0.0,
  "saturationCurrent": "...",
  "summaryCards": [
    {"label": {"zh": "...", "en": "..."}, "value": {"zh": "...", "en": "..."}, "tone": "default|info|warning"}
  ],
  "summaryText": {"zh": "...", "en": "..."},
  "detectedFeatures": [{"feature": "Inductance-drop", "frequency": "...", "notes": "..."}],
  "interpretation": ["..."],
  "recommendedNextTests": [{"action": "...", "why": "..."}],
  "recommendedMeasurementBand": "...",
  "dcBiasMeta": {
    "l0": {"value": 10.0, "unit": "µH"},
    "currentRange": {"min": 0, "max": 20, "unit": "A"},
    "axisRange": {
      "current": {"min": 0, "max": 20, "unit": "A"},
      "inductance": {"min": 6.5, "max": 10.5, "unit": "µH"}
    },
    "plotAreaPct": {"left": 0.1, "top": 0.12, "right": 0.98, "bottom": 0.8},
    "dropPoints": [{"percent": 20, "current": 7.5}],
    "curvePoints": [{"current": 0, "inductance": 10.0}, {"current": 7.5, "inductance": 8.0}],
    "testConditions": {"acLevel": "1 V", "sweep": "0–20 A", "frequency": "1 kHz"}
  }
}`
};

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

const isUnknownText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lowered = trimmed.toLowerCase();
  return (
    lowered === "unknown" ||
    lowered === "n/a" ||
    lowered === "na" ||
    trimmed === "未知" ||
    trimmed === "無" ||
    trimmed === "無法判讀"
  );
};

const cleanLocalized = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value === "string") {
    return isUnknownText(value) ? undefined : value;
  }
  if (typeof value === "object") {
    const record = value as { zh?: unknown; en?: unknown };
    const zh = typeof record.zh === "string" && !isUnknownText(record.zh) ? record.zh : undefined;
    const en = typeof record.en === "string" && !isUnknownText(record.en) ? record.en : undefined;
    if (!zh && !en) return undefined;
    return { ...(zh ? { zh } : {}), ...(en ? { en } : {}) };
  }
  return undefined;
};

const cleanText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  return isUnknownText(value) ? undefined : value;
};

const sanitizeGraphResult = (result: Record<string, unknown>) => {
  if (result.type !== "graph_result") return result;
  const next = { ...result };

  next.resonanceFrequency = cleanText(next.resonanceFrequency);
  next.recommendedMeasurementBand = cleanText(next.recommendedMeasurementBand);
  next.suggestedEquivalentCircuit = cleanText(next.suggestedEquivalentCircuit);
  next.summaryText = cleanLocalized(next.summaryText);
  next.analysisText = cleanLocalized(next.analysisText);

  if (Array.isArray(next.summaryCards)) {
    next.summaryCards = next.summaryCards
      .map((card) => {
        const label = cleanLocalized((card as { label?: unknown }).label);
        const value = cleanLocalized((card as { value?: unknown }).value);
        if (!label || !value) return null;
        return { ...card, label, value };
      })
      .filter(Boolean);
  }

  if (Array.isArray(next.interpretation)) {
    next.interpretation = next.interpretation
      .filter((item) => typeof item === "string" && !isUnknownText(item))
      .map((item) => String(item).replace(/^\s*\[?推論\]?\s*/i, ""));
  }

  return next;
};

const upsertEquivalentCircuitCard = (result: Record<string, unknown>) => {
  if (result.type !== "graph_result") return result;
  const suggested = typeof result.suggestedEquivalentCircuit === "string"
    ? result.suggestedEquivalentCircuit
    : "";
  if (!suggested) return result;

  const cards = Array.isArray(result.summaryCards)
    ? (result.summaryCards as Array<Record<string, unknown>>)
    : [];
  const hasEq = cards.some((card) => {
    const label = card.label;
    if (typeof label === "string") {
      return label.toLowerCase().includes("equivalent") || label.includes("等效");
    }
    if (label && typeof label === "object") {
      const zh = typeof (label as { zh?: unknown }).zh === "string" ? String((label as { zh?: unknown }).zh) : "";
      const en = typeof (label as { en?: unknown }).en === "string" ? String((label as { en?: unknown }).en) : "";
      return zh.includes("等效") || en.toLowerCase().includes("equivalent");
    }
    return false;
  });

  if (!hasEq) {
    cards.unshift({
      label: { zh: "等效電路", en: "Equivalent circuit" },
      value: { zh: suggested, en: suggested },
      tone: "info"
    });
  }

  return { ...result, summaryCards: cards };
};

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing XAI_API_KEY." }, { status: 500 });
  }

  let body: GrokRequest;
  try {
    body = (await request.json()) as GrokRequest;
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const images = Array.isArray(body.images)
    ? body.images.filter((item): item is string => typeof item === "string")
    : [];
  const mode: AnalysisMode = body.mode ?? "identify_dut";
  const locale: "zh" | "en" = body.locale === "en" ? "en" : "zh";
  const textOnly = Boolean(body.textOnly);
  const history = Array.isArray(body.history) ? body.history : [];

  const content: Array<Record<string, string>> = [];
  if (text) {
    content.push({ type: "input_text", text });
  }
  for (const imageUrl of images) {
    content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
  }

  if (content.length === 0) {
    return NextResponse.json({ error: "Empty input." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const historyMessages = history
      .filter((item) => item && typeof item.text === "string")
      .map((item) => ({
        role: item.role,
        content: [{ type: "input_text", text: item.text }]
      }));

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
            content: textOnly
              ? locale === "zh"
                ? "你是精密量測智慧助理。請用自然語言直接回答使用者問題，簡潔清楚即可。"
                : "You are a precision measurement assistant. Answer the user's question in natural language, concise and clear."
              : `${SYSTEM_PROMPTS[locale][mode]}\nSchema:\n${SCHEMA_BY_MODE[mode]}`
          },
          ...historyMessages,
          { role: "user", content }
        ],
        store: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("xAI error:", response.status, errorText);
      return NextResponse.json(
        { error: errorText || `xAI request failed (${response.status}).` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const outputText = extractOutputText(data);
    if (!textOnly) {
      const parsed = extractFirstJson(outputText);
    if (parsed && typeof parsed.type === "string") {
      const sanitized = sanitizeGraphResult(parsed);
      return NextResponse.json({ result: upsertEquivalentCircuitCard(sanitized) });
    }
    }
    return NextResponse.json({ text: outputText });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const message = isAbort
      ? "xAI request timed out."
      : error instanceof Error
        ? error.message
        : "Unknown error";
    console.error("xAI request failed:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
