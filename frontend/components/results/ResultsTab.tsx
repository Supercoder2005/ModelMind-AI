"use client";

import { type ModelResults, type Analysis } from "@/lib/api";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CLUSTER_COLORS = [
  "#a78bfa", "#67e8f9", "#86efac", "#fcd34d", "#f87171",
  "#c084fc", "#34d399", "#fb923c", "#60a5fa", "#e879f9",
];

const TOOLTIP_STYLE = {
  background: "oklch(0.12 0.015 270)",
  border: "1px solid oklch(1 0 0 / 8%)",
  borderRadius: "10px",
  fontSize: 12,
};

export function ResultsTab({ results, analysis }: { results: ModelResults; analysis: Analysis }) {
  const pt = results.problem_type;

  return (
    <div className="space-y-5">
      {pt === "classification" && <ClassificationResults results={results} />}
      {pt === "regression" && <RegressionResults results={results} />}
      {pt === "clustering" && <ClusteringResults results={results} />}
      {(pt === "timeseries" || pt === "time-series") && <TimeSeriesResults results={results} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function ClassificationResults({ results }: { results: ModelResults }) {
  const winner = results.models.find((m) => m.name === results.winner);
  const cm = winner?.confusion_matrix;
  const fi = winner?.feature_importances;

  return (
    <div className="space-y-5">
      {/* Confusion Matrix */}
      {cm && (
        <Card className="bg-card/60 border-white/8 animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Confusion Matrix — {results.winner}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="mx-auto text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-muted-foreground text-xs font-normal" />
                    {cm[0].map((_, j) => (
                      <th key={j} className="px-3 py-2 text-muted-foreground text-xs font-normal">Pred {j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cm.map((row, i) => {
                    const rowMax = Math.max(...row);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-muted-foreground text-xs">True {i}</td>
                        {row.map((val, j) => {
                          const intensity = rowMax > 0 ? val / rowMax : 0;
                          const isDiag = i === j;
                          return (
                            <td key={j} className="px-2 py-1.5">
                              <div
                                className="w-14 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                                style={{
                                  background: isDiag
                                    ? `oklch(0.72 0.2 280 / ${0.2 + intensity * 0.6})`
                                    : `oklch(0.65 0.22 25 / ${intensity * 0.5})`,
                                  border: isDiag ? "1px solid oklch(0.72 0.2 280 / 40%)" : "1px solid transparent",
                                }}
                              >
                                {val}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Diagonal = correct predictions. Off-diagonal = misclassifications.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature Importance */}
      {fi && Object.keys(fi).length > 0 && (
        <FeatureImportanceChart fi={fi} modelName={results.winner} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regression
// ---------------------------------------------------------------------------

function RegressionResults({ results }: { results: ModelResults }) {
  const winner = results.models.find((m) => m.name === results.winner);
  const yTest = winner?.y_test ?? [];
  const yPred = winner?.y_pred ?? [];
  const fi = winner?.feature_importances;

  const scatterData = yTest.slice(0, 200).map((actual, i) => ({
    actual,
    predicted: yPred[i] ?? 0,
  }));

  const residualData = scatterData.map((d, i) => ({
    i,
    residual: d.predicted - d.actual,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
        <Card className="bg-card/60 border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actual vs Predicted</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="actual" name="Actual" tick={{ fontSize: 10 }} tickLine={false} label={{ value: "Actual", position: "insideBottom", offset: -5, fontSize: 11 }} />
                <YAxis dataKey="predicted" name="Predicted" tick={{ fontSize: 10 }} tickLine={false} label={{ value: "Predicted", angle: -90, position: "insideLeft", offset: 15, fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="oklch(0.72 0.2 280)" fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Residuals</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="i" name="Sample" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis dataKey="residual" name="Residual" tick={{ fontSize: 10 }} tickLine={false} />
                <ReferenceLine y={0} stroke="oklch(0.65 0.22 195)" strokeDasharray="4 2" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Scatter data={residualData} fill="oklch(0.65 0.22 195)" fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {fi && Object.keys(fi).length > 0 && <FeatureImportanceChart fi={fi} modelName={results.winner} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

function ClusteringResults({ results }: { results: ModelResults }) {
  const scatter = results.scatter_data ?? [];
  const personas = results.cluster_personas ?? [];

  // Count per cluster
  const clusterCounts: Record<number, number> = {};
  scatter.forEach((d) => { clusterCounts[d.cluster] = (clusterCounts[d.cluster] ?? 0) + 1; });
  const pieData = Object.entries(clusterCounts).map(([k, v]) => ({ name: `Cluster ${k}`, value: v }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
        {/* PCA Scatter */}
        <Card className="bg-card/60 border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cluster Visualization (PCA 2D)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="x" name="PC1" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis dataKey="y" name="PC2" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                {Object.keys(clusterCounts).map((k) => (
                  <Scatter
                    key={k}
                    name={`Cluster ${k}`}
                    data={scatter.filter((d) => String(d.cluster) === k)}
                    fill={CLUSTER_COLORS[Number(k) % CLUSTER_COLORS.length]}
                    fillOpacity={0.7}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cluster Sizes Pie */}
        <Card className="bg-card/60 border-white/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cluster Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Persona Cards */}
      {personas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            ✨ AI Cluster Personas
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Gemini Named</Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p) => (
              <div
                key={p.id}
                className="glass rounded-2xl p-4 border transition-all hover:-translate-y-1"
                style={{ borderColor: `${p.color}40` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground italic mt-0.5">"{p.tagline}"</p>
                  </div>
                  <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: p.color }} />
                </div>
                <div className="space-y-1 mb-3">
                  {p.characteristics.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="text-foreground/50">•</span>{c}
                    </div>
                  ))}
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-white/5 text-xs text-muted-foreground">
                  <strong className="text-foreground/70">Action:</strong> {p.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time Series
// ---------------------------------------------------------------------------

function TimeSeriesResults({ results }: { results: ModelResults }) {
  const forecast = results.forecast_data ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="bg-card/60 border-white/8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Forecast vs Actual — {results.winner}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecast} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.72 0.2 280)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.72 0.2 280)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.22 195)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.22 195)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="index" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="actual" stroke="oklch(0.72 0.2 280)" fill="url(#actualGrad)" strokeWidth={2} name="Actual" dot={false} />
              <Area type="monotone" dataKey="predicted" stroke="oklch(0.65 0.22 195)" fill="url(#predGrad)" strokeWidth={2} strokeDasharray="5 3" name="Forecast" dot={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: Feature Importance
// ---------------------------------------------------------------------------

function FeatureImportanceChart({ fi, modelName }: { fi: Record<string, number>; modelName: string }) {
  const data = Object.entries(fi)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value: +(value * 100).toFixed(2) }));

  return (
    <Card className="bg-card/60 border-white/8 animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Feature Importance — {modelName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 truncate text-right" title={d.name}>{d.name}</span>
              <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(d.value / (data[0]?.value ?? 1)) * 100}%`,
                    background: `oklch(${0.72 - i * 0.03} 0.2 ${280 - i * 8})`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">{d.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
