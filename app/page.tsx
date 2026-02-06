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
    prototypeNote: "目前為 UI 原型；之後可將 mock `sendMessage()` 替換成 Vision API 呼叫。",
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
    prototypeNote: "Prototype UI only. Replace the mock `sendMessage()` later with your Vision API call.",
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

const tdkInductorImage =
  "https://product.tdk.com/system/files/styles/tech_note_detail_thumbnail/private/thumb_pov_inductors_tfm-2.png?itok=Jzw3PM6O";
const sweepGraphImage =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Boost_bode.png";
const dcBiasGraphImage =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Harmonic_oscillator_gain.png";

// --- Mock DUT result (TDK inductor example) ---
const mockDUTResult: DUTResult = {
  componentType: "Inductor",
  confidence: 0.83,
  packageGuess: "TDK SMD power inductor (marking detected, 4.7–10 µH class)",
  estimatedWorkingRange: {
    recommendedFrequencyBand: "20 kHz – 300 kHz (daily), validate to 1 MHz",
    srFEstimate: "~15–40 MHz (estimate from package class)",
    notes:
      "Daily working range: 20–300 kHz, 0.2–0.5 Vrms, ambient 25°C. Part number/marking can refine SRF & DCR; confirm with a sweep."
  },
  recommendedSetup: {
    mode: "Series",
    primaryParams: ["Ls-Rs", "Q", "|Z|"],
    testFrequencySuggestions: [
      { label: "Primary", value: "100 kHz", rationale: "typical power conversion" },
      { label: "Sweep", value: "10 kHz – 2 MHz", rationale: "capture SRF and L(f)" },
      { label: "DC bias", value: "0 A → rated current step", rationale: "saturation check" }
    ],
    testLevel: "0.2–0.5 Vrms (reduce if heating/saturation observed)",
    dcBias: "Start 0 A, sweep to rated current if applicable",
    fixture: "4-terminal pair / Kelvin clip or SMD fixture",
    compensation: ["OPEN", "SHORT", "LOAD (optional)"]
  },
  whatToConfirm: [
    "Photo marking (e.g. 4R7) or exact TDK part number to confirm SRF and DCR?",
    "Rated current and max operating temperature?",
    "Target application frequency band?"
  ],
  warnings: [
    "Cannot infer rated current from photo alone.",
    "SRF estimate is visual only; measure to confirm."
  ]
};

// --- Mock Graph result (Equivalent circuit guidance) ---
const mockGraphResult: GraphResult = {
  graphTypeGuess: "Equivalent Circuit Recommendation (for modeling use)",
  title: {
    zh: "等效電路建議（工程版）",
    en: "Equivalent Circuit Recommendation (for modeling use)"
  },
  confidence: 0.84,
  resonanceFrequency: "~6.8 MHz",
  summaryCards: [
    {
      label: { zh: "建議模型", en: "Suggested model" },
      value: { zh: "Series Ls–Rs + Cp", en: "Series Ls–Rs + Cp" },
      tone: "info"
    },
    {
      label: { zh: "有效擬合頻段", en: "Valid modeling band" },
      value: { zh: "100 kHz – 5 MHz", en: "100 kHz – 5 MHz" },
      tone: "default"
    },
    {
      label: { zh: "第一共振點", en: "First resonance detected" },
      value: { zh: "~6.8 MHz", en: "~6.8 MHz" },
      tone: "default"
    },
    {
      label: { zh: "擬合規則", en: "Fitting rule" },
      value: { zh: "避免使用共振以上資料", en: "Avoid data above resonance" },
      tone: "warning"
    },
    {
      label: { zh: "適用範圍", en: "Suitable for" },
      value: {
        zh: "低 MHz 功率設計與紋波估算",
        en: "Low‑MHz power design & ripple estimation"
      },
      tone: "default"
    },
    {
      label: { zh: "高頻/多共振", en: "High‑frequency / multi‑resonance" },
      value: { zh: "建議改用高階模型", en: "Consider higher‑order model" },
      tone: "warning"
    }
  ],
  summaryText: {
    zh:
      "此頻率掃描適合做等效電路擬合。預設使用 3 元件 Series Ls–Rs + Cp，擬合頻段建議限制在 100 kHz – 5 MHz。共振以上的數據不利於穩定擬合；若出現多重共振或高頻寄生效應，建議升級 4–5 元件模型。",
    en:
      "Frequency sweep suggests a 3‑element Series Ls–Rs + Cp model. Fit within 100 kHz – 5 MHz and avoid data above the first resonance. For multi‑resonance or high‑frequency parasitics, consider a 4–5 element model."
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
  saturationCurrent: "1.85 A (L = 0.8 × L₀)",
  summaryCards: [
    {
      label: { zh: "參考 L₀", en: "Reference L₀" },
      value: { zh: "低偏壓區段", en: "Low / zero bias region" },
      tone: "info"
    },
    {
      label: { zh: "I@−20% (L = 0.8×L₀)", en: "I@−20% (L = 0.8×L₀)" },
      value: { zh: "1.85 A", en: "1.85 A" },
      tone: "warning"
    },
    {
      label: { zh: "額外參考點", en: "Optional points" },
      value: { zh: "−10% @ 1.45 A, −30% @ 2.25 A", en: "−10% @ 1.45 A, −30% @ 2.25 A" },
      tone: "default"
    }
  ],
  summaryText: {
    zh:
      "以低偏壓區段作為 L₀ 基準，計算 L 下降 20% 的 I_sat 作為飽和點。可依需求加入 −10% / −30% 參考點，用於材料或溫度比較。",
    en:
      "Use low‑bias inductance as L₀ and mark the 20% drop point as I_sat. Optional −10% / −30% points can be added for material or temperature comparison."
  },
  detectedFeatures: [
    { feature: "Inductance-drop", frequency: "I = 1.85 A", notes: "L 下降 20% 的飽和點" },
    { feature: "Inductance-drop", frequency: "I = 1.45 A", notes: "L 下降 10% (參考點)" },
    { feature: "Inductance-drop", frequency: "I = 2.25 A", notes: "L 下降 30% (參考點)" }
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
  recommendedMeasurementBand: "0 A – 3 A (DC bias sweep)"
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
      text: "辨識為 TDK 類型電感。可由照片或上方編號對照資料表，已帶出量測模式、頻率與日常 working range。",
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
      text: "掃頻圖適合等效電路分析；預設 3 元件模型，若多共振可升級 4–5 元件。",
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
      text: "已分析 DC bias 曲線，計算 L 下跌 20% 的飽和點與電流值。",
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
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const activeToolId = activeThread?.mode ?? "identify_dut";
  const activeTool =
    toolOptions.find((tool) => tool.id === activeToolId) ?? toolOptions[0];
  const labels = UI_TEXT[locale];
  const localeToggleLabel = locale === "zh" ? "EN" : "中文";
  const newChatTitle = locale === "zh" ? "新對話" : "New chat";
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

  const handleSend = () => {
    if (typingByThread[activeThreadId]) return;
    const text = draft.text.trim();
    if (!text && draft.images.length === 0) return;

    const nowStamp = new Date().toISOString();
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

    window.setTimeout(() => {
      const textByMode: Record<AnalysisMode, string> = {
        identify_dut: "已辨識元件類型，可由照片/編號對照資料表，並提供建議量測設定與日常 working range。",
        interpret_graph: "此掃頻圖適合等效電路分析，已整理 2/3/4 元件模型建議。",
        dc_bias_saturation: "此 DC bias 掃描可用於飽和分析，已標示 L 下跌 20% 的電流點。"
      };

      const textMsg: Message = {
        id: makeId(),
        role: "assistant",
        type: "text",
        text: textByMode[mode],
        createdAt: new Date().toISOString()
      };

      const cardMsg: Message =
        mode === "identify_dut"
          ? {
              id: makeId(),
              role: "assistant",
              type: "dut_result",
              result: mockDUTResult,
              createdAt: new Date().toISOString()
            }
          : {
              id: makeId(),
              role: "assistant",
              type: "graph_result",
              result: mode === "interpret_graph" ? mockGraphResult : mockDcBiasResult,
              createdAt: new Date().toISOString()
            };

      setMessagesByThread((prev) => {
        if (!prev[threadId]) return prev;
        return { ...prev, [threadId]: [...prev[threadId], textMsg, cardMsg] };
      });
      setTypingByThread((prev) => ({ ...prev, [threadId]: false }));
      updateThreadMeta(threadId);
    }, 800);
  };

  const handleInsertSummary = (summary: string) => {
    setDraft((prev) => ({
      ...prev,
      text: prev.text ? `${prev.text}\n${summary}` : summary
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
          onImageClick={(src) => setActiveImage(src)}
          draft={draft}
          onTextChange={(value) => setDraft((prev) => ({ ...prev, text: value }))}
          onRemoveImage={handleRemoveImage}
          onImagesSelected={handleImagesSelected}
          onSend={handleSend}
        />
        {activeImage && <ImageModal src={activeImage} onClose={() => setActiveImage(null)} />}
      </ChatLayout>
    </>
  );
}
