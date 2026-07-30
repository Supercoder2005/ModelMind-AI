"use client";

import { useState, useEffect } from "react";
import { api, type Analysis, type ModelResults } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Database, Upload, Sparkles, Clock, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, Layers, FileText, Cpu, Info,
  TrendingUp, Award, Activity, Heart, ShieldCheck, Gauge, HelpCircle,
  FolderSync, GitMerge, KanbanSquare, CheckCircle, BarChart4, ClipboardList,
  RefreshCw, Play, Trophy, TableIcon, BarChart2
} from "lucide-react";
import { DatasetModal } from "@/components/pipeline/DatasetModal";
import { EDACharts } from "@/components/eda/EDACharts";
import { ModelTrainingLive } from "@/components/models/ModelTrainingLive";
import { useStore } from "@/lib/store";

interface PipelineWalkthroughProps {
  analysis: Analysis;
  results: ModelResults | null;
  running: boolean;
  runModels: () => Promise<void>;
  onRefresh: () => void;
}

// Inline helper to highlight metrics, numbers, and models inside AI generated text
function formatInsightText(text: string) {
  if (!text) return "";

  const regex = /(\b(?:ARIMA\(\d+,\d+,\d+\)|SVM|NeuralProphet|XGBoost|Random Forest|Gradient Boosting|Logistic Regression|Linear Regression|DBSCAN|K-Means|KMeans|RMSE|MAE|AIC|R²|ROC|AUC-ROC)\b)|(\b\d+(?:,\d+)*(?:\.\d+)?%?\b)/gi;

  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    const isModelOrMetric = /^(ARIMA\(\d+,\d+,\d+\)|SVM|NeuralProphet|XGBoost|Random Forest|Gradient Boosting|Logistic Regression|Linear Regression|DBSCAN|K-Means|KMeans|RMSE|MAE|AIC|R²|ROC|AUC-ROC)$/i.test(part);
    const isNumber = /^\d+(?:,\d+)*(?:\.\d+)?%?$/.test(part);

    if (isModelOrMetric) {
      return (
        <span key={index} className="px-1.5 py-0.5 mx-0.5 text-xs font-mono font-semibold rounded bg-white/10 text-primary border border-white/5">
          {part}
        </span>
      );
    }

    if (isNumber) {
      return (
        <span key={index} className="font-semibold text-emerald-400 font-mono">
          {part}
        </span>
      );
    }

    return part;
  });
}


// ── Step 5: Preprocessing with real data from backend ──
function Step5Preprocessing({ analysis, results, running, runModels }: {
  analysis: Analysis;
  results: ModelResults | null;
  running: boolean;
  runModels: () => Promise<void>;
}) {
  const hasResults = !!results;
  const [prepInfo, setPrepInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    if (hasResults) {
      setLoadingInfo(true);
      api.getPreprocessInfo(analysis.id)
        .then(setPrepInfo)
        .catch(() => {})
        .finally(() => setLoadingInfo(false));
    }
  }, [hasResults, analysis.id]);

  if (!hasResults) {
    return (
      <div className="text-center py-12 bg-black/20 rounded-3xl border border-white/5 p-6 space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h4 className="font-bold text-sm text-white">Preprocessing Not Yet Run</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Please proceed to Step 8 (Model Competition) to start the machine learning pipeline. The exact preprocessing operations (null imputation, encoding, scaling) will be displayed here once the models are trained.
        </p>
      </div>
    );
  }

  const prepLogs: string[] = (results as any)?.preprocessing_logs ?? prepInfo?.actual_preprocessing_logs ?? [];
  const plannedOps = prepInfo?.planned_operations ?? [];

  const typeColors: Record<string, string> = {
    imputation: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    encoding: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    scaling: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  };

  return (
    <div className="space-y-6">
      {/* Pipeline flowchart */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline Applied</span>
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/10 border border-white/5 rounded-2xl text-xs font-semibold">
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-muted-foreground">Raw Data</div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300">Null Imputation</div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300">Categorical Encoding</div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">StandardScaler</div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary">Cleaned Dataset ✓</div>
        </div>
      </div>

      {/* Actual preprocessing logs */}
      {prepLogs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Operations Applied ({prepLogs.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prepLogs.map((log, i) => {
              const type = log.toLowerCase().includes("impute") ? "imputation"
                : log.toLowerCase().includes("encod") ? "encoding"
                : "scaling";
              return (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] ${typeColors[type]}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{log}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Planned ops fallback */}
      {prepLogs.length === 0 && plannedOps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operations Applied</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plannedOps.map((op: any, i: number) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] ${typeColors[op.type] ?? "bg-white/5 border-white/10 text-white/70"}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{op.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download cleaned dataset */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Cleaned Dataset Ready</p>
          <p className="text-[10px] text-muted-foreground">Download the preprocessed and encoded CSV for further analysis.</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          onClick={() => window.open(api.cleanedDataUrl(analysis.id), "_blank")}
        >
          <Database className="w-3.5 h-3.5" />
          Download CSV
        </Button>
      </div>
    </div>
  );
}


// ── Step 8: Live Model Competition with SSE streaming ──
function Step8ModelCompetition({ analysis, results, running, runModels }: {
  analysis: Analysis;
  results: ModelResults | null;
  running: boolean;
  runModels: () => Promise<void>;
}) {
  const { expertiseLevel } = useStore();
  const [liveMode, setLiveMode] = useState(false);
  const [liveResults, setLiveResults] = useState<ModelResults | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const activeResults = liveResults ?? results;
  const activeProblemType = analysis.problem_type ?? "classification";

  const handleStartLive = () => {
    setLiveMode(true);
    setLiveError(null);
    setLiveResults(null);
  };

  const handleLiveComplete = (res: ModelResults) => {
    setLiveResults(res);
    setLiveMode(false);
    // Refresh the parent page analysis
    window.dispatchEvent(new CustomEvent("modelmind:results-updated"));
  };

  if (!activeResults && !liveMode) {
    return (
      <div className="text-center py-12 bg-black/20 rounded-3xl border border-white/5 p-6 space-y-4">
        <Trophy className="w-10 h-10 text-yellow-400 mx-auto" />
        <h4 className="font-bold text-sm text-white">Model Competition</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Train multiple ML algorithms simultaneously and watch them compete in real time. The best performer wins.
        </p>
        <Button onClick={handleStartLive} className="gap-2 px-6 bg-primary hover:bg-primary/90">
          <Play className="w-4 h-4" />
          Start Live Training
        </Button>
      </div>
    );
  }

  if (liveMode) {
    return (
      <ModelTrainingLive
        analysisId={analysis.id}
        targetCol={analysis.target_col}
        problemType={activeProblemType}
        expertiseLevel={expertiseLevel}
        onComplete={handleLiveComplete}
        onError={(msg) => { setLiveError(msg); setLiveMode(false); }}
      />
    );
  }

  // Show leaderboard after training
  return (
    <div className="space-y-6">
      {liveError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">{liveError}</div>
      )}

      <div className="flex justify-between items-center gap-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Competitors Leaderboard</h4>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex gap-1 items-center px-3 py-1 font-bold text-[10px]">
            <Trophy className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            Winner: {activeResults?.winner}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-white/10 h-7 gap-1"
            onClick={handleStartLive}
          >
            <RefreshCw className="w-3 h-3" />
            Re-train Live
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {activeResults?.models?.map((model, idx) => {
          const isWinner = model.name === activeResults.winner;
          const scoreLabel = activeProblemType === "classification"
            ? "F1-Score"
            : activeProblemType === "regression"
            ? "R² Coeff"
            : "Silhouette";
          const scoreVal = activeProblemType === "classification"
            ? ((model.f1 ?? 0) * 100).toFixed(2) + "%"
            : activeProblemType === "regression"
            ? ((model.r2 ?? 0) * 100).toFixed(2) + "%"
            : model.silhouette?.toFixed(4);

          const relativePct = activeProblemType === "classification"
            ? (model.f1 ?? 0) * 100
            : activeProblemType === "regression"
            ? Math.max(0, (model.r2 ?? 0) * 100)
            : ((model.silhouette ?? 0) + 1) * 50;

          return (
            <div
              key={model.name}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isWinner
                  ? "bg-yellow-500/8 border-yellow-500/25 shadow-lg"
                  : "bg-black/20 border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shrink-0">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{model.name}</span>
                    {isWinner && <Trophy className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Fit time: {model.training_time_s}s</span>
                </div>
              </div>
              <div className="w-full sm:w-[250px] space-y-1 shrink-0">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground uppercase font-bold tracking-wider">{scoreLabel}</span>
                  <span className="text-white font-bold font-mono">{scoreVal}</span>
                </div>
                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isWinner ? "bg-primary" : "bg-muted-foreground/50"}`}
                    style={{ width: `${relativePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export function PipelineWalkthrough({

  analysis,
  results,
  running,
  runModels,
  onRefresh,
}: PipelineWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string> | null>(null);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [conclusion, setConclusion] = useState<any>(null);
  const [loadingConclusion, setLoadingConclusion] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [edaTab, setEdaTab] = useState<"stats" | "charts">("stats");

  // Fetch Step 2 Suggestions
  useEffect(() => {
    if (currentStep === 2 && !suggestions && analysis.id) {
      setLoadingSuggestions(true);
      api.getSuggestions(analysis.id)
        .then(setSuggestions)
        .catch(console.error)
        .finally(() => setLoadingSuggestions(false));
    }
  }, [currentStep, suggestions, analysis.id]);

  // Fetch Step 3 Attribute Explanations
  useEffect(() => {
    if (currentStep === 3 && !attributes && analysis.id) {
      setLoadingAttributes(true);
      api.getAttributes(analysis.id)
        .then(data => setAttributes(data.explanations))
        .catch(console.error)
        .finally(() => setLoadingAttributes(false));
    }
  }, [currentStep, attributes, analysis.id]);

  // Fetch Step 11 Final Conclusion
  useEffect(() => {
    if (currentStep === 11 && !conclusion && analysis.id && results) {
      setLoadingConclusion(true);
      api.getConclusion(analysis.id)
        .then(setConclusion)
        .catch(console.error)
        .finally(() => setLoadingConclusion(false));
    }
  }, [currentStep, conclusion, analysis.id, results]);

  const steps = [
    { num: 1, title: "1. Collect Data", desc: "Ingestion & integrity checks", icon: Database },
    { num: 2, title: "2. Define Problem", desc: "Target recommendation & metrics", icon: GitMerge },
    { num: 3, title: "3. Attribute Catalog", desc: "Semantic feature meaning", icon: FolderSync },
    { num: 4, title: "4. EDA Profile", desc: "Distributions, balance & quality", icon: Activity },
    { num: 5, title: "5. Preprocessing", desc: "Handling nulls & scale alignment", icon: Layers },
    { num: 6, title: "6. Feature Eng.", desc: "Synthesizing interaction terms", icon: Sparkles },
    { num: 7, title: "7. Data Splitting", desc: "Disjoint set isolation", icon: KanbanSquare },
    { num: 8, title: "8. Model Competition", desc: "Multi-algorithm training run", icon: Award },
    { num: 9, title: "9. K-Fold Validation", desc: "Cross-validation robustness", icon: ShieldCheck },
    { num: 10, title: "10. Evaluation", desc: "Confusion metrics & weights", icon: BarChart4 },
    { num: 11, title: "11. Conclusion", desc: "Executive business report", icon: ClipboardList },
  ];

  const handleNext = () => {
    if (currentStep < 11) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepLocked = (stepNum: number) => {
    return stepNum >= 9 && !results && !running;
  };

  const isNumeric = (colName: string) => {
    const detail = analysis.profile?.column_details?.[colName];
    return detail && (detail.mean !== undefined || detail.q25 !== undefined);
  };

  const activeProblemType = analysis.problem_type || "classification";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-fade-in">
      
      {/* ── Left Sidebar Progress Steps (Glowmorphic List) ── */}
      <div className="lg:col-span-1 space-y-3 bg-muted/15 border border-white/5 rounded-3xl p-4 shadow-xl backdrop-blur-md">
        <div className="px-2 pb-2 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Pipeline Progression
          </h3>
          <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">
            {currentStep}/11
          </span>
        </div>
        
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            const isLocked = isStepLocked(s.num);
            const StepIcon = s.icon;

            return (
              <button
                key={s.num}
                onClick={() => !isLocked && setCurrentStep(s.num)}
                disabled={isLocked}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 relative ${
                  isActive 
                    ? "bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(var(--primary-rgb),0.05)]" 
                    : isLocked 
                      ? "opacity-30 cursor-not-allowed border-transparent" 
                      : "text-muted-foreground bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : isCompleted 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-muted/40 text-muted-foreground border border-white/5"
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate leading-tight ${isActive ? "text-white" : "text-muted-foreground"}`}>
                    {s.title}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate mt-0.5 font-medium leading-none">
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right Content Screen: Advanced Styled Steps ── */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border-white/8 bg-muted/5 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md relative border-t-primary/20 border-t-2">
          
          {/* Top Info Bar */}
          <div className="border-b border-white/5 bg-muted/20 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                {(() => {
                  const CurrentIcon = steps[currentStep - 1].icon;
                  return <CurrentIcon className="w-4 h-4 text-primary" />;
                })()}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Pipeline State</p>
                <h2 className="text-sm font-black text-white">{steps[currentStep - 1].title.split(". ")[1]}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground font-mono">
                {analysis.filename}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">

            {/* ── STEP 1: Collect Data ── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Database className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Source Ingestion Confirmed</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Ingested tabular file, indexed dimensions, and checked memory structure.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition shadow-inner">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Rows Ingested</p>
                    <p className="text-2xl font-black text-white">{analysis.shape_rows?.toLocaleString() ?? "N/A"}</p>
                    <Badge variant="ghost" className="text-[9px] text-muted-foreground p-0 mt-1">Total samples</Badge>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition shadow-inner">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Columns Registered</p>
                    <p className="text-2xl font-black text-white">{analysis.shape_cols ?? "N/A"}</p>
                    <Badge variant="ghost" className="text-[9px] text-muted-foreground p-0 mt-1">Available features</Badge>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition shadow-inner">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Target Inferred</p>
                    <p className="text-base font-black text-primary truncate mt-1">
                      {analysis.target_col ?? "None"}
                    </p>
                    <Badge className="text-[8px] bg-primary/15 text-primary border-none mt-1">Auto detected</Badge>
                  </div>
                </div>

                <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">File Metadata</span>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">LOCAL NAME</span>
                      <span className="text-white truncate block max-w-xs">{analysis.filename}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">ANALYSIS HASH</span>
                      <span className="text-white truncate block max-w-[150px]">{analysis.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Define Problem ── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {analysis.user_goals && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 relative overflow-hidden">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">User Defined Goal</span>
                    </div>
                    <p className="text-xs text-white font-medium leading-relaxed">
                      "{analysis.user_goals}"
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <Sparkles className="w-16 h-16 text-violet-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-violet-300">AI Task Inference</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    "{analysis.eda_result?.narrative || 'Auto-mapping predictors to define target relationships.'}"
                  </p>
                </div>

                {loadingSuggestions ? (
                  <div className="text-center py-10 bg-black/10 rounded-2xl border border-white/5">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Consulting AI for business metric recommendations...</p>
                  </div>
                ) : suggestions ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Alternative Targets & Scenarios</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {suggestions.suggested_targets?.map((item: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-2xl border border-white/5 bg-black/20 hover:border-white/10 transition space-y-1">
                            <Badge className="bg-primary/20 text-primary border-none text-[9px] font-mono mb-1">{item.column}</Badge>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Directives</h4>
                        <ul className="space-y-2">
                          {suggestions.business_goals?.map((g: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span className="leading-relaxed">{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Optimization Metrics</h4>
                        <div className="space-y-2">
                          {suggestions.metrics?.map((m: any, i: number) => (
                            <div key={i} className="pb-2 border-b border-white/5 last:border-b-0 last:pb-0 flex justify-between gap-4">
                              <span className="text-xs font-bold text-white font-mono shrink-0">{m.metric}</span>
                              <span className="text-[10px] text-muted-foreground text-right">{m.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center">No Suggestions compiled.</p>
                )}
              </div>
            )}

            {/* ── STEP 3: Attribute Catalog ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">AI Variables Catalog</h4>
                  {loadingAttributes ? (
                    <div className="text-center py-10 bg-black/10 rounded-2xl border border-white/5">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Compiling catalog descriptions from data schema...</p>
                    </div>
                  ) : attributes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                      {Object.entries(attributes).map(([colName, explanation], idx) => {
                        const type = analysis.profile?.column_details?.[colName]?.dtype ?? "object";
                        const isNum = isNumeric(colName);
                        return (
                          <div key={idx} className="p-3.5 bg-black/20 border border-white/5 rounded-2xl space-y-1.5 hover:border-white/10 transition">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs font-bold font-mono text-white truncate">{colName}</span>
                              <Badge variant="outline" className="text-[9px] uppercase border-white/10 shrink-0 text-muted-foreground">
                                {type} {isNum ? "· numeric" : "· category"}
                              </Badge>
                            </div>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center italic">Attributes details unavailable.</p>
                  )}
                </div>

                {/* Data Terminal Feed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Terminal Feed</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 px-3"
                      onClick={() => setShowDatasetModal(true)}
                    >
                      <TableIcon className="w-3 h-3" />
                      View Full Dataset
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="bg-black/50 px-4 py-2 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">feed: df.head(3) · click &quot;View Full Dataset&quot; for complete view</span>
                    </div>
                    <div className="p-3 bg-black/70 overflow-x-auto">
                      <table className="w-full text-[10px] text-left text-muted-foreground font-mono">
                        <thead>
                          <tr className="border-b border-white/10 pb-1 text-white">
                            {analysis.profile?.columns.slice(0, 5).map((c, i) => (
                              <th key={i} className={`py-2 pr-3 font-semibold ${c === analysis.target_col ? "text-primary" : ""}`}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.profile?.sample_rows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                              {analysis.profile?.columns.slice(0, 5).map((col, j) => (
                                <td key={j} className={`py-2 pr-3 max-w-[120px] truncate ${row[col] === null || row[col] === undefined ? "text-amber-400 italic" : col === analysis.target_col ? "text-primary font-semibold" : ""}`}>
                                  {row[col] === null || row[col] === undefined ? "null" : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dataset Modal */}
            {showDatasetModal && (
              <DatasetModal
                analysisId={analysis.id}
                filename={analysis.filename}
                targetCol={analysis.target_col ?? null}
                onClose={() => setShowDatasetModal(false)}
              />
            )}

            {/* ── STEP 4: EDA Profile ── */}
            {currentStep === 4 && (
              <div className="space-y-5">
                {/* Tab Switcher */}
                <div className="flex bg-muted/20 border border-white/5 rounded-xl p-0.5 w-fit">
                  <button
                    onClick={() => setEdaTab("stats")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      edaTab === "stats" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Activity className="w-3 h-3" />Statistics
                  </button>
                  <button
                    onClick={() => setEdaTab("charts")}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      edaTab === "charts" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" />Distribution Charts
                  </button>
                </div>

                {edaTab === "stats" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl border border-white/5 bg-black/20 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Missing Checks</span>
                          <p className="text-2xl font-black text-white mt-1">
                            {analysis.profile?.columns.reduce((acc, c) => acc + (analysis.profile?.column_details?.[c]?.missing_count ?? 0), 0).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="ghost" className="text-[9px] text-muted-foreground p-0 mt-3 hover:bg-transparent">null cells in matrix</Badge>
                      </div>

                      <div className="p-4 rounded-2xl border border-white/5 bg-black/20 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Duplicate Rows</span>
                          <p className="text-2xl font-black text-white mt-1">
                            {analysis.profile?.duplicate_rows ?? 0}
                          </p>
                        </div>
                        <Badge variant="ghost" className="text-[9px] text-muted-foreground p-0 mt-3 hover:bg-transparent">identical records</Badge>
                      </div>

                      <div className="p-4 rounded-2xl border border-white/5 bg-black/20 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Outliers Flagged</span>
                          <p className="text-2xl font-black text-white mt-1">
                            {analysis.profile?.columns.reduce((acc, c) => {
                              const det: any = analysis.profile?.column_details?.[c];
                              return acc + (det?.outliers_count ?? 0);
                            }, 0).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="ghost" className="text-[9px] text-muted-foreground p-0 mt-3 hover:bg-transparent">IQR violations detected</Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target & Categorical Balance Check</h4>
                      <div className="space-y-3">
                        {analysis.profile?.columns.map((c) => {
                          const detail: any = analysis.profile?.column_details?.[c];
                          if (!detail || !detail.class_distribution) return null;
                          const isImbalanced = detail.is_imbalanced;

                          return (
                            <div key={c} className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-3">
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold font-mono text-white">{c}</span>
                                  {c === analysis.target_col && <Badge className="text-[8px] bg-primary/20 text-primary border-none">TARGET</Badge>}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isImbalanced
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {isImbalanced ? "Highly Imbalanced" : "Balanced Distribution"}
                                </span>
                              </div>

                              {/* Visual Segmented Progress Bar */}
                              <div className="h-2 w-full bg-black/40 rounded-full flex overflow-hidden">
                                {Object.entries(detail.class_distribution).map(([cls, pct]: any, i) => {
                                  const COLORS = ["bg-primary", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                                  const col = COLORS[i % COLORS.length];
                                  return (
                                    <div
                                      key={cls}
                                      className={`${col} h-full`}
                                      style={{ width: `${pct}%` }}
                                      title={`${cls}: ${pct}%`}
                                    />
                                  );
                                })}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                {Object.entries(detail.class_distribution).map(([cls, pct]: any, i) => {
                                  const DOT_COLORS = ["bg-primary", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                                  const dot = DOT_COLORS[i % DOT_COLORS.length];
                                  return (
                                    <div key={cls} className="p-2 bg-black/20 rounded-xl flex items-center justify-between text-[10px] font-mono">
                                      <div className="flex items-center gap-1.5 truncate pr-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                                        <span className="text-muted-foreground truncate">{cls}</span>
                                      </div>
                                      <span className="font-bold text-white">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {edaTab === "charts" && (
                  <div className="animate-fade-in">
                    <EDACharts analysis={analysis} />
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: Preprocessing ── */}
            {currentStep === 5 && (
              <Step5Preprocessing analysis={analysis} results={results} running={running} runModels={runModels} />
            )}

            {/* ── STEP 6: Feature Engineering ── */}
            {currentStep === 6 && (
              <div className="space-y-6">
                {isStepLocked(6) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to unlock Feature Engineering logs.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Visual Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {((results as any)?.feature_engineering_logs || []).some((l: string) => l.toLowerCase().includes("date")) && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-white">Datetime Features Extracted</h5>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Splits date variables into year, month, and day components automatically.
                            </p>
                          </div>
                        </div>
                      )}

                      {((results as any)?.feature_engineering_logs || []).some((l: string) => l.toLowerCase().includes("interaction term")) && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                          <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-white">Interaction Terms Synthesized</h5>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Multiplies highest variance features together to expose non-linear relationships.
                            </p>
                          </div>
                        </div>
                      )}

                      {((results as any)?.feature_engineering_logs || []).some((l: string) => l.toLowerCase().includes("collinear")) && (
                        <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl flex items-start gap-3">
                          <Layers className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-white">Numeric Pruning</h5>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Drops highly collinear variables with correlation coefficients above 0.85 to reduce redundancy.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {!((results as any)?.feature_engineering_logs || []).some((l: string) => l.match(/date|interaction|collinear/i)) && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3 col-span-1 sm:col-span-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-bold text-white">Optimal Feature Set Detected</h5>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              The current dataset features were determined to be optimal. No automated engineering or pruning was required.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feature Creation & Selection Logs</h4>
                      <div className="p-4 bg-black/40 border border-white/5 rounded-2xl font-mono text-[11px] leading-relaxed max-h-[220px] overflow-y-auto space-y-2 text-muted-foreground">
                        {results?.models && (results as any).feature_engineering_logs?.map((log: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-violet-400 font-bold">[⚡]</span>
                            <span>{log}</span>
                          </div>
                        ))}
                        {(!results?.models || !(results as any).feature_engineering_logs?.length) && (
                          <p className="italic text-muted-foreground text-xs">No collinear prunings required. Data integrity checks clear.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 7: Data Splitting ── */}
            {currentStep === 7 && (
              <div className="space-y-6">
                {isStepLocked(7) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to unlock partitioning values.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Disjoint Data Partitioning</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The raw dataset is split into training (folds and fitting), validation (hyperparameters comparison), and test (final verification) segments.
                      </p>
                    </div>

                    {/* Horizontal Visual Segmentation bar */}
                    <div className="h-6 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-black text-center text-white select-none">
                      <div className="bg-blue-500 flex items-center justify-center" style={{ width: "70%" }}>
                        TRAIN (70%)
                      </div>
                      <div className="bg-amber-500 flex items-center justify-center" style={{ width: "15%" }}>
                        VAL (15%)
                      </div>
                      <div className="bg-purple-500 flex items-center justify-center" style={{ width: "15%" }}>
                        TEST (15%)
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-center shadow-lg">
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Training Segment</span>
                        <p className="text-2xl font-black text-white mt-1">{(results as any).split_info?.train_size?.toLocaleString() ?? "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Parameters adjustment</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center shadow-lg">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Validation Segment</span>
                        <p className="text-2xl font-black text-white mt-1">{(results as any).split_info?.val_size?.toLocaleString() ?? "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Epoch comparison</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-center shadow-lg">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Unseen Test Segment</span>
                        <p className="text-2xl font-black text-white mt-1">{(results as any).split_info?.test_size?.toLocaleString() ?? "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Generalization metrics</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 8: Model Competition ── */}
            {currentStep === 8 && (
              <Step8ModelCompetition
                analysis={analysis}
                results={results}
                running={running}
                runModels={runModels}
              />
            )}

            {/* ── STEP 9: K-Fold Validation ── */}
            {currentStep === 9 && (
              <div className="space-y-6">
                {isStepLocked(9) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to unlock K-Fold details.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/10 border border-white/5 rounded-2xl space-y-1">
                      <h4 className="font-bold text-xs text-white">5-Fold Robustness Checks</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Splits training partition into 5 subsets, training on 4 and verifying on 1 iteratively. Low standard deviation verifies learning robustness and guards against overfitting.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {results?.models?.map((model: any, idx: number) => {
                        const meanScore = (model.cv_mean * 100).toFixed(2);
                        const stdDev = (model.cv_std * 100).toFixed(2);
                        
                        return (
                          <div key={idx} className="p-4 bg-black/20 border border-white/5 hover:border-white/10 transition rounded-2xl flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-bold text-white block">{model.name}</span>
                              <span className="text-[10px] text-muted-foreground block mt-0.5">5-Fold iterations completed</span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-primary font-mono block">
                                Mean: {meanScore}%
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">
                                Variance (σ): ±{stdDev}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 10: Evaluation ── */}
            {currentStep === 10 && (
              <div className="space-y-6">
                {isStepLocked(10) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to view model evaluations.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Feature Importances Grid */}
                    {results?.models?.[0]?.feature_importances && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Winning Weights & Importances</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(results.models[0].feature_importances).slice(0, 6).map(([feat, val]) => (
                            <div key={feat} className="p-3 bg-black/20 border border-white/5 rounded-2xl space-y-1.5 hover:border-white/10 transition">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-white truncate max-w-[150px]">{feat}</span>
                                <span className="font-bold text-primary">{(val * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="bg-primary h-full rounded-full" 
                                  style={{ width: `${val * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highly Styled Confusion Matrix */}
                    {activeProblemType === "classification" && results?.models?.[0]?.confusion_matrix && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confusion Matrix Hits</h4>
                        <div className="overflow-x-auto pb-2">
                          <div 
                            className="grid gap-2 min-w-max mx-auto" 
                            style={{ gridTemplateColumns: `auto repeat(${results.models[0].confusion_matrix.length}, minmax(40px, 1fr))` }}
                          >
                            {/* Empty top-left cell */}
                            <div className="text-[9px] text-muted-foreground/50 flex items-end justify-end pr-2 pb-1">Actual \ Pred</div>
                            {/* Column headers (Predicted) */}
                            {results.models[0].confusion_matrix.map((_, i) => (
                              <div key={`col-${i}`} className="text-[10px] text-muted-foreground text-center font-bold truncate px-1 flex items-end justify-center pb-1" title={String(results.classes?.[i] ?? i)}>
                                {String(results.classes?.[i] ?? i).substring(0, 6)}
                              </div>
                            ))}
                            
                            {/* Rows */}
                            {results.models[0].confusion_matrix.map((row, rIdx) => (
                              <div key={`row-${rIdx}`} className="contents">
                                {/* Row header (Actual) */}
                                <div className="text-[10px] text-muted-foreground flex items-center justify-end pr-2 font-bold truncate" title={String(results.classes?.[rIdx] ?? rIdx)}>
                                  {String(results.classes?.[rIdx] ?? rIdx).substring(0, 6)}
                                </div>
                                {/* Cells */}
                                {row.map((val: number, cIdx: number) => {
                                  const isHit = rIdx === cIdx;
                                  return (
                                    <div 
                                      key={`${rIdx}-${cIdx}`} 
                                      className={`p-2 sm:p-3 rounded-xl border text-center transition duration-300 hover:scale-[1.05] flex flex-col justify-center items-center ${
                                        isHit 
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.05)]" 
                                          : val > 0 
                                            ? "bg-rose-500/10 border-rose-500/20 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                                            : "bg-white/5 border-white/5 text-white/30"
                                      }`}
                                      title={`Actual: ${results.classes?.[rIdx] ?? rIdx} → Predicted: ${results.classes?.[cIdx] ?? cIdx} (${val} hits)`}
                                    >
                                      {results?.models?.[0]?.confusion_matrix && results.models[0].confusion_matrix.length <= 2 && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                                          {isHit ? "True" : "False"}
                                        </span>
                                      )}
                                      <span className={`${(results?.models?.[0]?.confusion_matrix?.length ?? 0) <= 2 ? 'text-xl' : 'text-sm'} font-black font-mono`}>
                                        {val}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 11: Final Conclusion ── */}
            {currentStep === 11 && (
              <div className="space-y-6">
                {isStepLocked(11) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to compile report.</p>
                ) : loadingConclusion ? (
                  <div className="text-center py-12 bg-black/10 rounded-2xl border border-white/5">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Compiling technical brief & business strategies...</p>
                  </div>
                ) : conclusion ? (
                  <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-15">
                        <Sparkles className="w-16 h-16 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Executive summary</h4>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {formatInsightText(conclusion.executive_summary)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/15 border border-white/5 rounded-2xl space-y-1.5 hover:border-white/10 transition">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                          Preprocessing Brief
                        </h5>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{formatInsightText(conclusion.preprocessing_summary)}</p>
                      </div>

                      <div className="p-4 bg-muted/15 border border-white/5 rounded-2xl space-y-1.5 hover:border-white/10 transition">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-primary shrink-0" />
                          Model Performance
                        </h5>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{formatInsightText(conclusion.model_performance_summary)}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 relative overflow-hidden">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Business Impact & Strategies</h5>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{formatInsightText(conclusion.business_impact)}</p>
                    </div>

                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2">
                      <h5 className="text-xs font-bold text-white">Narrative Conclusion</h5>
                      <p className="text-xs leading-relaxed text-muted-foreground italic">"{formatInsightText(conclusion.overall_conclusion)}"</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Failed to assemble final conclusion.</p>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Control Stepper Buttons ── */}
        <div className="flex justify-between items-center px-1">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="gap-2 border-white/8 text-xs h-10 px-5 rounded-xl hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Previous Step
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentStep === 11 || isStepLocked(currentStep + 1)}
            className="gap-2 text-xs h-10 px-5 rounded-xl transition"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
