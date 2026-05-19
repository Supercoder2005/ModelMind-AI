"use client";

import { useEffect, useState } from "react";
import { api, type Explanation, type NextStep } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, RefreshCw, ArrowRight, AlertTriangle, TrendingUp } from "lucide-react";

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">AI Explanation</h2>
          <Badge className={`text-[10px] border ${EXPERTISE_COLORS[expertiseLevel]}`}>
            {expertiseLevel}
          </Badge>
          {cached && <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">cached</Badge>}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs border-white/15"
          onClick={handleRefresh}
          disabled={loading}
          id="refresh-explanation-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Re-explain
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-fade-in">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl shimmer" />
          ))}
        </div>
      ) : explanation ? (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <div className="glass rounded-2xl p-5 border border-white/8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm leading-relaxed">{explanation.summary}</p>
          </div>

          {/* Why winner */}
          {explanation.why_winner && (
            <div className="glass rounded-2xl p-5 border border-primary/15">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Why This Model Won</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{explanation.why_winner}</p>
            </div>
          )}

          {/* Feature Insights */}
          {explanation.feature_insights && explanation.feature_insights.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Feature Insights</p>
              <div className="space-y-3">
                {explanation.feature_insights.map((fi, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-foreground/80">{fi.feature}: </span>
                      <span className="text-xs text-muted-foreground">{fi.insight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain Interpretation */}
          {explanation.domain_interpretation && (
            <div className="glass rounded-2xl p-5 border border-accent/15">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
                Domain Interpretation {domain && `— ${domain}`}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{explanation.domain_interpretation}</p>
            </div>
          )}

          {/* Actions */}
          {explanation.actions && explanation.actions.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recommended Actions</p>
              <div className="space-y-2.5">
                {explanation.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-white/5">
                    <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Next Steps from Gemini */}
      {nextSteps && nextSteps.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Next Steps</h3>
          </div>
          <div className="space-y-2.5">
            {nextSteps.map((step, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/8 flex items-start gap-3">
                <Badge className={`text-[10px] border shrink-0 ${PRIORITY_COLORS[step.priority]}`}>
                  {step.priority}
                </Badge>
                <div>
                  <p className="text-xs font-medium mb-0.5">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
