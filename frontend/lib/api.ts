/**
 * Typed API client — all calls to FastAPI backend.
 * Base URL from NEXT_PUBLIC_API_URL env var.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API = `${BASE}/api/v1`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Analysis {
  id: string;
  filename: string;
  created_at: string;
  domain: string | null;
  problem_type: string | null;
  shape_rows: number | null;
  shape_cols: number | null;
  target_col: string | null;
  winning_model: string | null;
  name: string | null;
  is_favorite: boolean;
  user_goals: string | null;
  eda_result: EdaResult | null;
  profile: DataProfile | null;
  results_json: ModelResults | null;
}

export interface EdaResult {
  problem_type: string;
  target_col: string | null;
  domain_guess: string;
  confidence: string;
  observations: string[];
  narrative: string;
}

export interface DataProfile {
  shape: { rows: number; cols: number };
  memory_mb: number;
  duplicate_rows: number;
  columns: string[];
  column_details: Record<string, ColumnDetail>;
  sample_rows: Record<string, string>[];
}

export interface ColumnDetail {
  dtype: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  q25?: number;
  q75?: number;
  skewness?: number;
  top_values?: Record<string, number>;
}

export interface ModelResult {
  name: string;
  accuracy?: number;
  f1?: number;
  precision?: number;
  recall?: number;
  auc_roc?: number | null;
  rmse?: number;
  mae?: number;
  r2?: number;
  silhouette?: number;
  davies_bouldin?: number;
  training_time_s: number;
  confusion_matrix?: number[][];
  feature_importances?: Record<string, number>;
  y_test?: number[];
  y_pred?: number[];
  labels?: number[];
  k?: number;
  n_clusters?: number;
}

export interface ModelResults {
  problem_type: string;
  models: ModelResult[];
  winner: string;
  target_col?: string;
  feature_names?: string[];
  scatter_data?: { x: number; y: number; cluster: number }[];
  centroids?: Record<string, Record<string, number>>;
  forecast_data?: { index: string; actual: number; predicted: number }[];
  explanation?: Explanation;
  cluster_personas?: ClusterPersona[];
  next_steps?: NextStep[];
  classes?: (string | number)[];
}

export interface Explanation {
  summary: string;
  why_winner: string;
  tradeoffs: string;
  feature_insights: { feature: string; insight: string }[];
  domain_interpretation: string;
  actions: string[];
}

export interface ClusterPersona {
  id: number;
  name: string;
  tagline: string;
  characteristics: string[];
  action: string;
  color: string;
}

export interface NextStep {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface UploadResponse {
  analysis_id: string;
  filename: string;
  shape: { rows: number; cols: number };
  profile: DataProfile;
  eda_result: EdaResult;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

async function _fetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API error");
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Upload
  upload: async (file: File, domain?: string): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    if (domain) form.append("domain", domain);
    return _fetch(`${API}/upload`, { method: "POST", body: form });
  },

  // Analysis CRUD
  listAnalyses: (limit = 10): Promise<Analysis[]> =>
    _fetch(`${API}/analysis?limit=${limit}`),

  getAnalysis: (id: string): Promise<Analysis> =>
    _fetch(`${API}/analysis/${id}`),

  patchAnalysis: (id: string, body: { name?: string; is_favorite?: boolean; user_goals?: string }): Promise<Analysis> =>
    _fetch(`${API}/analysis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  deleteAnalysis: (id: string): Promise<{ success: boolean }> =>
    _fetch(`${API}/analysis/${id}`, { method: "DELETE" }),

  getStats: (): Promise<{ total_analyses: number; by_problem_type: Record<string, number> }> =>
    _fetch(`${API}/stats`),

  // Models
  runModels: (payload: {
    analysis_id: string;
    expertise_level: string;
    target_col?: string;
  }): Promise<ModelResults> =>
    _fetch(`${API}/models/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // Explain
  explain: (payload: {
    analysis_id: string;
    expertise_level: string;
    force_refresh?: boolean;
  }): Promise<{ explanation: Explanation; cached: boolean }> =>
    _fetch(`${API}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // What-If
  whatIfPredict: (payload: {
    analysis_id: string;
    input_values: Record<string, string | number>;
  }): Promise<{
    prediction: number | string;
    probabilities?: { class: string; probability: number }[];
  }> =>
    _fetch(`${API}/whatif/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // Export
  exportNotebookUrl: (id: string): string => `${API}/export/notebook/${id}`,

  // 11-Step Pipeline Specifics
  getSuggestions: (id: string): Promise<{
    suggested_targets: { column: string; reason: string }[];
    business_goals: string[];
    metrics: { metric: string; reason: string }[];
  }> => _fetch(`${API}/analysis/${id}/suggestions`),

  getAttributes: (id: string): Promise<{
    explanations: Record<string, string>;
  }> => _fetch(`${API}/analysis/${id}/attributes`),

  getConclusion: (id: string): Promise<{
    executive_summary: string;
    preprocessing_summary: string;
    model_performance_summary: string;
    business_impact: string;
    overall_conclusion: string;
  }> => _fetch(`${API}/analysis/${id}/conclusion`),

  // Full dataset with cell-level missing/duplicate metadata
  getDataset: (id: string, limit = 1000): Promise<{
    analysis_id: string;
    filename: string;
    target_col: string | null;
    columns: string[];
    column_meta: Record<string, { dtype: string; missing_count: number; is_target: boolean }>;
    total_rows: number;
    rows: {
      idx: number;
      data: Record<string, string | number | null>;
      is_duplicate: boolean;
      missing_cells: string[];
    }[];
  }> => _fetch(`${API}/analysis/${id}/data?limit=${limit}`),
};

