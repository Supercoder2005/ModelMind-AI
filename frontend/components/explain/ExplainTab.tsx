"use client";

import { useEffect, useState } from "react";
import { api, type Explanation, type NextStep } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lightbulb, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle, 
  TrendingUp, 
  Trophy, 
  Compass, 
  Briefcase, 
  ListTodo, 
  Sparkles 
} from "lucide-react";

const EXPERTISE_COLORS: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-300 border-green-500/30",
  learner: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  practitioner: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  expert: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-green-500/20 text-green-300 border-green-500/30",
};

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

export function ExplainTab({
  analysisId,
  domain,
  initialExplanation,
  nextSteps,
}: {
  analysisId: string;
  domain: string | null;
  initialExplanation?: Explanation;
  nextSteps?: NextStep[];
}) {
  const { expertiseLevel } = useStore();
  const [explanation, setExplanation] = useState<Explanation | null>(initialExplanation ?? null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch when expertise level changes
  useEffect(() => {
    if (!analysisId) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.explain({ analysis_id: analysisId, expertise_level: expertiseLevel });
        setExplanation(res.explanation);
        setCached(res.cached);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to get explanation");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [expertiseLevel, analysisId]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.explain({ analysis_id: analysisId, expertise_level: expertiseLevel, force_refresh: true });
      setExplanation(res.explanation);
      setCached(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass border border-white/8 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              AI Explanation Dashboard
              <Badge className={`text-[10px] border px-2 py-0.5 ${EXPERTISE_COLORS[expertiseLevel]}`}>
                {expertiseLevel}
              </Badge>
              {cached && <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground bg-white/5">cached</Badge>}
            </h2>
            <p className="text-xs text-muted-foreground">Self-explaining narratives calibrated for your preferred depth.</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs border-white/15 hover:bg-white/5 shadow-md shadow-black/20"
          onClick={handleRefresh}
          disabled={loading}
          id="refresh-explanation-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Re-explain
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-44 w-full rounded-2xl shimmer" />
            <Skeleton className="h-48 w-full rounded-2xl shimmer" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 w-full rounded-2xl shimmer" />
            <Skeleton className="h-56 w-full rounded-2xl shimmer" />
          </div>
        </div>
      ) : explanation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* LEFT COLUMN: Diagnostics & Rationale (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Summary Card */}
            <div className="glass rounded-2xl p-6 border border-white/8 relative overflow-hidden transition-all duration-300 hover:border-white/12 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Executive Summary</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                {formatInsightText(explanation.summary)}
              </p>
            </div>

            {/* 2. Why Winner Card */}
            {explanation.why_winner && (
              <div className="glass rounded-2xl p-6 border border-amber-500/15 relative overflow-hidden transition-all duration-300 hover:border-amber-500/25 hover:shadow-lg hover:shadow-amber-500/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Why This Model Won</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {formatInsightText(explanation.why_winner)}
                </p>
              </div>
            )}

            {/* 3. Recommended Actions */}
            {explanation.actions && explanation.actions.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-white/8 relative overflow-hidden transition-all duration-300 hover:border-white/12 hover:shadow-lg hover:shadow-emerald-500/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <ListTodo className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Next Actions</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {explanation.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/6 transition-colors duration-200">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Business Context & Features (1/3 width) */}
          <div className="space-y-6">
            
            {/* 4. Domain Interpretation */}
            {explanation.domain_interpretation && (
              <div className="glass rounded-2xl p-6 border border-cyan-500/15 relative overflow-hidden transition-all duration-300 hover:border-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    Domain Impact {domain && `— ${domain}`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {formatInsightText(explanation.domain_interpretation)}
                </p>
              </div>
            )}

            {/* 5. Feature Insights */}
            {explanation.feature_insights && explanation.feature_insights.length > 0 && (
              <div className="glass rounded-2xl p-6 border border-white/8 relative overflow-hidden transition-all duration-300 hover:border-white/12 hover:shadow-lg hover:shadow-violet-500/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attribute Insights</p>
                </div>
                <div className="space-y-3.5">
                  {explanation.feature_insights.map((fi, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="text-xs font-semibold text-foreground/80 font-mono">{fi.feature}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-3.5 leading-normal">{fi.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Next Steps from Gemini */}
            {nextSteps && nextSteps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1 pl-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strategic Roadmap</h3>
                </div>
                <div className="space-y-3">
                  {nextSteps.map((step, i) => (
                    <div key={i} className="glass rounded-xl p-4 border border-white/8 flex items-start gap-3 transition-colors duration-200 hover:bg-white/2">
                      <Badge className={`text-[9px] border shrink-0 font-semibold uppercase tracking-wider ${PRIORITY_COLORS[step.priority]}`}>
                        {step.priority}
                      </Badge>
                      <div>
                        <p className="text-xs font-semibold mb-0.5 text-foreground/90">{step.title}</p>
                        <p className="text-xs text-muted-foreground leading-normal">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
