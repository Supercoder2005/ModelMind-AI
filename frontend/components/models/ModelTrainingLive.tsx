"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelResults, ModelResult } from "@/lib/api";
import {
  Trophy, Loader2, CheckCircle2, XCircle, Zap, Target, BarChart3, Clock
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API = `${BASE}/api/v1`;

interface ModelTrainingLiveProps {
  analysisId: string;
  targetCol: string | null;
  problemType: string;
  expertiseLevel: string;
  onComplete: (results: ModelResults) => void;
  onError: (msg: string) => void;
}

type LiveModelCard = ModelResult & {
  status: "training" | "done" | "error";
  errorMsg?: string;
};

const METRIC_COLORS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
];

function MetricPill({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
      <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold text-white font-mono">
        {typeof value === "number" ? (value > 1 ? value.toFixed(2) : (value * 100).toFixed(1) + "%") : value}
      </span>
    </div>
  );
}

function ModelCard({ card, index, winner, problemType }: {
  card: LiveModelCard;
  index: number;
  winner: string | null;
  problemType: string;
}) {
  const isWinner = winner === card.name;
  const gradient = METRIC_COLORS[index % METRIC_COLORS.length];

  const primaryMetric = problemType === "classification"
    ? { label: "F1 Score", value: card.f1 }
    : problemType === "regression"
    ? { label: "R²", value: card.r2 }
    : { label: "Silhouette", value: card.silhouette };

  return (
    <div
      className={`relative p-4 rounded-2xl border transition-all duration-500 animate-fade-in ${
        isWinner
          ? "bg-yellow-500/8 border-yellow-500/30 shadow-lg shadow-yellow-500/10"
          : card.status === "error"
          ? "bg-rose-500/5 border-rose-500/20"
          : "bg-white/3 border-white/8 hover:border-white/15"
      }`}
    >
      {/* Status indicator + name */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          {card.status === "training" ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : card.status === "error" ? (
            <XCircle className="w-4 h-4 text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{card.name}</span>
            {isWinner && (
              <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            )}
          </div>
          <span className={`text-[10px] ${
            card.status === "training" ? "text-primary animate-pulse" :
            card.status === "error" ? "text-rose-400" : "text-emerald-400"
          }`}>
            {card.status === "training" ? "Training…" : card.status === "error" ? card.errorMsg ?? "Failed" : "Complete"}
          </span>
        </div>
        {card.training_time_s !== undefined && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" />
            {card.training_time_s.toFixed(2)}s
          </div>
        )}
      </div>

      {/* Metrics */}
      {card.status === "done" && (
        <div className="flex flex-wrap gap-2">
          {problemType === "classification" && (
            <>
              <MetricPill label="Accuracy" value={card.accuracy} />
              <MetricPill label="F1" value={card.f1} />
              <MetricPill label="Precision" value={card.precision} />
              <MetricPill label="Recall" value={card.recall} />
              {card.auc_roc !== null && card.auc_roc !== undefined && (
                <MetricPill label="AUC-ROC" value={card.auc_roc} />
              )}
            </>
          )}
          {problemType === "regression" && (
            <>
              <MetricPill label="R²" value={card.r2} />
              <MetricPill label="RMSE" value={card.rmse !== undefined ? card.rmse.toFixed(4) : undefined} />
              <MetricPill label="MAE" value={card.mae !== undefined ? card.mae.toFixed(4) : undefined} />
            </>
          )}
          {problemType === "clustering" && (
            <>
              <MetricPill label="Silhouette" value={card.silhouette} />
              <MetricPill label="DB Index" value={card.davies_bouldin !== undefined ? card.davies_bouldin?.toFixed(3) : undefined} />
            </>
          )}
        </div>
      )}

      {/* Winner highlight bar */}
      {isWinner && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-yellow-500/60 to-amber-400/60" />
      )}
    </div>
  );
}

export function ModelTrainingLive({
  analysisId,
  targetCol,
  problemType,
  expertiseLevel,
  onComplete,
  onError,
}: ModelTrainingLiveProps) {
  const [cards, setCards] = useState<LiveModelCard[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(5);
  const [winner, setWinner] = useState<string | null>(null);
  const [phase, setPhase] = useState<"connecting" | "preprocessing" | "training" | "explaining" | "done" | "error">("connecting");
  const [prepLogs, setPrepLogs] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current) return;

    const url = `${API}/models/run-stream`;
    const body = JSON.stringify({
      analysis_id: analysisId,
      expertise_level: expertiseLevel,
      target_col: targetCol,
    });

    // Use fetch for POST + SSE (EventSource only supports GET)
    let aborted = false;

    async function startStream() {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: "Stream failed" }));
          onError(err.detail ?? "Model training failed");
          setPhase("error");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) { onError("No response stream"); return; }

        const decoder = new TextDecoder();
        let buffer = "";

        setPhase("preprocessing");

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "message";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const rawData = line.slice(6).trim();
              try {
                const data = JSON.parse(rawData);

                if (currentEvent === "preprocessing_done") {
                  setPrepLogs(data.preprocessing_logs ?? []);
                  setPhase("training");
                }

                if (currentEvent === "model_done") {
                  const modelData = data.model as ModelResult;
                  setProgress(data.progress ?? 0);
                  setTotal(data.total ?? 5);
                  setCards(prev => {
                    const idx = prev.findIndex(c => c.name === modelData.name);
                    const newCard: LiveModelCard = { ...modelData, status: "done" };
                    if (idx >= 0) {
                      const updated = [...prev];
                      updated[idx] = newCard;
                      return updated;
                    }
                    return [...prev, newCard];
                  });
                }

                if (currentEvent === "model_error") {
                  setProgress(data.progress ?? 0);
                  setCards(prev => [
                    ...prev,
                    { name: data.name, status: "error", errorMsg: data.error, training_time_s: 0 } as LiveModelCard,
                  ]);
                }

                if (currentEvent === "done") {
                  setWinner(data.winner);
                  setPhase("explaining");
                }

                if (currentEvent === "enriched") {
                  completedRef.current = true;
                  setPhase("done");
                  setWinner(data.winner);
                  onComplete(data as ModelResults);
                }

                if (currentEvent === "error") {
                  onError(data.message ?? "Training failed");
                  setPhase("error");
                  aborted = true;
                }
              } catch {
                // malformed JSON line — ignore
              }
              currentEvent = "message";
            }
          }
        }
      } catch (e: unknown) {
        if (!aborted) {
          onError(e instanceof Error ? e.message : "Stream connection failed");
          setPhase("error");
        }
      }
    }

    startStream();

    return () => {
      aborted = true;
      esRef.current?.close();
    };
  }, [analysisId]);

  const phaseLabels: Record<string, string> = {
    connecting: "Connecting to ML engine…",
    preprocessing: "Running preprocessing pipeline…",
    training: `Training models (${progress}/${total})`,
    explaining: "Generating AI explanation…",
    done: "All done!",
    error: "An error occurred",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Phase indicator */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          phase === "done" ? "bg-emerald-500/20" :
          phase === "error" ? "bg-rose-500/20" :
          "bg-primary/20"
        }`}>
          {phase === "done" ? <Trophy className="w-4 h-4 text-emerald-400" /> :
           phase === "error" ? <XCircle className="w-4 h-4 text-rose-400" /> :
           <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{phaseLabels[phase]}</p>
          {phase === "training" && (
            <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, (progress / total) * 100)}%` }}
              />
            </div>
          )}
          {phase === "explaining" && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Getting AI insights on model performance…</p>
          )}
        </div>
        {winner && phase !== "done" && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-semibold">
            <Trophy className="w-3 h-3" />
            Leading: {winner}
          </div>
        )}
      </div>

      {/* Preprocessing logs */}
      {prepLogs.length > 0 && (
        <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 max-h-24 overflow-y-auto">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-2">Preprocessing Applied</p>
          {prepLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-white/60">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Model cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Placeholder cards for models still training */}
        {Array.from({ length: Math.max(0, total - cards.length) }).map((_, i) => (
          <div key={`pending-${i}`} className="p-4 rounded-2xl border border-white/5 bg-white/2 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-white/8 rounded w-32" />
                <div className="h-2 bg-white/5 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
        {cards.map((card, i) => (
          <ModelCard
            key={card.name}
            card={card}
            index={i}
            winner={winner}
            problemType={problemType}
          />
        ))}
      </div>

      {phase === "done" && winner && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-500/8 border border-yellow-500/20 animate-fade-in">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-sm font-bold text-yellow-300">Winner: {winner}</p>
            <p className="text-[10px] text-yellow-400/70">Model saved for What-If analysis. Results loaded below.</p>
          </div>
        </div>
      )}
    </div>
  );
}
