"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatLayout } from "@/components/ChatLayout";
import { ChatThread } from "@/components/ChatThread";
import { ImageModal } from "@/components/ImageModal";
import type {
  AnalysisMode,
  ComposerDraft,
  DUTResult,
  GraphResult,
  LocalImage,
  Message,
  Thread,
  ToolOption
} from "@/lib/types";
import { truncate } from "@/lib/utils";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const MAX_IMAGE_DIM = 1600;
const JPEG_QUALITY = 0.85;
const CROP_MARGINS = { top: 0.18, right: 0.02, bottom: 0.16, left: 0.04 };

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const fileToCompressedJpeg = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_IMAGE_DIM / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height)
    );
    const rawWidth = image.naturalWidth || image.width;
    const rawHeight = image.naturalHeight || image.height;
    const width = Math.max(1, Math.round(rawWidth * scale));
    const height = Math.max(1, Math.round(rawHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");
    ctx.drawImage(image, 0, 0, width, height);

    const cropX = Math.round(width * CROP_MARGINS.left);
    const cropY = Math.round(height * CROP_MARGINS.top);
    const cropW = Math.max(1, Math.round(width * (1 - CROP_MARGINS.left - CROP_MARGINS.right)));
    const cropH = Math.max(1, Math.round(height * (1 - CROP_MARGINS.top - CROP_MARGINS.bottom)));
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) throw new Error("Canvas not supported.");
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return cropCanvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const TOOL_DEFS: Array<{
  id: AnalysisMode;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
}> = [
  {
    id: "identify_dut",
    title: { zh: "被斷元件測量建議", en: "DUT Measurement Setup" },
    description: {
      zh: "辨識 R/L/C，帶出建議量測模式、頻率、電平與工作範圍。",
      en: "Identify R/L/C and suggest measurement mode, frequency, level, and working range."
    }
  },
  {
    id: "interpret_graph",
    title: { zh: "等效電路", en: "Equivalent Circuit" },
    description: {
      zh: "掃頻響應推理電路模型，預設 3 元件；複雜共振可升級 4–5 元件。",
      en: "Use frequency sweep response to infer 3‑element default; suggest 4–5 for complex resonances."
    }
  },
  {
    id: "dc_bias_saturation",
    title: { zh: "DC Bias 飽和分析", en: "DC Bias Saturation" },
    description: {
      zh: "掃 DC Bias 曲線，計算 L 下跌 20% 的飽和點與電流值。",
      en: "Analyze DC bias sweep to find the 20% inductance drop point."
    }
  }
];

const UI_TEXT = {
  zh: {
    coreWorkflows: "三大功能",
    newChat: "新對話",
    recentChats: "最近對話",
    updated: "更新",
    prototypeNote: "已接 Grok API，影像會上傳到伺服器進行分析。",
    searchChats: "搜尋對話",
    noResults: "找不到相符的對話",
    activeThread: "目前對話",
    export: "匯出",
    clear: "清除",
    localeLabel: "中文",
    share: "分享",
    rename: "改名",
    delete: "刪除",
    save: "儲存",
    cancel: "取消",
    renamePlaceholder: "輸入新名稱",
    emptyEyebrow: "快速開始",
    emptyTitle: "開始新的量測分析",
    emptySubtitle: "先選一個功能，再拍照或上傳量測圖表。",
    analyzing: "分析中…",
    result: "結果",
    user: "使用者",
    assistant: "助理"
  },
  en: {
    coreWorkflows: "Core Workflows",
    newChat: "New chat",
    recentChats: "Recent chats",
    updated: "Updated",
    prototypeNote: "Grok API enabled. Images are uploaded to the server for analysis.",
    searchChats: "Search chats",
    noResults: "No chats found",
    activeThread: "Active thread",
    export: "Export",
    clear: "Clear",
    localeLabel: "EN",
    share: "Share",
    rename: "Rename",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    renamePlaceholder: "New name",
    emptyEyebrow: "Quick start",
    emptyTitle: "Start a new measurement analysis",
    emptySubtitle: "Pick a workflow first, then capture a photo or upload a graph.",
    analyzing: "Analyzing…",
    result: "Result",
    user: "User",
    assistant: "Assistant"
  }
};

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const tdkInductorImage =
  "https://product.tdk.com/system/files/styles/tech_note_detail_thumbnail/private/thumb_pov_inductors_tfm-2.png?itok=Jzw3PM6O";
const sweepGraphImage =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Boost_bode.png";
const dcBiasGraphImage = `${assetBasePath}/dc-bias-real.png`;

// --- Mock DUT result (TDK inductor example) ---
const mockDUTResult: DUTResult = {
  componentType: "Inductor",
  confidence: 0.83,
  packageGuess: {
    zh: "TDK SMD 電感（辨識到標記，推估 4.7–10 µH 等級）",
    en: "TDK SMD power inductor (marking detected, 4.7–10 µH class)"
  },
  estimatedWorkingRange: {
    recommendedFrequencyBand: {
      zh: "20 kHz – 300 kHz（日常），可延伸驗證至 1 MHz",
      en: "20 kHz – 300 kHz (daily), validate to 1 MHz"
    },
    srFEstimate: {
      zh: "約 15–40 MHz（依封裝推估）",
      en: "~15–40 MHz (estimate from package class)"
    },
    notes: {
      zh:
        "日常工作範圍：20–300 kHz、0.2–0.5 Vrms、環境 25°C。料號或標記可進一步精煉 SRF 與 DCR，建議以掃頻確認。",
      en:
        "Daily working range: 20–300 kHz, 0.2–0.5 Vrms, ambient 25°C. Part number/marking can refine SRF & DCR; confirm with a sweep."
    }
  },
  recommendedSetup: {
    mode: "Series",
    primaryParams: [
      { zh: "Ls-Rs", en: "Ls-Rs" },
      { zh: "Q", en: "Q" },
      { zh: "|Z|", en: "|Z|" }
    ],
    testFrequencySuggestions: [
      {
        label: { zh: "主測", en: "Primary" },
        value: { zh: "100 kHz", en: "100 kHz" },
        rationale: { zh: "典型電源轉換", en: "typical power conversion" }
      },
      {
        label: { zh: "掃頻", en: "Sweep" },
        value: { zh: "10 kHz – 2 MHz", en: "10 kHz – 2 MHz" },
        rationale: { zh: "捕捉 SRF 與 L(f)", en: "capture SRF and L(f)" }
      },
      {
        label: { zh: "DC bias", en: "DC bias" },
        value: { zh: "0 A → 額定電流", en: "0 A → rated current step" },
        rationale: { zh: "飽和檢查", en: "saturation check" }
      }
    ],
    testLevel: {
      zh: "0.2–0.5 Vrms（若升溫/飽和則降低）",
      en: "0.2–0.5 Vrms (reduce if heating/saturation observed)"
    },
    dcBias: {
      zh: "0 A 起掃，視規格拉至額定電流",
      en: "Start 0 A, sweep to rated current if applicable"
    },
    fixture: {
      zh: "四端子 / Kelvin 夾具或 SMD fixture",
      en: "4-terminal pair / Kelvin clip or SMD fixture"
    },
    compensation: [
      { zh: "OPEN", en: "OPEN" },
      { zh: "SHORT", en: "SHORT" },
      { zh: "LOAD（選用）", en: "LOAD (optional)" }
    ]
  },
  whatToConfirm: [
    {
      zh: "可辨識標記（如 4R7）或確切 TDK 料號，以確認 SRF 與 DCR？",
      en: "Photo marking (e.g. 4R7) or exact TDK part number to confirm SRF and DCR?"
    },
    { zh: "額定電流與最高工作溫度？", en: "Rated current and max operating temperature?" },
    { zh: "目標應用頻段？", en: "Target application frequency band?" }
  ],
  warnings: [
    { zh: "僅憑照片無法推估額定電流。", en: "Cannot infer rated current from photo alone." },
    { zh: "SRF 為視覺估計，請量測確認。", en: "SRF estimate is visual only; measure to confirm." }
  ]
};

// --- Mock Graph result (Equivalent circuit guidance) ---
const mockGraphResult: GraphResult = {
  graphTypeGuess: "Equivalent Circuit Recommendation (for modeling use)",
  title: {
    zh: "核心提取資訊（從掃頻圖）",
    en: "Core Extracted Info (from sweep)"
  },
  confidence: 0.84,
  resonanceFrequency: "~6.8 MHz",
  summaryCards: [
    {
      label: { zh: "等效電路", en: "Equivalent circuit" },
      value: { zh: "Series Ls–Rs + Cp", en: "Series Ls–Rs + Cp" },
      tone: "info"
    },
    {
      label: { zh: "標稱電感 L₀", en: "Nominal inductance L₀" },
      value: { zh: "≈993 nH", en: "≈993 nH" },
      tone: "default"
    },
    {
      label: { zh: "直流電阻 DCR", en: "DC resistance DCR" },
      value: { zh: "≈21 mΩ", en: "≈21 mΩ" },
      tone: "default"
    },
    {
      label: { zh: "寄生電容 Cp", en: "Parasitic capacitance Cp" },
      value: { zh: "≈450–500 pF", en: "≈450–500 pF" },
      tone: "default"
    },
    {
      label: { zh: "自諧振頻率 SRF", en: "Self‑resonant frequency SRF" },
      value: { zh: "≈6.8 MHz", en: "≈6.8 MHz" },
      tone: "warning"
    },
    {
      label: { zh: "品質因子 Q", en: "Quality factor Q" },
      value: { zh: "低頻 ≈300；1 MHz ≈17", en: "Low‑freq ≈300; 1 MHz ≈17" },
      tone: "info"
    },
    {
      label: { zh: "趨膚效應強度", en: "Skin effect intensity" },
      value: { zh: "Rs 上升 ≈15–20 倍", en: "Rs rises ≈15–20×" },
      tone: "warning"
    },
    {
      label: { zh: "推薦工作頻段", en: "Recommended band" },
      value: { zh: "<1.4 MHz (SRF/5)", en: "<1.4 MHz (SRF/5)" },
      tone: "info"
    }
  ],
  summaryText: {
    zh:
      "此元件適合中低頻電源 choke 或音頻濾波應用（高 Q 區效率佳），但 SRF 僅 6.8 MHz 且高頻 Rs 上升明顯，建議工作頻率控制在 1.4 MHz 以下以維持電感穩定；若需更高頻或更低損耗，可改用 Litz 線減少趨膚效應、降低匝數或加大間距來壓低寄生電容 Cp。下一步建議掃頻至 10 MHz 精確確認 SRF，並計算高頻發熱（I²Rs）評估是否需加散熱；模擬時可直接套用 SPICE 模型（L=993 nH, Rdc=21 mΩ, Cp=480 pF）。若應用需求超過此規格，考慮更換 Murata 或 TDK 等高 SRF 電感。",
    en:
      "Suitable for low‑to‑mid frequency power chokes or audio filtering where high‑Q is beneficial. SRF is only 6.8 MHz and Rs rises sharply at high frequency, so keep the operating band below 1.4 MHz for inductance stability. For higher‑frequency or lower loss, consider Litz wire to reduce skin effect, fewer turns, or larger spacing to lower Cp. Next, sweep to 10 MHz to confirm SRF and estimate high‑frequency I²Rs heating to decide on cooling. For simulation, use a SPICE model (L=993 nH, Rdc=21 mΩ, Cp=480 pF). If requirements exceed this, consider higher‑SRF inductors such as Murata or TDK."
  },
  detectedFeatures: [
    { feature: "Q-peak", frequency: "~4.2 MHz", notes: "usable band" },
    { feature: "Resonance", frequency: "~6.8 MHz", notes: "first resonance" },
    { feature: "Parasitic-dominant", frequency: "> ~10 MHz", notes: "parasitic rise" }
  ],
  interpretation: [],
  recommendedNextTests: [
    {
      action: "Confirm first resonance near ~6.8 MHz",
      why: "Resonance defines the upper bound for stable fitting."
    },
    {
      action: "If multi‑resonance appears, test 4–5 element models",
      why: "Extra parasitic terms improve fit accuracy."
    }
  ],
  recommendedMeasurementBand: "100 kHz – 5 MHz",
  suggestedEquivalentCircuit: "Series Ls–Rs + Cp (3‑element default)."
};

// --- Mock DC Bias Saturation result (Inductance drop) ---
const mockDcBiasResult: GraphResult = {
  graphTypeGuess: "L vs DC Current (DC bias sweep)",
  title: { zh: "DC Bias 飽和分析（工程版）", en: "DC Bias Saturation Analysis" },
  confidence: 0.9,
  saturationCurrent: "12.35 A (L = 0.8 × L₀)",
  summaryCards: [
    {
      label: { zh: "參考 L₀", en: "Reference L₀" },
      value: { zh: "低偏壓區段", en: "Low / zero bias region" },
      tone: "info"
    },
    {
      label: { zh: "I@−20% (L = 0.8×L₀)", en: "I@−20% (L = 0.8×L₀)" },
      value: { zh: "12.35 A", en: "12.35 A" },
      tone: "warning"
    }
  ],
  summaryText: {
    zh:
      "以低偏壓區段作為 L₀ 基準，計算 L 下降 20% 的 I_sat 作為飽和點。",
    en:
      "Use low‑bias inductance as L₀ and mark the 20% drop point as I_sat."
  },
  detectedFeatures: [
    { feature: "Inductance-drop", frequency: "I = 12.35 A", notes: "L 下降 20% 的飽和點" },
  ],
  interpretation: [],
  recommendedNextTests: [
    {
      action: "提高 DC bias 解析度至 0.05–0.1 A",
      why: "更精準定位飽和點與斜率變化。"
    },
    {
      action: "增加溫度條件（例如 25°C / 85°C）",
      why: "評估溫升對飽和點的影響。"
    }
  ],
  recommendedMeasurementBand: "0 A – 20 A (DC bias sweep)",
  sourceImageUrl: dcBiasGraphImage,
  dcBiasMeta: {
    l0: { value: 10.0, unit: "µH" },
    currentRange: { min: 0, max: 20, unit: "A" },
    axisRange: {
      current: { min: 0, max: 20, unit: "A" },
      inductance: { min: 6.5, max: 10.5, unit: "µH" }
    },
    plotAreaPct: { left: 0.105, top: 0.15, right: 0.979, bottom: 0.797 },
    dropPoints: [{ percent: 20, current: 12.35 }],
    curvePoints: [
      { current: 0.0, inductance: 10.0 },
      { current: 2.0, inductance: 10.0 },
      { current: 4.0, inductance: 9.98 },
      { current: 6.0, inductance: 9.95 },
      { current: 8.0, inductance: 9.8 },
      { current: 9.5, inductance: 9.5 },
      { current: 10.5, inductance: 9.2 },
      { current: 11.5, inductance: 8.7 },
      { current: 12.35, inductance: 8.0 },
      { current: 13.0, inductance: 7.7 },
      { current: 14.0, inductance: 7.2 },
      { current: 15.0, inductance: 6.9 },
      { current: 16.0, inductance: 6.7 },
      { current: 18.0, inductance: 6.55 },
      { current: 20.0, inductance: 6.5 }
    ],
    testConditions: {
      acLevel: "1 V",
      sweep: "0–20 A",
      frequency: "1 kHz"
    },
    kneePoint: { current: 10.8, inductance: 9.0 }
  }
};

const now = new Date().toISOString();
const draftThreadId = "thread-new";

const initialThreads: Thread[] = [
  { id: draftThreadId, title: "新對話", mode: "identify_dut", updatedAt: now, isDraft: true },
  { id: "thread-dut", title: "被斷元件測量建議", mode: "identify_dut", updatedAt: now },
  { id: "thread-eq", title: "等效電路", mode: "interpret_graph", updatedAt: now },
  { id: "thread-res", title: "DC Bias 飽和分析", mode: "dc_bias_saturation", updatedAt: now }
];

const initialMessages: Record<string, Message[]> = {
  [draftThreadId]: [],
  "thread-dut": [
    {
      id: "msg-dut-1",
      role: "user",
      type: "image",
      imageUrl: tdkInductorImage,
      caption: "TDK power inductor",
      mode: "identify_dut",
      createdAt: now
    },
    {
      id: "msg-dut-2",
      role: "assistant",
      type: "text",
      text: {
        zh: "辨識為 TDK 類型電感。可由照片或上方編號對照資料表，已帶出量測模式、頻率與日常 working range。",
        en: "Identified as a TDK inductor. Use the photo/marking to match the datasheet; recommended mode, frequency, and daily working range are included."
      },
      createdAt: now
    },
    {
      id: "msg-dut-3",
      role: "assistant",
      type: "dut_result",
      result: mockDUTResult,
      createdAt: now
    }
  ],
  "thread-eq": [
    {
      id: "msg-eq-1",
      role: "user",
      type: "image",
      imageUrl: sweepGraphImage,
      caption: "Sweep graph",
      mode: "interpret_graph",
      createdAt: now
    },
    {
      id: "msg-eq-2",
      role: "assistant",
      type: "text",
      text: {
        zh: "掃頻圖適合等效電路分析；預設 3 元件模型，若多共振可升級 4–5 元件。",
        en: "The sweep supports equivalent‑circuit modeling; default 3‑element model, upgrade to 4–5 for multi‑resonance."
      },
      createdAt: now
    },
    {
      id: "msg-eq-3",
      role: "assistant",
      type: "graph_result",
      result: mockGraphResult,
      createdAt: now
    }
  ],
  "thread-res": [
    {
      id: "msg-res-1",
      role: "user",
      type: "image",
      imageUrl: dcBiasGraphImage,
      caption: "DC bias sweep",
      mode: "dc_bias_saturation",
      createdAt: now
    },
    {
      id: "msg-res-2",
      role: "assistant",
      type: "text",
      text: {
        zh: "已分析 DC bias 曲線，計算 L 下跌 20% 的飽和點與電流值。",
        en: "DC bias curve analyzed; the 20% inductance drop point and current value are computed."
      },
      createdAt: now
    },
    {
      id: "msg-res-3",
      role: "assistant",
      type: "graph_result",
      result: mockDcBiasResult,
      createdAt: now
    }
  ]
};

export default function Home() {
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [threads, setThreads] = useState<Thread[]>(() => initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(draftThreadId);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>(
    () => initialMessages
  );
  const [draft, setDraft] = useState<ComposerDraft>({
    text: "",
    images: [],
    mode: "identify_dut"
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingByThread, setTypingByThread] = useState<Record<string, boolean>>({});
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [lastImageByThread, setLastImageByThread] = useState<Record<string, string>>({});

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const validation = useMemo(() => {
    const text = draft.text.trim();
    const hasText = text.length > 0;
    const hasImage = draft.images.length > 0;
    const mode = activeThread?.mode ?? draft.mode;

    if (!hasText && !hasImage) {
      return { ok: false, error: null };
    }

    return { ok: true, error: null };
  }, [draft, activeThread?.mode, locale]);

  const toolOptions: ToolOption[] = useMemo(
    () =>
      TOOL_DEFS.map((tool) => ({
        id: tool.id,
        title: tool.title[locale],
        description: tool.description[locale]
      })),
    [locale]
  );

  const activeMessages = useMemo(
    () => messagesByThread[activeThreadId] ?? [],
    [messagesByThread, activeThreadId]
  );
  const activeToolId = activeThread?.mode ?? "identify_dut";
  const activeTool =
    toolOptions.find((tool) => tool.id === activeToolId) ?? toolOptions[0];
  const labels = UI_TEXT[locale];
  const localeToggleLabel = locale === "zh" ? "EN" : "中文";
  const newChatTitle = locale === "zh" ? "新對話" : "New chat";
  const canSend = (draft.text.trim().length > 0 || draft.images.length > 0) && validation.ok;
  const brand = {
    name: "WK Insight",
    subtitle: locale === "zh" ? "精密量測智慧助理" : "Precision Measurement Intelligence",
    logoSrc: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/wk-logo.png`
  };

  useEffect(() => {
    if (!activeThread) return;
    setDraft((prev) =>
      prev.mode === activeThread.mode ? prev : { ...prev, mode: activeThread.mode }
    );
  }, [activeThread]);

  useEffect(() => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.isDraft ? { ...thread, title: newChatTitle } : thread
      )
    );
  }, [newChatTitle]);

  const updateThreadMeta = (threadId: string, textSample?: string) => {
    setThreads((prev) => {
      const updated = prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        const shouldRename =
          Boolean(textSample) &&
          (thread.title === "New chat" || thread.title === "新對話" || thread.isDraft);
        const title = shouldRename
          ? truncate(textSample!.replace(/\s+/g, " ").trim(), 32)
          : thread.title;
        return {
          ...thread,
          title,
          updatedAt: new Date().toISOString(),
          isDraft: false
        };
      });
      return [...updated].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    });
  };

  const createDraftThread = (mode: AnalysisMode = "identify_dut") => {
    const id = makeId();
    const nowStamp = new Date().toISOString();
    const newThread: Thread = {
      id,
      title: newChatTitle,
      mode,
      updatedAt: nowStamp,
      isDraft: true
    };
    setThreads((prev) => [newThread, ...prev]);
    setMessagesByThread((prev) => ({ ...prev, [id]: [] }));
    setActiveThreadId(id);
    setDraft((prev) => ({ ...prev, text: "", images: [], mode }));
    setSidebarOpen(false);
  };

  const createThread = (mode: AnalysisMode) => {
    const id = makeId();
    const tool = TOOL_DEFS.find((t) => t.id === mode);
    const nowStamp = new Date().toISOString();
    const newThread: Thread = {
      id,
      title: tool ? tool.title[locale] : newChatTitle,
      mode,
      updatedAt: nowStamp
    };
    setThreads((prev) => [newThread, ...prev]);
    setMessagesByThread((prev) => ({ ...prev, [id]: [] }));
    setActiveThreadId(id);
    setDraft((prev) => ({ ...prev, mode }));
    setSidebarOpen(false);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setSidebarOpen(false);
  };

  const handleDeleteThread = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    setMessagesByThread((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeThreadId === id) {
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining.length > 0) setActiveThreadId(remaining[0].id);
      else createDraftThread();
    }
  };

  const handleRenameThread = (id: string, title: string) => {
    setThreads((prev) => {
      const updated = prev.map((thread) =>
        thread.id === id ? { ...thread, title, updatedAt: new Date().toISOString() } : thread
      );
      return [...updated].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    });
  };

  const handleShareThread = async (id: string) => {
    const thread = threads.find((item) => item.id === id);
    const messages = messagesByThread[id] ?? [];
    try {
      await navigator.clipboard.writeText(JSON.stringify({ thread, messages }, null, 2));
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleNewChat = () => {
    const draftThread = threads.find((thread) => thread.isDraft);
    if (draftThread) {
      setActiveThreadId(draftThread.id);
      setDraft({ text: "", images: [], mode: draftThread.mode });
      setSidebarOpen(false);
      return;
    }
    createDraftThread();
  };

  const handleSelectTool = (mode: AnalysisMode) => {
    const draftThread = threads.find((thread) => thread.isDraft);
    if (!draftThread) {
      createDraftThread(mode);
      return;
    }
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === draftThread.id
          ? {
              ...thread,
              mode,
              title: newChatTitle
            }
          : thread
      )
    );
    setActiveThreadId(draftThread.id);
    setDraft({ text: "", images: [], mode });
    setSidebarOpen(false);
  };

  const handleImagesSelected = (files: FileList) => {
    const newImages: LocalImage[] = Array.from(files).map((file) => ({
      id: makeId(),
      url: URL.createObjectURL(file),
      file
    }));
    setDraft((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  const handleRemoveImage = (id: string) => {
    setDraft((prev) => {
      const target = prev.images.find((img) => img.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return { ...prev, images: prev.images.filter((img) => img.id !== id) };
    });
  };

  const handleSend = async () => {
    if (typingByThread[activeThreadId]) return;
    if (!validation.ok) return;
    const text = draft.text.trim();
    if (!text && draft.images.length === 0) return;

    const nowStamp = new Date().toISOString();
    const lastImageUrl = draft.images[draft.images.length - 1]?.url;
    const hasImage = draft.images.length > 0;
    const newUserMessages: Message[] = [];
    const mode: AnalysisMode = activeThread?.mode ?? draft.mode;

    if (text) {
      newUserMessages.push({
        id: makeId(),
        role: "user",
        type: "text",
        text,
        createdAt: nowStamp
      });
    }

    draft.images.forEach((img) => {
      newUserMessages.push({
        id: makeId(),
        role: "user",
        type: "image",
        imageUrl: img.url,
        caption: text || undefined,
        mode,
        createdAt: nowStamp
      });
    });

    setMessagesByThread((prev) => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] ?? []), ...newUserMessages]
    }));
    updateThreadMeta(activeThreadId, text || activeTool.title);
    setDraft((prev) => ({ ...prev, text: "", images: [] }));
    setTypingByThread((prev) => ({ ...prev, [activeThreadId]: true }));

    const threadId = activeThreadId;
    try {
      const history = (messagesByThread[threadId] ?? [])
        .filter((message) => message.type === "text")
        .slice(-6)
        .map((message) => ({
          role: message.role,
          text: typeof message.text === "string" ? message.text : message.text[locale] ?? ""
        }));

      const imagePayload = await Promise.all(
        draft.images.map(async (img) => {
          if (!img.file) return null;
          try {
            return await fileToCompressedJpeg(img.file);
          } catch (error) {
            console.warn("Image compress failed, fallback to raw data URL.", error);
            return await fileToDataUrl(img.file);
          }
        })
      );

      const fallbackImage = lastImageByThread[threadId];
      const imagesForApi =
        imagePayload.filter((item): item is string => Boolean(item)).length > 0
          ? imagePayload.filter((item): item is string => Boolean(item))
          : fallbackImage
            ? [fallbackImage]
            : [];

      if (imagePayload.length > 0 && imagesForApi.length > 0) {
        const latest = imagesForApi[imagesForApi.length - 1]!;
        setLastImageByThread((prev) => ({ ...prev, [threadId]: latest }));
      }

      const response = await fetch("/api/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          images: imagesForApi,
          mode,
          locale,
          textOnly: imagesForApi.length === 0,
          history
        })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `Request failed (${response.status}).`);
      }

      const payload = (await response.json()) as {
        text?: string;
        result?: Record<string, unknown>;
      };

      const nextMessages: Message[] = [];
      if (hasImage && payload.result && typeof payload.result === "object") {
        const resultType = String(payload.result.type || "");
        if (resultType === "dut_result") {
          nextMessages.push({
            id: makeId(),
            role: "assistant",
            type: "dut_result",
            result: payload.result as DUTResult,
            createdAt: new Date().toISOString()
          });
        } else if (resultType === "graph_result") {
          nextMessages.push({
            id: makeId(),
            role: "assistant",
            type: "graph_result",
            result: {
              ...(payload.result as GraphResult),
              sourceImageUrl: (payload.result as GraphResult).sourceImageUrl || lastImageUrl
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      if (nextMessages.length === 0) {
        const assistantText =
          payload.text?.trim() ||
          (locale === "zh" ? "沒有收到回覆內容。" : "No response text returned.");
        nextMessages.push({
          id: makeId(),
          role: "assistant",
          type: "text",
          text: assistantText,
          createdAt: new Date().toISOString()
        });
      }

      setMessagesByThread((prev) => {
        if (!prev[threadId]) return prev;
        return { ...prev, [threadId]: [...prev[threadId], ...nextMessages] };
      });
      updateThreadMeta(threadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorText =
        locale === "zh" ? `API 呼叫失敗：${message}` : `API request failed: ${message}`;
      const errorMsg: Message = {
        id: makeId(),
        role: "assistant",
        type: "text",
        text: errorText,
        createdAt: new Date().toISOString()
      };
      setMessagesByThread((prev) => {
        if (!prev[threadId]) return prev;
        return { ...prev, [threadId]: [...prev[threadId], errorMsg] };
      });
      updateThreadMeta(threadId);
    } finally {
      setTypingByThread((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  const handleInsertSummary = (summary: string) => {
    setDraft((prev) => ({
      ...prev,
      text: prev.text ? `${prev.text}\n${summary}` : summary
    }));
  };

  const handleInsertPrompt = (prompt: string) => {
    setDraft((prev) => ({
      ...prev,
      text: prev.text ? `${prev.text}\n${prompt}` : prompt
    }));
  };

  const handleExport = async () => {
    const payload = { thread: activeThread, messages: activeMessages };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleClear = () => {
    setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [] }));
  };

  return (
    <>
      <ChatLayout
        brand={brand}
        labels={{
          newChat: labels.newChat,
          recentChats: labels.recentChats,
          updated: labels.updated,
          prototypeNote: labels.prototypeNote,
          searchChats: labels.searchChats,
          noResults: labels.noResults,
          share: labels.share,
          rename: labels.rename,
          delete: labels.delete,
          save: labels.save,
          cancel: labels.cancel,
          renamePlaceholder: labels.renamePlaceholder
        }}
        threads={threads}
        messagesByThread={messagesByThread}
        activeThreadId={activeThreadId}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        onShareThread={handleShareThread}
      >
        <ChatThread
          title={activeThread?.title ?? "New chat"}
          activeWorkflow={activeTool.title}
          toolOptions={toolOptions}
          activeToolId={activeToolId}
          onSelectTool={handleSelectTool}
          labels={{
            analyzing: labels.analyzing,
            result: labels.result,
            user: labels.user,
            assistant: labels.assistant
          }}
          emptyState={{
            eyebrow: labels.emptyEyebrow,
            title: labels.emptyTitle,
            subtitle: labels.emptySubtitle
          }}
          locale={locale}
          localeLabel={localeToggleLabel}
          onToggleLocale={() => setLocale((prev) => (prev === "zh" ? "en" : "zh"))}
          headerLabels={{
            activeThread: labels.activeThread,
            export: labels.export,
            clear: labels.clear
          }}
          messages={activeMessages}
          isTyping={Boolean(typingByThread[activeThreadId])}
          onOpenSidebar={() => setSidebarOpen(true)}
          onExport={handleExport}
          onClear={handleClear}
          onInsertSummary={handleInsertSummary}
          onInsertPrompt={handleInsertPrompt}
          onImageClick={(src) => setActiveImage(src)}
          draft={draft}
          onTextChange={(value) => setDraft((prev) => ({ ...prev, text: value }))}
          onRemoveImage={handleRemoveImage}
          onImagesSelected={handleImagesSelected}
          onSend={handleSend}
          validationError={validation.error}
          canSend={canSend}
        />
        {activeImage && <ImageModal src={activeImage} onClose={() => setActiveImage(null)} />}
      </ChatLayout>
    </>
  );
}
