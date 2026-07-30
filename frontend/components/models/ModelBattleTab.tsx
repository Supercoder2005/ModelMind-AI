"use client";

import { type ModelResults, type Analysis } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Zap } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

const COLORS = [
  "oklch(0.72 0.2 280)",
  "oklch(0.65 0.22 195)",
  "oklch(0.78 0.18 145)",
  "oklch(0.75 0.2 55)",
];

const TOOLTIP_STYLE = {
  background: "oklch(0.12 0.015 270)",
  border: "1px solid oklch(1 0 0 / 8%)",
  borderRadius: "10px",
  fontSize: 12,
};

function primaryMetricKey(problemType: string): string {
  if (problemType === "regression") return "rmse";
  if (problemType === "clustering") return "silhouette";
  if (problemType === "timeseries") return "rmse";
  return "f1";
}

export function ModelBattleTab({ results, analysis }: { results: ModelResults; analysis: Analysis }) {
  const pt = results.problem_type;
  const primaryKey = primaryMetricKey(pt);
  const models = results.models ?? [];
  const winner = results.winner;
  const explanation = results.explanation;

  // Build radar chart data
  const radarData = (() => {
    if (pt === "classification") {
      const subjects = ["Accuracy", "F1", "Precision", "Recall"];
      return subjects.map((s) => {
        const entry: Record<string, string | number> = { subject: s };
        models.forEach((m) => {
          const key = s.toLowerCase() as keyof typeof m;
          const val = m[key] as number | undefined;
          entry[m.name] = +((val ?? 0) * 100).toFixed(1);
        });
        return entry;
      });
    }
    if (pt === "regression") {
      const maxRMSE = Math.max(...models.map((m) => m.rmse ?? 0)) || 1;
      const subjects = ["R² Score", "Low RMSE", "Low MAE"];
      return subjects.map((s) => {
        const entry: Record<string, string | number> = { subject: s };
        models.forEach((m) => {
          if (s === "R² Score") entry[m.name] = +((m.r2 ?? 0) * 100).toFixed(1);
          else if (s === "Low RMSE") entry[m.name] = +((1 - (m.rmse ?? 0) / maxRMSE) * 100).toFixed(1);
          else entry[m.name] = +((1 - (m.mae ?? 0) / maxRMSE) * 100).toFixed(1);
        });
        return entry;
      });
    }
    if (pt === "clustering") {
      return [{ subject: "Silhouette" }, { subject: "Speed" }].map((s) => {
        const entry: Record<string, string | number> = { subject: s.subject };
        models.forEach((m) => {
          if (s.subject === "Silhouette") entry[m.name] = +((m.silhouette ?? 0) * 100).toFixed(1);
          else entry[m.name] = +(100 - (m.training_time_s ?? 0) * 10).toFixed(1);
        });
        return entry;
      });
    }
    return [];
  })();

  // Training time chart
  const timeData = models.map((m) => ({
    name: m.name.split(" ")[0],
    time: m.training_time_s,
    isWinner: m.name === winner,
  }));

  return (
    <div className="space-y-5">
      {/* Comparison Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Model Comparison</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All models trained on 70/15/15 split in parallel</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Model</th>
                {pt === "classification" && (
                  <>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Accuracy</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">F1</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Precision</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Recall</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">AUC-ROC</th>
                  </>
                )}
                {pt === "regression" && (
                  <>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">RMSE</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">MAE</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">R²</th>
                  </>
                )}
                {pt === "clustering" && (
                  <>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Silhouette</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Davies-Bouldin</th>
                  </>
                )}
                {pt === "timeseries" && (
                  <>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">RMSE</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">MAE</th>
                  </>
                )}
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Time (s)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => {
                const isWinner = m.name === winner;
                return (
                  <tr
                    key={m.name}
                    className={`border-b border-white/5 transition-colors ${isWinner ? "bg-primary/8" : "hover:bg-white/3"}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isWinner && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                        <span className={isWinner ? "font-semibold text-primary" : "text-white/90"}>{m.name}</span>
                        {isWinner && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-1.5 py-0">Winner</Badge>}
                      </div>
                    </td>
                    {pt === "classification" && (
                      <>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{pct(m.accuracy)}</td>
                        <td className="text-right px-4 py-3 tabular-nums font-semibold text-white">{pct(m.f1)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{pct(m.precision)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{pct(m.recall)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.auc_roc != null ? m.auc_roc.toFixed(3) : "–"}</td>
                      </>
                    )}
                    {pt === "regression" && (
                      <>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.rmse?.toFixed(4)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.mae?.toFixed(4)}</td>
                        <td className="text-right px-4 py-3 tabular-nums font-semibold text-white">{m.r2?.toFixed(4)}</td>
                      </>
                    )}
                    {pt === "clustering" && (
                      <>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.silhouette?.toFixed(4)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.davies_bouldin?.toFixed(4) ?? "–"}</td>
                      </>
                    )}
                    {pt === "timeseries" && (
                      <>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.rmse?.toFixed(4)}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-white/80">{m.mae?.toFixed(4)}</td>
                      </>
                    )}
                    <td className="text-right px-4 py-3 tabular-nums text-white/60">{m.training_time_s?.toFixed(2)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
        {/* Radar */}
        {radarData.length > 0 && (
          <Card className="bg-card/60 border-white/8">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Multi-Metric Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(1 0 0 / 8%)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "oklch(0.6 0.015 240)" }} />
                  {models.map((m, i) => (
                    <Radar
                      key={m.name}
                      name={m.name}
                      dataKey={m.name}
                      stroke={COLORS[i % COLORS.length]}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={m.name === winner ? 0.25 : 0.08}
                      strokeWidth={m.name === winner ? 2 : 1}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Training Time */}
        <Card className="bg-card/60 border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Training Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} stroke="oklch(1 0 0 / 5%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} tickLine={false} axisLine={false} unit="s" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                  {timeData.map((entry, i) => (
                    <Cell key={i} fill={entry.isWinner ? COLORS[0] : "oklch(0.25 0.02 270)"} fillOpacity={entry.isWinner ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gemini explanation */}
      {explanation && (
        <div className="glass rounded-2xl p-5 border border-primary/15 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Why {winner} Won</h3>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">AI Analysis</Badge>
          </div>
          <p className="text-sm text-white/80 leading-relaxed mb-3">{explanation.why_winner}</p>
          {explanation.tradeoffs && (
            <div className="p-3 rounded-lg bg-muted/30 border border-white/8">
              <p className="text-xs font-semibold text-white/70 mb-1">When to use the runner-up instead:</p>
              <p className="text-xs text-white/60 leading-relaxed">{explanation.tradeoffs}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function pct(val: number | undefined): string {
  if (val == null) return "–";
  return `${(val * 100).toFixed(1)}%`;
}
