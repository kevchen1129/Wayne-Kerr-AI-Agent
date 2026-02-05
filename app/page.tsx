"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatLayout } from "@/components/ChatLayout";
import { ChatThread } from "@/components/ChatThread";
import { ImageModal } from "@/components/ImageModal";
import { NewChatModal } from "@/components/NewChatModal";
import type {
  AnalysisMode,
  ComposerDraft,
  DUTResult,
  GraphResult,
  LocalImage,
  Message,
  Thread
} from "@/lib/types";
import { truncate } from "@/lib/utils";
import type { ToolOption } from "@/components/Sidebar";

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
      zh: "掃頻圖辨識後，建議 2/3/4 元件模型與分析說明。",
      en: "From a sweep plot, recommend 2/3/4‑element equivalent circuit models."
    }
  },
  {
    id: "detect_resonance",
    title: { zh: "共振頻率偵測", en: "Resonance Detection" },
    description: {
      zh: "自動跳到主共振點並標示多個協振/反共振點。",
      en: "Auto-jump to main resonance and mark multiple harmonic/anti‑resonance points."
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
    activeThread: "目前對話",
    export: "匯出",
    clear: "清除",
    localeLabel: "中文",
    newChatTitle: "新對話",
    newChatSubtitle: "選擇要使用的功能",
    cancel: "取消",
    confirm: "建立新對話",
    edit: "編輯",
    editTitle: "編輯功能",
    editSubtitle: "更新這個對話所屬功能",
    apply: "套用",
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
    activeThread: "Active thread",
    export: "Export",
    clear: "Clear",
    localeLabel: "EN",
    newChatTitle: "New chat",
    newChatSubtitle: "Choose a workflow",
    cancel: "Cancel",
    confirm: "Create chat",
    edit: "Edit",
    editTitle: "Edit workflow",
    editSubtitle: "Update this chat's workflow",
    apply: "Apply",
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
const resonanceGraphImage =
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
  graphTypeGuess: "|Z| & phase sweep",
  confidence: 0.84,
  resonanceFrequency: "~6.8 MHz",
  detectedFeatures: [
    { feature: "Q-peak", frequency: "~4.2 MHz", notes: "usable band" },
    { feature: "Resonance", frequency: "~6.8 MHz", notes: "phase crosses zero" },
    { feature: "Parasitic-dominant", frequency: "> ~10 MHz", notes: "ESL dominates" }
  ],
  interpretation: [
    "建議先用 2 元件 series Ls-Rs 擬合 0.1–3 MHz。",
    "若相位提前翻轉，改用 3 元件 (Ls-Rs + Cp) 模型。",
    "若出現次級峰值，再升級到 4 元件 RLC 模型。"
  ],
  recommendedNextTests: [
    {
      action: "選擇模型複雜度（2/3/4 元件）並分頻段擬合",
      why: "提高參數穩定性並避免共振區域失真。"
    },
    {
      action: "套用 OPEN/SHORT 補償",
      why: "移除治具寄生影響，讓等效電路更準確。"
    }
  ],
  recommendedMeasurementBand: "100 kHz – 5 MHz for fitting; avoid resonance peak",
  suggestedEquivalentCircuit:
    "建議電路：2 元件 series Ls-Rs 起步，必要時加入 Cp（3 元件），若有次峰則用 4 元件 RLC。"
};

// --- Mock Resonance result (Multiple resonance points) ---
const mockResonanceResult: GraphResult = {
  graphTypeGuess: "|Z| vs Frequency (resonance detection)",
  confidence: 0.9,
  resonanceFrequency: "12.4 MHz",
  detectedFeatures: [
    { feature: "Resonance", frequency: "12.4 MHz", notes: "主共振，游標已跳點" },
    { feature: "Anti-resonance", frequency: "18.9 MHz", notes: "反共振" },
    { feature: "Resonance", frequency: "26.1 MHz", notes: "次級共振" },
    { feature: "Resonance", frequency: "33.7 MHz", notes: "第三共振" }
  ],
  interpretation: [
    "已自動標示主共振與多個諧振/反共振點。",
    "可逐點檢視 Q、ESR 與相位變化。",
    "若噪聲影響峰值位置，建議降低電平或提高解析度。"
  ],
  recommendedNextTests: [
    {
      action: "縮小頻帶到 8–40 MHz 並提高解析度",
      why: "讓多個共振點定位更精準。"
    },
    {
      action: "加入 ESR 最小與 Q 峰值標記",
      why: "輔助判斷損耗與阻尼。"
    }
  ],
  recommendedMeasurementBand: "8–40 MHz (focus on resonance neighborhood)",
  suggestedEquivalentCircuit: "Resonance-focused series RLC; add parallel Cp for anti-resonance fitting."
};

const now = new Date().toISOString();

const initialThreads: Thread[] = [
  { id: "thread-dut", title: "被斷元件測量建議", mode: "identify_dut", updatedAt: now },
  { id: "thread-eq", title: "等效電路", mode: "interpret_graph", updatedAt: now },
  { id: "thread-res", title: "共振頻率偵測", mode: "detect_resonance", updatedAt: now }
];

const initialMessages: Record<string, Message[]> = {
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
      text: "掃頻圖顯示適合等效電路分析，以下為建議的 2/3/4 元件模型選擇。",
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
      imageUrl: resonanceGraphImage,
      caption: "Resonance scan",
      mode: "detect_resonance",
      createdAt: now
    },
    {
      id: "msg-res-2",
      role: "assistant",
      type: "text",
      text: "已自動跳到主共振點並標示多個諧振/反共振點（含數值）。",
      createdAt: now
    },
    {
      id: "msg-res-3",
      role: "assistant",
      type: "graph_result",
      result: mockResonanceResult,
      createdAt: now
    }
  ]
};

export default function Home() {
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [threads, setThreads] = useState<Thread[]>(() => initialThreads);
  const [activeThreadId, setActiveThreadId] = useState("thread-dut");
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
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<AnalysisMode>("identify_dut");
  const [editWorkflowOpen, setEditWorkflowOpen] = useState(false);
  const [editWorkflowMode, setEditWorkflowMode] = useState<AnalysisMode>("identify_dut");

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

  const updateThreadMeta = (threadId: string, textSample?: string) => {
    setThreads((prev) => {
      const updated = prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        const title =
          thread.title === "New chat" && textSample
            ? truncate(textSample.replace(/\s+/g, " ").trim(), 32)
            : thread.title;
        return { ...thread, title, updatedAt: new Date().toISOString() };
      });
      return [...updated].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    });
  };

  const openNewChat = (mode?: AnalysisMode) => {
    setNewChatMode(mode ?? "identify_dut");
    setNewChatOpen(true);
    setSidebarOpen(false);
  };

  const openEditWorkflow = () => {
    const mode = activeThread?.mode ?? "identify_dut";
    setEditWorkflowMode(mode);
    setEditWorkflowOpen(true);
  };

  const createThread = (mode: AnalysisMode) => {
    const id = makeId();
    const tool = TOOL_DEFS.find((t) => t.id === mode);
    const nowStamp = new Date().toISOString();
    const newThread: Thread = {
      id,
      title: tool ? tool.title[locale] : locale === "zh" ? "新對話" : "New chat",
      mode,
      updatedAt: nowStamp
    };
    setThreads((prev) => [newThread, ...prev]);
    setMessagesByThread((prev) => ({ ...prev, [id]: [] }));
    setActiveThreadId(id);
    setDraft((prev) => ({ ...prev, mode }));
    setNewChatOpen(false);
    setSidebarOpen(false);
  };

  const applyWorkflowEdit = (mode: AnalysisMode) => {
    if (!activeThread) return;
    const tool = TOOL_DEFS.find((t) => t.id === mode);
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              mode,
              title: tool ? tool.title[locale] : thread.title,
              updatedAt: new Date().toISOString()
            }
          : thread
      )
    );
    setDraft((prev) => ({ ...prev, mode }));
    setEditWorkflowOpen(false);
  };

  const handleNewThread = () => {
    openNewChat();
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
      else openNewChat();
    }
  };

  const handleSelectTool = (mode: AnalysisMode) => {
    openNewChat(mode);
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
    updateThreadMeta(activeThreadId, text || "New chat");
    setDraft((prev) => ({ ...prev, text: "", images: [] }));
    setTypingByThread((prev) => ({ ...prev, [activeThreadId]: true }));

    const threadId = activeThreadId;

    window.setTimeout(() => {
      const textByMode: Record<AnalysisMode, string> = {
        identify_dut: "已辨識元件類型，可由照片/編號對照資料表，並提供建議量測設定與日常 working range。",
        interpret_graph: "此掃頻圖適合等效電路分析，已整理 2/3/4 元件模型建議。",
        detect_resonance: "已偵測主共振並標示多個諧振/反共振點（含數值）。"
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
              result: mode === "interpret_graph" ? mockGraphResult : mockResonanceResult,
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
        tools={toolOptions}
        activeToolId={activeToolId}
        onSelectTool={handleSelectTool}
        brand={brand}
        labels={{
          coreWorkflows: labels.coreWorkflows,
          newChat: labels.newChat,
          recentChats: labels.recentChats,
          updated: labels.updated,
          prototypeNote: labels.prototypeNote
        }}
        threads={threads}
        activeThreadId={activeThreadId}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        onNewThread={handleNewThread}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
      >
        <ChatThread
          title={activeThread?.title ?? "New chat"}
          activeWorkflow={activeTool.title}
          labels={{
            analyzing: labels.analyzing,
            result: labels.result,
            user: labels.user,
            assistant: labels.assistant
          }}
          locale={locale}
          localeLabel={localeToggleLabel}
          onToggleLocale={() => setLocale((prev) => (prev === "zh" ? "en" : "zh"))}
          onEditWorkflow={openEditWorkflow}
          headerLabels={{
            activeThread: labels.activeThread,
            export: labels.export,
            clear: labels.clear,
            edit: labels.edit
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

      <NewChatModal
        open={newChatOpen}
        tools={toolOptions}
        selectedId={newChatMode}
        onSelect={(id) => setNewChatMode(id)}
        onConfirm={() => createThread(newChatMode)}
        onClose={() => setNewChatOpen(false)}
        labels={{
          title: labels.newChatTitle,
          subtitle: labels.newChatSubtitle,
          cancel: labels.cancel,
          confirm: labels.confirm
        }}
      />

      <NewChatModal
        open={editWorkflowOpen}
        tools={toolOptions}
        selectedId={editWorkflowMode}
        onSelect={(id) => setEditWorkflowMode(id)}
        onConfirm={() => applyWorkflowEdit(editWorkflowMode)}
        onClose={() => setEditWorkflowOpen(false)}
        labels={{
          title: labels.editTitle,
          subtitle: labels.editSubtitle,
          cancel: labels.cancel,
          confirm: labels.apply
        }}
      />
    </>
  );
}
