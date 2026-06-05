"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type Analysis } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Trash2, Plus, BarChart3, RefreshCw,
  Clock, Database, Cpu, ChevronLeft, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

const PROBLEM_COLORS: Record<string, string> = {
  classification: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  regression: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  clustering: "bg-green-500/20 text-green-300 border-green-500/30",
  timeseries: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const PROBLEM_DOT_COLORS: Record<string, string> = {
  classification: "bg-violet-400",
  regression: "bg-cyan-400",
  clustering: "bg-green-400",
  timeseries: "bg-orange-400",
};

export function Sidebar() {
  const router = useRouter();
  const { analysisHistory, setHistory, removeFromHistory, upsertHistory, activeAnalysisId, setActiveAnalysis } = useStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const load = async () => {
    try {
      const data = await api.listAnalyses(15);
      setHistory(data);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis?")) return;
    await api.deleteAnalysis(id);
    removeFromHistory(id);
  };

  const handleFavorite = async (e: React.MouseEvent, a: Analysis) => {
    e.stopPropagation();
    const updated = await api.patchAnalysis(a.id, { is_favorite: !a.is_favorite });
    upsertHistory(updated);
  };

  const handleSelect = (id: string) => {
    setActiveAnalysis(id);
    router.push(`/analysis/${id}`);
  };

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <aside
      className={`shrink-0 h-[calc(100vh-3.5rem)] flex flex-col border-r border-white/5 bg-sidebar overflow-hidden transition-all duration-300 ease-in-out relative ${
        collapsed ? "w-14" : "w-64"
      }`}
    >
      {/* Header */}
      <div className={`p-4 flex items-center border-b border-white/5 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
        )}
        <div className="flex gap-1 items-center">
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                }
              />
              <TooltipContent>Refresh history</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 hover:bg-white/8 text-muted-foreground hover:text-white transition-colors"
                  onClick={toggleCollapse}
                >
                  {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </Button>
              }
            />
            <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* New Analysis Button */}
      <div className="p-3 border-b border-white/5">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="w-full p-0 h-8 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <TooltipContent side="right">New Analysis</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className="w-full gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            <Plus className="w-3.5 h-3.5" />
            New Analysis
          </Button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 overflow-x-hidden">
        {loading ? (
          collapsed ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-2 flex justify-center">
                <Skeleton className="h-6 w-6 rounded-lg shimmer" />
              </div>
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg">
                <Skeleton className="h-3 w-32 mb-2 shimmer" />
                <Skeleton className="h-2.5 w-20 shimmer" />
              </div>
            ))
          )
        ) : analysisHistory.length === 0 ? (
          collapsed ? (
            <div className="py-4 flex justify-center">
              <Database className="w-5 h-5 text-muted-foreground/40" />
            </div>
          ) : (
            <div className="p-4 text-center">
              <Database className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No analyses yet.</p>
              <p className="text-xs text-muted-foreground">Upload a CSV to start.</p>
            </div>
          )
        ) : (
          analysisHistory.map((a) => (
            collapsed ? (
              /* Collapsed: icon only */
              <Tooltip key={a.id}>
                <TooltipTrigger
                  render={
                    <div
                      onClick={() => handleSelect(a.id)}
                      className={`
                        cursor-pointer flex items-center justify-center w-9 h-9 mx-auto rounded-xl transition-all duration-200 border
                        ${activeAnalysisId === a.id
                          ? "bg-primary/15 border-primary/30"
                          : "border-transparent hover:bg-white/5 hover:border-white/5"
                        }
                      `}
                    >
                      <div className={`w-2 h-2 rounded-full ${PROBLEM_DOT_COLORS[a.problem_type ?? ""] ?? "bg-muted-foreground/40"}`} />
                    </div>
                  }
                />
                <TooltipContent side="right" className="max-w-[200px]">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold truncate">{a.name || a.filename}</p>
                    {a.problem_type && <p className="text-[10px] text-muted-foreground capitalize">{a.problem_type}</p>}
                    {a.winning_model && <p className="text-[10px] text-muted-foreground font-mono">{a.winning_model.split(" ")[0]}</p>}
                    {a.created_at && <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at))}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              /* Expanded: full item */
              <div
                key={a.id}
                onClick={() => handleSelect(a.id)}
                className={`
                  group relative p-3 rounded-xl cursor-pointer transition-all duration-200
                  hover:bg-white/5 border
                  ${activeAnalysisId === a.id
                    ? "bg-primary/10 border-primary/20"
                    : "border-transparent hover:border-white/5"
                  }
                `}
              >
                {/* Filename */}
                <p className="text-xs font-medium truncate pr-8 mb-1">
                  {a.name || a.filename}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {a.problem_type && (
                    <Badge className={`text-[10px] px-1.5 py-0 border ${PROBLEM_COLORS[a.problem_type] ?? ""}`}>
                      {a.problem_type}
                    </Badge>
                  )}
                  {a.winning_model && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Cpu className="w-2.5 h-2.5" />
                      {a.winning_model.split(" ")[0]}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1.5">
                  <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {a.created_at ? formatDistanceToNow(new Date(a.created_at)) : "–"}
                  </span>
                </div>

                {/* Action buttons — visible on hover */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleFavorite(e, a)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    aria-label="Toggle favorite"
                  >
                    <Star className={`w-3 h-3 ${a.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, a.id)}
                    className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors text-muted-foreground"
                    aria-label="Delete analysis"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </aside>
  );
}
