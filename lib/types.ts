export type Thread = {
  id: string;
  title: string;
  mode: AnalysisMode;
  updatedAt: string;
  isDraft?: boolean;
};

export type LocalImage = {
  id: string;
  url: string;
  file?: File;
};

export type AnalysisMode = "identify_dut" | "interpret_graph" | "dc_bias_saturation";

export type LocalizedString = string | { zh: string; en: string };

export type ToolOption = {
  id: AnalysisMode;
  title: string;
  description: string;
};

// --- DUT (Identify) result ---
export type DUTResult = {
  componentType: "Inductor" | "Capacitor" | "Resistor" | "Unknown";
  confidence: number;
  packageGuess?: LocalizedString;
  estimatedWorkingRange?: {
    recommendedFrequencyBand: LocalizedString;
    srFEstimate?: LocalizedString;
    notes?: LocalizedString;
  };
  recommendedSetup: {
    mode: "Series" | "Parallel";
    primaryParams: LocalizedString[];
    testFrequencySuggestions: Array<{
      label: LocalizedString;
      value: LocalizedString;
      rationale?: LocalizedString;
    }>;
    testLevel?: LocalizedString;
    dcBias?: LocalizedString;
    fixture?: LocalizedString;
    compensation?: LocalizedString[];
  };
  whatToConfirm: LocalizedString[];
  warnings?: LocalizedString[];
};

// --- Graph (Sweep) result ---
export type GraphDetectedFeature =
  | "Resonance"
  | "Anti-resonance"
  | "Q-peak"
  | "ESR-min"
  | "Parasitic-dominant"
  | "Noise/aliasing"
  | "Inductance-drop";

export type GraphResult = {
  graphTypeGuess: string;
  /** Optional localized title for the card */
  title?: LocalizedString;
  confidence: number;
  /** 共振頻率 Resonance frequency (e.g. from L(f) or |Z|(f)) */
  resonanceFrequency?: string;
  /** 飽和電流 Saturation current (e.g. from L vs I curve, inductor) */
  saturationCurrent?: string;
  /** Summary cards for engineering-style recommendations */
  summaryCards?: Array<{
    label: LocalizedString;
    value: LocalizedString;
    tone?: "default" | "info" | "warning";
  }>;
  /** Optional long-form summary text */
  summaryText?: LocalizedString;
  detectedFeatures: Array<{
    feature: GraphDetectedFeature;
    frequency?: string;
    notes?: string;
  }>;
  interpretation: string[];
  recommendedNextTests: Array<{
    action: string;
    why: string;
  }>;
  recommendedMeasurementBand: string;
  /** 原始圖像（用於標註或預覽） */
  sourceImageUrl?: string;
  /** DC Bias 解析資訊（飽和點計算用） */
  dcBiasMeta?: {
    l0: { value: number; unit: string };
    currentRange?: { min: number; max: number; unit: string };
    axisRange?: {
      current: { min: number; max: number; unit: string };
      inductance: { min: number; max: number; unit: string };
    };
    plotAreaPct?: { left: number; top: number; right: number; bottom: number };
    dropPoints: Array<{ percent: number; current: number }>;
    curvePoints?: Array<{ current: number; inductance: number }>;
    testConditions?: {
      acLevel?: string;
      sweep?: string;
      frequency?: string;
    };
    kneePoint?: { current: number; inductance: number };
  };
  /** 等效電路 Equivalent circuit */
  suggestedEquivalentCircuit?: string;
};

// --- Spec / Table (規格或量測表格) result ---
export type TableResult = {
  /** 辨識到的表格類型 (e.g. 規格表、量測紀錄表) */
  tableTypeGuess: string;
  confidence: number;
  /** 抽取的欄位名稱，用於建立表單 */
  extractedColumns: string[];
  /** 範例列（可選，用於預填表單） */
  sampleRows?: Array<Record<string, string>>;
  /** 建議表單欄位與型別，供前端建立儲存量測資料的表單 */
  suggestedFormFields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "date" | "select";
    unit?: string;
    options?: string[];
  }>;
  /** 備註（例如辨識不確定處） */
  notes?: string[];
};

// --- Message variants ---
export type Message =
  | { id: string; role: "user"; type: "text"; text: string; createdAt: string }
  | {
      id: string;
      role: "user";
      type: "image";
      imageUrl: string;
      caption?: string;
      mode: AnalysisMode;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      type: "text";
      text: LocalizedString;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      type: "dut_result";
      result: DUTResult;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      type: "graph_result";
      result: GraphResult;
      createdAt: string;
    };

export type ComposerDraft = {
  text: string;
  images: LocalImage[];
  mode: AnalysisMode;
};
