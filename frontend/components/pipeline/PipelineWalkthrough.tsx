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
  RefreshCw, Play, Trophy
} from "lucide-react";

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
    return stepNum >= 5 && !results && !running;
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

                {/* Simulated Terminal Window for Data Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Terminal Feed</h4>
                  <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="bg-black/50 px-4 py-2 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">feed: df.head(3)</span>
                    </div>
                    <div className="p-3 bg-black/70 overflow-x-auto">
                      <table className="w-full text-[10px] text-left text-muted-foreground font-mono">
                        <thead>
                          <tr className="border-b border-white/10 pb-1 text-white">
                            {analysis.profile?.columns.slice(0, 5).map((c, i) => (
                              <th key={i} className="py-2 pr-3 font-semibold">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.profile?.sample_rows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                              {analysis.profile?.columns.slice(0, 5).map((col, j) => (
                                <td key={j} className="py-2 pr-3 max-w-[120px] truncate">{row[col] ?? "null"}</td>
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

            {/* ── STEP 4: EDA Profile ── */}
            {currentStep === 4 && (
              <div className="space-y-6">
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

            {/* ── STEP 5: Preprocessing ── */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {isStepLocked(5) ? (
                  <div className="text-center py-12 bg-black/20 rounded-3xl border border-white/5 p-6 space-y-4">
                    <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                    <h4 className="font-bold text-sm text-white">Auto Preprocessing Blocked</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Ingestion checks are complete. Run models to perform imputation, categorization, scaling, and training.
                    </p>
                    <Button 
                      onClick={runModels} 
                      disabled={running} 
                      className="gap-2 px-6"
                    >
                      {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Start ML Pipeline
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Flow Diagram */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline Flowchart</span>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-4 bg-muted/10 border border-white/5 rounded-2xl text-xs font-semibold">
                        <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-muted-foreground">Raw Data</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90 sm:rotate-0" />
                        <div className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary">Null Imputation</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90 sm:rotate-0" />
                        <div className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300">Target Encoding</div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90 sm:rotate-0" />
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">MinMax Scaling</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preprocessing Operations Logs</h4>
                      <div className="p-4 bg-black/40 border border-white/5 rounded-2xl font-mono text-[11px] leading-relaxed max-h-[220px] overflow-y-auto space-y-2 text-muted-foreground">
                        {results?.models && (results as any).preprocessing_logs?.map((log: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-primary font-bold">[✔️]</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-white">Datetime Features Extracted</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            Splits date variables into year, month, and day components automatically.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl flex items-start gap-3">
                        <Layers className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-white">Numeric Pruning</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            Drops highly collinear variables with correlation coefficients above 0.85.
                          </p>
                        </div>
                      </div>
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
              <div className="space-y-6">
                {isStepLocked(8) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Run Model Competition to review model leaderboard.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center gap-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Competitors Leaderboard</h4>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex gap-1 items-center px-3 py-1 font-bold text-[10px]">
                        <Trophy className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
                        Winner: {results?.winner}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {results?.models?.map((model, idx) => {
                        const isWinner = idx === 0;
                        const scoreLabel = activeProblemType === "classification" 
                          ? "F1-Score" 
                          : activeProblemType === "regression" 
                            ? "R² Coeff" 
                            : "Silhouette";
                        const scoreVal = activeProblemType === "classification" 
                          ? (model.f1! * 100).toFixed(2) + "%"
                          : activeProblemType === "regression" 
                            ? (model.r2! * 100).toFixed(2) + "%"
                            : model.silhouette?.toFixed(4);

                        const relativePct = activeProblemType === "classification" 
                          ? (model.f1! * 100) 
                          : activeProblemType === "regression" 
                            ? Math.max(0, model.r2! * 100) 
                            : (model.silhouette! + 1) * 50;

                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isWinner 
                                ? "bg-primary/10 border-primary/30 shadow-lg" 
                                : "bg-black/20 border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shrink-0">
                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-white">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">Fit time: {model.training_time_s}s</span>
                              </div>
                            </div>

                            <div className="w-full sm:w-[250px] space-y-1 shrink-0">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground uppercase font-bold tracking-wider">{scoreLabel}</span>
                                <span className="text-white font-bold font-mono">{scoreVal}</span>
                              </div>
                              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full rounded-full ${isWinner ? 'bg-primary' : 'bg-muted-foreground'}`} 
                                  style={{ width: `${relativePct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                          {results.models[0].confusion_matrix.map((row, rIdx) => 
                            row.map((val, cIdx) => {
                              const isHit = rIdx === cIdx;
                              return (
                                <div 
                                  key={`${rIdx}-${cIdx}`} 
                                  className={`p-4 rounded-2xl border text-center shadow-lg transition duration-300 hover:scale-[1.01] ${
                                    isHit 
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                                      : "bg-rose-500/10 border-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
                                  }`}
                                >
                                  <span className="text-[9px] font-bold uppercase tracking-widest block opacity-70">
                                    {isHit ? "True Hit" : "False Hit"}
                                  </span>
                                  <span className="text-xl font-black font-mono block mt-1">{val}</span>
                                </div>
                              );
                            })
                          )}
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
