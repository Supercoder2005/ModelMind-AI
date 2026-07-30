"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, TableIcon, Search, AlertTriangle, AlertCircle,
  Copy, Target, Layers, Download, ChevronUp, ChevronDown
} from "lucide-react";

type DatasetRow = {
  idx: number;
  data: Record<string, string | number | null>;
  is_duplicate: boolean;
  missing_cells: string[];
};

type ColMeta = {
  dtype: string;
  missing_count: number;
  is_target: boolean;
};

type DatasetResponse = {
  analysis_id: string;
  filename: string;
  target_col: string | null;
  columns: string[];
  column_meta: Record<string, ColMeta>;
  total_rows: number;
  rows: DatasetRow[];
};

type SortDir = "asc" | "desc" | null;

interface DatasetModalProps {
  analysisId: string;
  filename: string;
  targetCol: string | null;
  onClose: () => void;
}

export function DatasetModal({ analysisId, filename, targetCol, onClose }: DatasetModalProps) {
  const [data, setData] = useState<DatasetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getDataset(analysisId, 2000)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dataset"))
      .finally(() => setLoading(false));
  }, [analysisId]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Focus search on open
    setTimeout(() => searchRef.current?.focus(), 100);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const filteredRows = useCallback(() => {
    if (!data) return [];
    let rows = [...data.rows];

    if (showOnlyMissing) rows = rows.filter((r) => r.missing_cells.length > 0);
    if (showOnlyDuplicates) rows = rows.filter((r) => r.is_duplicate);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.data).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const av = a.data[sortCol] ?? "";
        const bv = b.data[sortCol] ?? "";
        const an = Number(av), bn = Number(bv);
        const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, showOnlyMissing, showOnlyDuplicates, sortCol, sortDir]);

  const totalMissing = data ? data.rows.filter((r) => r.missing_cells.length > 0).length : 0;
  const totalDuplicates = data ? data.rows.filter((r) => r.is_duplicate).length : 0;
  const rows = filteredRows();

  const handleDownloadCSV = () => {
    if (!data) return;
    const header = data.columns.join(",");
    const body = data.rows.map(r =>
      data.columns.map(c => {
        const val = r.data[c];
        if (val === null || val === undefined) return "";
        const s = String(val);
        return s.includes(",") ? `"${s}"` : s;
      }).join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.replace(".csv", "")}_dataset.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ backgroundColor: "#07070f" }}
    >
      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/8 bg-black/60 shrink-0 backdrop-blur-sm">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <TableIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Full Dataset Viewer</h2>
            <p className="text-[10px] text-muted-foreground font-mono leading-tight">{filename}</p>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any cell value… (Ctrl+F)"
              className="w-full h-8 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: filter chips + stats + actions */}
        <div className="flex items-center gap-2 ml-auto">
          {data && (
            <>
              <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-mono text-white/70">
                {data.total_rows.toLocaleString()} rows · {data.columns.length} cols
              </div>

              {totalMissing > 0 && (
                <button
                  onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                    showOnlyMissing
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-amber-500/5 border-amber-500/15 text-amber-400/70 hover:bg-amber-500/10"
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  {totalMissing} Missing
                </button>
              )}

              {totalDuplicates > 0 && (
                <button
                  onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                    showOnlyDuplicates
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-rose-500/5 border-rose-500/15 text-rose-400/70 hover:bg-rose-500/10"
                  }`}
                >
                  <Copy className="w-3 h-3" />
                  {totalDuplicates} Dupes
                </button>
              )}

              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/15 transition"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── LEGEND STRIP ── */}
      <div className="flex items-center gap-5 px-6 py-2 border-b border-white/5 bg-black/30 shrink-0">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
          <span className="text-[10px] text-muted-foreground">Target column</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
          <span className="text-[10px] text-muted-foreground">Missing (null) cell</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-500/10 border-l-2 border-rose-500/40" />
          <span className="text-[10px] text-muted-foreground">Duplicate row</span>
        </div>
        {rows.length !== (data?.total_rows ?? 0) && (
          <span className="text-[10px] text-primary font-semibold ml-auto">
            Showing {rows.length.toLocaleString()} / {data?.total_rows.toLocaleString()} rows
          </span>
        )}
      </div>

      {/* ── TABLE BODY ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-10 space-y-3 max-w-4xl mx-auto">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : !data || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Layers className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No rows match the current filter.</p>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => { setSearch(""); setShowOnlyMissing(false); setShowOnlyDuplicates(false); }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "#0d0d18" }}>
                {/* Row # */}
                <th className="px-3 py-2.5 text-left text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest w-12 border-r border-white/5 select-none">
                  #
                </th>
                {data.columns.map((col) => {
                  const meta = data.column_meta[col];
                  const isTarget = meta?.is_target;
                  const isSortedAsc = sortCol === col && sortDir === "asc";
                  const isSortedDesc = sortCol === col && sortDir === "desc";
                  return (
                    <th
                      key={col}
                      className={`px-3 py-2.5 text-left font-bold whitespace-nowrap border-r border-white/5 cursor-pointer select-none group transition-colors ${
                        isTarget ? "bg-primary/10 text-primary" : "text-white/70 hover:bg-white/3"
                      }`}
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1.5">
                        {isTarget && <Target className="w-3 h-3 text-primary shrink-0" />}
                        <span className="truncate max-w-[120px]" title={col}>{col}</span>
                        <span className="ml-auto pl-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          {isSortedAsc ? <ChevronUp className="w-3 h-3" /> :
                           isSortedDesc ? <ChevronDown className="w-3 h-3" /> :
                           <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-40" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 font-normal">
                        <span className="text-[8px] text-muted-foreground/50">{meta?.dtype}</span>
                        {(meta?.missing_count ?? 0) > 0 && (
                          <span className="text-[8px] text-amber-400/70">· {meta?.missing_count} null</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={row.idx}
                  className={`border-b border-white/4 transition-colors hover:bg-white/[0.02] ${
                    row.is_duplicate ? "border-l-2 border-l-rose-500/40" : ""
                  }`}
                  style={row.is_duplicate ? { backgroundColor: "rgba(239,68,68,0.03)" } : {}}
                >
                  {/* Row index */}
                  <td className="px-3 py-1.5 text-muted-foreground/40 text-[9px] border-r border-white/5 select-none">
                    {row.idx + 1}
                    {row.is_duplicate && (
                      <span className="ml-1.5 text-rose-400/60 text-[8px]">dup</span>
                    )}
                  </td>
                  {data.columns.map((col) => {
                    const isMissing = row.missing_cells.includes(col);
                    const isTarget = data.column_meta[col]?.is_target;
                    const val = row.data[col];
                    return (
                      <td
                        key={col}
                        className={`px-3 py-1.5 border-r border-white/4 max-w-[200px] truncate ${
                          isMissing
                            ? "bg-amber-500/8 text-amber-300/80 italic"
                            : isTarget
                            ? "text-primary font-semibold"
                            : "text-white/75"
                        }`}
                        title={String(val ?? "null")}
                      >
                        {isMissing ? (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400/70 shrink-0" />
                            <span className="text-amber-400/50">null</span>
                          </span>
                        ) : (
                          String(val ?? "")
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── STATUS BAR ── */}
      {data && !loading && (
        <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 bg-black/40 shrink-0 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="font-mono">{data.columns.length} columns · {data.total_rows.toLocaleString()} rows loaded</span>
            {totalMissing > 0 && <span className="text-amber-400">· {totalMissing} rows w/ missing values</span>}
            {totalDuplicates > 0 && <span className="text-rose-400">· {totalDuplicates} duplicate rows</span>}
          </div>
          <div className="flex items-center gap-3">
            {sortCol && (
              <span className="text-primary/70">
                Sorted by {sortCol} ({sortDir})
                <button onClick={() => { setSortCol(null); setSortDir(null); }} className="ml-2 text-muted-foreground hover:text-white">✕</button>
              </span>
            )}
            <button onClick={onClose} className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition text-xs text-muted-foreground hover:text-white">
              Close (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
