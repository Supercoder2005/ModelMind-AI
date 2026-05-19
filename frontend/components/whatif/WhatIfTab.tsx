"use client";

import { useState } from "react";
import { api, type Analysis, type ModelResults } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, RefreshCw, AlertTriangle } from "lucide-react";

export function WhatIfTab({ analysis, results }: { analysis: Analysis; results: ModelResults }) {
  const profile = analysis.profile;
  const columnMeta = profile?.column_details ?? {};
  const featureNames = results.feature_names ?? Object.keys(columnMeta).filter((c) => c !== analysis.target_col);

  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const init: Record<string, string | number> = {};
    featureNames.forEach((col) => {
      const d = columnMeta[col];
      if (!d) return;
      if ((d as { mean?: number }).mean !== undefined) {
        init[col] = (d as { mean: number }).mean ?? 0;
      } else {
        const topVals = Object.keys((d as { top_values?: Record<string, number> }).top_values ?? {});
        init[col] = topVals[0] ?? "";
      }
    });
    return init;
  });

  const [predResult, setPredResult] = useState<{
    prediction: number | string;
    probabilities?: { class: string; probability: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.whatIfPredict({ analysis_id: analysis.id, input_values: values });
      setPredResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const setValue = (col: string, val: string) => {
    const d = columnMeta[col];
    if ((d as { mean?: number }).mean !== undefined) {
      setValues((prev) => ({ ...prev, [col]: parseFloat(val) || 0 }));
    } else {
      setValues((prev) => ({ ...prev, [col]: val }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">What-If Simulator</h2>
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
          {results.winner}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Adjust feature values and click Predict to get a live inference from the winning model — no retraining needed.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {featureNames.slice(0, 18).map((col) => {
          const d = columnMeta[col];
          const isNumeric = d && (d as { mean?: number }).mean !== undefined;
          const topVals = isNumeric ? [] : Object.keys((d as { top_values?: Record<string, number> } | undefined)?.top_values ?? {});
          const { min, max } = (d as { min?: number; max?: number }) ?? {};

          return (
            <div key={col} className="space-y-1">
              <label className="text-xs text-muted-foreground truncate block" title={col}>{col}</label>
              {isNumeric ? (
                <input
                  type="number"
                  value={values[col] as number}
                  min={min ?? undefined}
                  max={max ?? undefined}
                  step={(max != null && min != null) ? ((max - min) / 100) : "any"}
                  onChange={(e) => setValue(col, e.target.value)}
                  className="w-full h-8 px-3 rounded-lg bg-muted/50 border border-white/10 text-xs focus:outline-none focus:border-primary/40 transition-colors"
                  id={`whatif-input-${col}`}
                />
              ) : (
                <select
                  value={values[col] as string}
                  onChange={(e) => setValue(col, e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-muted/50 border border-white/10 text-xs focus:outline-none focus:border-primary/40 transition-colors"
                  id={`whatif-select-${col}`}
                >
                  {topVals.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm"
        onClick={handlePredict}
        disabled={loading}
        id="whatif-predict-btn"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? "Predicting..." : "Predict"}
      </Button>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {predResult && (
        <div className="glass rounded-2xl p-5 border border-primary/20 animate-fade-in">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Prediction Result</p>

          {/* Regression or simple classification */}
          {analysis.problem_type !== "classification" || !predResult.probabilities ? (
            <div className="text-center py-4">
              <p className="text-4xl font-bold gradient-text mb-1">
                {typeof predResult.prediction === "number"
                  ? predResult.prediction.toFixed(4)
                  : predResult.prediction}
              </p>
              <p className="text-xs text-muted-foreground">Predicted {analysis.target_col}</p>
            </div>
          ) : (
            /* Classification probabilities */
            <div className="space-y-2.5">
              {predResult.probabilities
                .sort((a, b) => b.probability - a.probability)
                .map((p, i) => (
                  <div key={p.class}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium flex items-center gap-2">
                        {i === 0 && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Top</Badge>}
                        {p.class}
                      </span>
                      <span className="text-xs font-mono tabular-nums">{(p.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${p.probability * 100}%`,
                          background: i === 0 ? "oklch(0.72 0.2 280)" : "oklch(0.4 0.05 270)",
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
