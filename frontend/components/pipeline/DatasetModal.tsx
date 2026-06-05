"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, TableIcon, Search, AlertTriangle, Copy, Download,
  Target, AlertCircle, Layers
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getDataset(analysisId, 1000);
        setData(result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load dataset");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [analysisId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filteredRows = useCallback(() => {
    if (!data) return [];
    let rows = data.rows;

    if (showOnlyMissing) {
      rows = rows.filter((r) => r.missing_cells.length > 0);
    }
    if (showOnlyDuplicates) {
      rows = rows.filter((r) => r.is_duplicate);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.data).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, search, showOnlyMissing, showOnlyDuplicates]);

  const totalMissing = data
    ? data.rows.filter((r) => r.missing_cells.length > 0).length
    : 0;
  const totalDuplicates = data
    ? data.rows.filter((r) => r.is_duplicate).length
    : 0;

  const rows = filteredRows();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-6xl max-h-[90vh] glass rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl shadow-black/60 animate-fade-in">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <TableIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Full Dataset View</h2>
              <p className="text-[10px] text-muted-foreground font-mono">{filename}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            {data && (
              <>
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/4 border border-white/5">
                  <span className="text-[10px] text-muted-foreground">Total Rows:</span>
                  <span className="text-[10px] font-bold text-white font-mono">{data.total_rows.toLocaleString()}</span>
                </div>
                {totalMissing > 0 && (
                  <button
                    onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
                      showOnlyMissing
                        ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
                      showOnlyDuplicates
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                        : "bg-rose-500/5 border-rose-500/15 text-rose-400/70 hover:bg-rose-500/10"
                    }`}
                  >
                    <Copy className="w-3 h-3" />
                    {totalDuplicates} Dupes
                  </button>
                )}
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-xl hover:bg-white/5"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any cell value..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:bg-white/8 transition"
            />
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="px-6 py-2 border-b border-white/5 bg-black/10 flex items-center gap-4 shrink-0 flex-wrap">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
            <span className="text-[10px] text-muted-foreground">Missing cell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/20" />
            <span className="text-[10px] text-muted-foreground">Duplicate row</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
            <span className="text-[10px] text-muted-foreground">Target column</span>
          </div>
          {rows.length !== (data?.rows.length ?? 0) && (
            <span className="text-[10px] text-primary font-semibold ml-auto">
              Showing {rows.length} of {data?.total_rows.toLocaleString()} rows
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full shimmer rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : !data || rows.length === 0 ? (
            <div className="p-8 text-center">
              <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No rows match the current filter.</p>
            </div>
          ) : (
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-black/60 border-b border-white/10">
                  {/* Row index */}
                  <th className="px-3 py-2.5 text-left text-[9px] text-muted-foreground font-bold uppercase tracking-widest w-12 border-r border-white/5">
                    #
                  </th>
                  {data.columns.map((col) => {
                    const meta = data.column_meta[col];
                    return (
                      <th
                        key={col}
                        className={`px-3 py-2.5 text-left font-bold whitespace-nowrap border-r border-white/5 ${
                          meta?.is_target
                            ? "text-primary bg-primary/10"
                            : "text-white/70"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {meta?.is_target && <Target className="w-3 h-3 text-primary shrink-0" />}
                          <span>{col}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px] text-muted-foreground font-normal">{meta?.dtype}</span>
                          {meta?.missing_count > 0 && (
                            <span className="text-[8px] text-amber-400 font-bold">
                              · {meta.missing_count} null
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.idx}
                    className={`border-b border-white/4 transition-colors hover:bg-white/3 ${
                      row.is_duplicate ? "bg-rose-500/5 border-l-2 border-l-rose-500/30" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-muted-foreground text-[9px] border-r border-white/5 select-none">
                      {row.idx + 1}
                      {row.is_duplicate && (
                        <span className="ml-1 text-rose-400 text-[8px]">dup</span>
                      )}
                    </td>
                    {data.columns.map((col) => {
                      const isMissing = row.missing_cells.includes(col);
                      const isTarget = data.column_meta[col]?.is_target;
                      const val = row.data[col];

                      return (
                        <td
                          key={col}
                          className={`px-3 py-2 border-r border-white/4 max-w-[180px] truncate ${
                            isMissing
                              ? "bg-amber-500/10 text-amber-300 italic"
                              : isTarget
                              ? "text-primary font-semibold"
                              : "text-white/80"
                          }`}
                          title={String(val ?? "null")}
                        >
                          {isMissing ? (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="text-amber-400/70">null</span>
                            </span>
                          ) : (
                            String(val ?? "null")
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

        {/* ── Footer ── */}
        {data && !loading && (
          <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>{data.columns.length} columns</span>
              <span>·</span>
              <span>{data.total_rows.toLocaleString()} rows loaded</span>
              {totalMissing > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-400">{totalMissing} rows with missing values</span>
                </>
              )}
              {totalDuplicates > 0 && (
                <>
                  <span>·</span>
                  <span className="text-rose-400">{totalDuplicates} duplicate rows</span>
                </>
              )}
            </div>
            <Button size="sm" variant="outline" className="text-xs border-white/10 h-7" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
