"use client";

import { useMemo } from "react";
import type { Analysis } from "@/lib/api";

interface EDAChartsProps {
  analysis: Analysis;
}

// ── SVG Box Plot for a single numeric column ──
function BoxPlot({
  colName,
  detail,
  isTarget,
}: {
  colName: string;
  detail: any;
  isTarget: boolean;
}) {
  const { min, q25, q75, max, mean, outliers_count } = detail;
  let median = detail.median;
  if (median === undefined && q25 !== undefined && q75 !== undefined) {
    median = (q25 + q75) / 2; // Fallback approximation if backend didn't provide median
  }

  if (min === undefined || max === undefined || q25 === undefined || q75 === undefined || median === undefined) {
    return null;
  }

  const W = 200;
  const H = 80;
  const PAD = 20;
  const range = max - min || 1;
  const scale = (v: number) => PAD + ((v - min) / range) * (W - PAD * 2);

  const x_q25 = scale(q25);
  const x_q75 = scale(q75);
  const x_median = scale(median);
  const x_min = scale(min);
  const x_max = scale(max);
  const x_mean = mean !== undefined ? scale(mean) : null;

  const boxColor = isTarget ? "rgba(var(--primary-rgb, 139,92,246),0.25)" : "rgba(255,255,255,0.07)";
  const strokeColor = isTarget ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.25)";
  const medianColor = isTarget ? "#a78bfa" : "#06b6d4";

  return (
    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold font-mono ${isTarget ? "text-primary" : "text-white"}`}>{colName}</span>
        {outliers_count > 0 && (
          <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
            {outliers_count} outliers
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        {/* Whiskers */}
        <line x1={x_min} y1={H / 2} x2={x_q25} y2={H / 2} stroke={strokeColor} strokeWidth={1.5} strokeDasharray="3 2" />
        <line x1={x_q75} y1={H / 2} x2={x_max} y2={H / 2} stroke={strokeColor} strokeWidth={1.5} strokeDasharray="3 2" />
        {/* Min/Max caps */}
        <line x1={x_min} y1={H / 2 - 8} x2={x_min} y2={H / 2 + 8} stroke={strokeColor} strokeWidth={1.5} />
        <line x1={x_max} y1={H / 2 - 8} x2={x_max} y2={H / 2 + 8} stroke={strokeColor} strokeWidth={1.5} />
        {/* IQR Box */}
        <rect
          x={x_q25}
          y={H / 2 - 16}
          width={x_q75 - x_q25}
          height={32}
          fill={boxColor}
          stroke={strokeColor}
          strokeWidth={1.5}
          rx={3}
        />
        {/* Median line */}
        <line x1={x_median} y1={H / 2 - 16} x2={x_median} y2={H / 2 + 16} stroke={medianColor} strokeWidth={2.5} />
        {/* Mean dot */}
        {x_mean !== null && (
          <circle cx={x_mean} cy={H / 2} r={3} fill="rgba(52,211,153,0.8)" />
        )}
        {/* Labels */}
        <text x={x_min} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8}>{Number(min).toFixed(1)}</text>
        <text x={x_median} y={H - 4} textAnchor="middle" fill={medianColor} fontSize={8} fontWeight="bold">{Number(median).toFixed(1)}</text>
        <text x={x_max} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8}>{Number(max).toFixed(1)}</text>
      </svg>
      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
        <div className="text-center"><span className="text-muted-foreground block">Q1</span><span className="text-white">{Number(q25).toFixed(2)}</span></div>
        <div className="text-center"><span className="text-muted-foreground block">Median</span><span className={isTarget ? "text-primary" : "text-cyan-400"}>{Number(median).toFixed(2)}</span></div>
        <div className="text-center"><span className="text-muted-foreground block">Q3</span><span className="text-white">{Number(q75).toFixed(2)}</span></div>
        <div className="text-center"><span className="text-muted-foreground block">Mean</span><span className="text-emerald-400">{mean !== undefined ? Number(mean).toFixed(2) : "—"}</span></div>
      </div>
    </div>
  );
}

// ── Bar Chart for categorical column distributions ──
function CategoricalBar({ colName, detail, isTarget }: { colName: string; detail: any; isTarget: boolean }) {
  const dist: Record<string, number> = detail.class_distribution ?? {};
  const entries = Object.entries(dist).slice(0, 10);
  if (entries.length === 0) return null;

  const BAR_COLORS = [
    "bg-primary/70", "bg-violet-500/70", "bg-cyan-500/70",
    "bg-emerald-500/70", "bg-amber-500/70", "bg-rose-500/70",
    "bg-indigo-500/70", "bg-teal-500/70", "bg-orange-500/70", "bg-pink-500/70"
  ];

  return (
    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold font-mono ${isTarget ? "text-primary" : "text-white"}`}>{colName}</span>
        <span className="text-[9px] text-muted-foreground">{detail.unique_count ?? entries.length} unique values</span>
      </div>
      <div className="space-y-1.5">
        {entries.map(([cls, pct], i) => (
          <div key={cls} className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground font-mono w-24 truncate shrink-0" title={cls}>{cls}</span>
            <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-white/70 w-10 text-right">{Number(pct).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Correlation Matrix Heatmap ──
function CorrelationMatrix({ analysis }: { analysis: Analysis }) {
  const profile = analysis.profile;
  if (!profile) return null;

  const numericCols = profile.columns.filter((c: string) => {
    const d = profile.column_details?.[c];
    return d && d.mean !== undefined;
  });

  const sampleRows: Record<string, any>[] = profile.sample_rows ?? [];

  const correlations = useMemo(() => {
    if (numericCols.length < 2 || sampleRows.length < 3) return null;

    const corr: Record<string, Record<string, number>> = {};

    const getVec = (col: string) =>
      sampleRows.map((r) => (r[col] !== null && r[col] !== undefined ? Number(r[col]) : NaN)).filter((v) => !isNaN(v));

    for (const c1 of numericCols) {
      corr[c1] = {};
      for (const c2 of numericCols) {
        if (c1 === c2) { corr[c1][c2] = 1; continue; }
        const v1 = getVec(c1);
        const v2 = getVec(c2);
        const n = Math.min(v1.length, v2.length);
        if (n < 3) { corr[c1][c2] = 0; continue; }

        const mean1 = v1.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const mean2 = v2.slice(0, n).reduce((a, b) => a + b, 0) / n;
        let num = 0, d1 = 0, d2 = 0;
        for (let i = 0; i < n; i++) {
          num += (v1[i] - mean1) * (v2[i] - mean2);
          d1 += (v1[i] - mean1) ** 2;
          d2 += (v2[i] - mean2) ** 2;
        }
        const denom = Math.sqrt(d1 * d2);
        corr[c1][c2] = denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
      }
    }
    return corr;
  }, [numericCols, sampleRows]);

  if (!correlations || numericCols.length < 2) {
    return (
      <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center">
        <p className="text-xs text-muted-foreground">Need at least 2 numeric columns with data for correlation matrix.</p>
      </div>
    );
  }

  const cols = numericCols.slice(0, 8); // cap at 8×8

  const getColor = (r: number): string => {
    if (r > 0.7) return "rgba(16,185,129,0.7)";
    if (r > 0.4) return "rgba(16,185,129,0.35)";
    if (r > 0.1) return "rgba(255,255,255,0.08)";
    if (r > -0.1) return "rgba(255,255,255,0.04)";
    if (r > -0.4) return "rgba(239,68,68,0.25)";
    if (r > -0.7) return "rgba(239,68,68,0.45)";
    return "rgba(239,68,68,0.7)";
  };

  return (
    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Pearson Correlation Matrix
        <span className="ml-2 text-[9px] text-muted-foreground font-normal normal-case">(estimated from sample rows)</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="w-24 pr-2" />
              {cols.map((c) => (
                <th key={c} className="p-1 text-muted-foreground font-semibold max-w-[60px]">
                  <span className="block truncate max-w-[60px]" title={c}>{c}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((r) => (
              <tr key={r}>
                <td className="pr-2 text-muted-foreground font-semibold max-w-[80px] truncate" title={r}>{r}</td>
                {cols.map((c) => {
                  const val = correlations[r]?.[c] ?? 0;
                  return (
                    <td
                      key={c}
                      className="p-1 text-center rounded transition-colors"
                      style={{ backgroundColor: getColor(val) }}
                      title={`${r} × ${c}: ${val}`}
                    >
                      <span className={`font-bold ${Math.abs(val) > 0.6 ? "text-white" : "text-white/60"}`}>
                        {val.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 text-[9px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(16,185,129,0.7)" }} /> Strong positive</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} /> Weak / None</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239,68,68,0.7)" }} /> Strong negative</div>
      </div>
    </div>
  );
}

// ── Scatter Plot between 2 numeric columns ──
function ScatterPlot({ analysis }: { analysis: Analysis }) {
  const profile = analysis.profile;
  if (!profile) return null;

  const numericCols = profile.columns.filter((c: string) => {
    const d = profile.column_details?.[c];
    return d && d.mean !== undefined;
  });

  if (numericCols.length < 2) {
    return (
      <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center">
        <p className="text-xs text-muted-foreground">Need at least 2 numeric columns for scatter plot.</p>
      </div>
    );
  }

  const xCol = numericCols[0];
  const yCol = numericCols[1];
  const sampleRows: Record<string, any>[] = profile.sample_rows ?? [];

  const points = sampleRows
    .map((r) => ({ x: r[xCol], y: r[yCol] }))
    .filter((p) => p.x !== null && p.y !== null && !isNaN(Number(p.x)) && !isNaN(Number(p.y)))
    .map((p) => ({ x: Number(p.x), y: Number(p.y) }));

  if (points.length < 2) {
    return (
      <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center">
        <p className="text-xs text-muted-foreground">Not enough numeric sample data for scatter plot.</p>
      </div>
    );
  }

  const W = 400, H = 200, PAD = 30;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs) || xMin + 1;
  const yMin = Math.min(...ys), yMax = Math.max(...ys) || yMin + 1;

  const sx = (v: number) => PAD + ((v - xMin) / (xMax - xMin)) * (W - PAD * 2);
  const sy = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);

  const isTargetX = xCol === analysis.target_col;
  const isTargetY = yCol === analysis.target_col;

  return (
    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Scatter: <span className={isTargetX ? "text-primary" : "text-cyan-400"}>{xCol}</span>
        {" "} × {" "}
        <span className={isTargetY ? "text-primary" : "text-violet-400"}>{yCol}</span>
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl" style={{ height: 200, background: "rgba(0,0,0,0.2)" }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <g key={t}>
            <line x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <line x1={PAD + t * (W - PAD * 2)} y1={PAD} x2={PAD + t * (W - PAD * 2)} y2={H - PAD} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          </g>
        ))}
        {/* Axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={3.5}
            fill="rgba(139,92,246,0.5)"
            stroke="rgba(139,92,246,0.8)"
            strokeWidth={0.5}
          />
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8}>{xCol}</text>
        <text x={8} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8} transform={`rotate(-90, 8, ${H / 2})`}>{yCol}</text>
        <text x={PAD} y={H - 4} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={7}>{xMin.toFixed(1)}</text>
        <text x={W - PAD} y={H - 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={7}>{xMax.toFixed(1)}</text>
      </svg>
      <p className="text-[9px] text-muted-foreground">{points.length} sample points plotted</p>
    </div>
  );
}

// ── Main EDA Charts Component ──
export function EDACharts({ analysis }: EDAChartsProps) {
  const profile = analysis.profile;
  if (!profile) return null;

  const columns = profile.columns ?? [];
  const columnDetails = profile.column_details ?? {};

  const numericCols = columns.filter((c: string) => {
    const d = columnDetails[c];
    return d && d.mean !== undefined;
  });

  const categoricalCols = columns.filter((c: string) => {
    const d: any = columnDetails[c];
    return d && d.class_distribution;
  });

  return (
    <div className="space-y-8">
      {/* Box Plots Section */}
      {numericCols.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Box Plots — Numeric Distributions ({numericCols.length} columns)
            </h4>
          </div>
          <p className="text-[10px] text-muted-foreground pl-3">Box shows IQR (Q1–Q3). Line = median. Dot = mean. Whiskers = min/max.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {numericCols.map((col: string) => (
              <BoxPlot
                key={col}
                colName={col}
                detail={columnDetails[col]}
                isTarget={col === analysis.target_col}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categorical Bar Charts Section */}
      {categoricalCols.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-violet-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Category Distribution Charts ({categoricalCols.length} columns)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoricalCols.map((col: string) => (
              <CategoricalBar
                key={col}
                colName={col}
                detail={columnDetails[col]}
                isTarget={col === analysis.target_col}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scatter Plot */}
      {numericCols.length >= 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scatter Plot — Feature Relationship
            </h4>
          </div>
          <ScatterPlot analysis={analysis} />
        </div>
      )}

      {/* Correlation Matrix */}
      {numericCols.length >= 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Correlation Matrix — Linear Relationships
            </h4>
          </div>
          <CorrelationMatrix analysis={analysis} />
        </div>
      )}

      {numericCols.length === 0 && categoricalCols.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No column-level data available for chart generation.</p>
        </div>
      )}
    </div>
  );
}
