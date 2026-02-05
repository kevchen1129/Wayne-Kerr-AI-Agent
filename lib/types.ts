export type Thread = {
  id: string;
  title: string;
  mode: AnalysisMode;
  updatedAt: string;
};

export type LocalImage = {
  id: string;
  url: string;
  file?: File;
};

export type AnalysisMode = "identify_dut" | "interpret_graph" | "detect_resonance";

// --- DUT (Identify) result ---
export type DUTResult = {
  componentType: "Inductor" | "Capacitor" | "Resistor" | "Unknown";
  confidence: number;
  packageGuess?: string;
  estimatedWorkingRange?: {
    recommendedFrequencyBand: string;
    srFEstimate?: string;
    notes?: string;
  };
  recommendedSetup: {
    mode: "Series" | "Parallel";
    primaryParams: string[];
    testFrequencySuggestions: Array<{ label: string; value: string; rationale?: string }>;
    testLevel?: string;
    dcBias?: string;
    fixture?: string;
    compensation?: string[];
  };
  whatToConfirm: string[];
  warnings?: string[];
};

// --- Graph (Sweep) result ---
export type GraphDetectedFeature =
  | "Resonance"
  | "Anti-resonance"
  | "Q-peak"
  | "ESR-min"
  | "Parasitic-dominant"
  | "Noise/aliasing";

export type GraphResult = {
  graphTypeGuess: string;
  confidence: number;
  /** 共振頻率 Resonance frequency (e.g. from L(f) or |Z|(f)) */
  resonanceFrequency?: string;
  /** 飽和電流 Saturation current (e.g. from L vs I curve, inductor) */
  saturationCurrent?: string;
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
  | { id: string; role: "assistant"; type: "text"; text: string; createdAt: string }
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
