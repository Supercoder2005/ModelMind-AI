"use client";

import { type Analysis } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Database, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const COLORS = [
  "oklch(0.72 0.2 280)",
  "oklch(0.65 0.22 195)",
  "oklch(0.78 0.18 145)",
  "oklch(0.75 0.2 55)",
  "oklch(0.68 0.22 350)",
];

export function OverviewTab({ analysis }: { analysis: Analysis }) {
  const { eda_result: eda, profile } = analysis;

  return (
    <div className="space-y-5">
      {/* EDA Narrator Card */}
      {eda && (
        <div className="gradient-border p-5 animate-fade-in">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Auto EDA Narrator</h2>
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {eda.confidence} confidence
              </Badge>
            </div>
            <div className="flex gap-1.5">
              <Badge className="text-xs bg-violet-500/20 text-violet-300 border-violet-500/30">
                {eda.problem_type}
              </Badge>
              <Badge className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                {eda.domain_guess}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{eda.narrative}</p>
          {eda.observations && eda.observations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Key Observations</p>
              <ul className="space-y-1.5">
                {eda.observations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Dataset Stats */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: "Rows", value: profile.shape.rows.toLocaleString(), icon: "📊" },
            { label: "Columns", value: profile.shape.cols, icon: "📋" },
            { label: "Missing %", value: `${_avgMissing(profile)}%`, icon: "⚠️" },
            { label: "Duplicates", value: profile.duplicate_rows, icon: "🔁" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 border border-white/8 text-center">
              <p className="text-xl mb-1">{stat.icon}</p>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Column Charts Grid */}
      {profile && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            Column Distributions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(profile.column_details)
              .slice(0, 9)
              .map(([col, detail], i) => (
                <ColumnChart key={col} col={col} detail={detail as any} colorIndex={i % COLORS.length} />
              ))}
          </div>
        </div>
      )}

      {/* Correlation Heatmap */}
      {profile && (
        <CorrelationHeatmap profile={profile} />
      )}
    </div>
  );
}

function ColumnChart({ col, detail, colorIndex }: { col: string; detail: Record<string, unknown>; colorIndex: number }) {
  const isNumeric = (detail as { mean?: number }).mean !== undefined;

  if (!isNumeric) {
    const topValues = (detail as { top_values?: Record<string, number> }).top_values ?? {};
    const data = Object.entries(topValues).slice(0, 8).map(([k, v]) => ({ name: k, value: v }));
    return (
      <Card className="bg-card/60 border-white/8">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium truncate" title={col}>{col}</CardTitle>
          <p className="text-[10px] text-muted-foreground">categorical · {(detail as { unique_count: number }).unique_count} unique</p>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.12 0.015 270)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: "8px", fontSize: 11 }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  const d = detail as { mean: number; min: number; max: number; q25: number; q75: number; missing_pct: number; unique_count: number };
  const statsData = [
    { name: "Min", value: d.min },
    { name: "Q25", value: d.q25 },
    { name: "Mean", value: d.mean },
    { name: "Q75", value: d.q75 },
    { name: "Max", value: d.max },
  ].filter((x) => x.value != null);

  return (
    <Card className="bg-card/60 border-white/8">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium truncate" title={col}>{col}</CardTitle>
        <p className="text-[10px] text-muted-foreground">
          numeric · mean: {d.mean?.toFixed(2)} · missing: {d.missing_pct}%
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={statsData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "oklch(0.12 0.015 270)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: "8px", fontSize: 11 }} />
            <Bar dataKey="value" fill={COLORS[colorIndex]} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CorrelationHeatmap({ profile }: { profile: Analysis["profile"] }) {
  if (!profile) return null;
  const numericCols = Object.entries(profile.column_details)
    .filter(([, d]) => (d as { mean?: number }).mean !== undefined)
    .map(([col]) => col)
    .slice(0, 10);

  if (numericCols.length < 2) return null;

  return (
    <div className="glass rounded-2xl p-5 border border-white/8">
      <h3 className="text-sm font-semibold mb-3">Correlation Heatmap</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Numeric column pairwise correlations (mock — run analysis for real values).
      </p>
      <div className="overflow-x-auto">
        <table className="text-[10px] min-w-full">
          <thead>
            <tr>
              <th className="w-24" />
              {numericCols.map((c) => (
                <th key={c} className="pb-2 px-1 text-muted-foreground font-normal text-center max-w-12">
                  <span className="block truncate w-12" title={c}>{c.slice(0, 6)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numericCols.map((row) => (
              <tr key={row}>
                <td className="pr-2 text-muted-foreground truncate w-24 max-w-24" title={row}>{row.slice(0, 10)}</td>
                {numericCols.map((col) => {
                  const val = row === col ? 1 : (Math.random() * 2 - 1);
                  const intensity = Math.abs(val);
                  const hue = val > 0 ? 280 : 195;
                  return (
                    <td key={col} className="p-0.5">
                      <div
                        className="w-10 h-7 rounded flex items-center justify-center text-[9px] font-medium"
                        style={{
                          background: `oklch(${0.3 + intensity * 0.4} ${0.15 + intensity * 0.1} ${hue} / ${0.3 + intensity * 0.5})`,
                          color: intensity > 0.5 ? "white" : "oklch(0.7 0 0)",
                        }}
                        title={`${row} × ${col}`}
                      >
                        {row === col ? "1.00" : val.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        * Mock correlations for display. Real correlation matrix available in exported notebook.
      </p>
    </div>
  );
}

function _avgMissing(profile: NonNullable<Analysis["profile"]>): string {
  const vals = Object.values(profile.column_details).map((d) => (d as { missing_pct: number }).missing_pct);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
}
