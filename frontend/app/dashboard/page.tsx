"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { UploadZone } from "@/components/upload/UploadZone";
import { api, type Analysis } from "@/lib/api";
import { 
  Database, Upload, Sparkles, LayoutGrid, Clock, ChevronRight,
  TrendingUp, Award, Activity, Heart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/utils";

const PROBLEM_COLORS: Record<string, string> = {
  classification: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  regression: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  clustering: "bg-green-500/20 text-green-300 border-green-500/30",
  timeseries: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{ total_analyses: number; by_problem_type: Record<string, number> } | null>(null);
  const [recent, setRecent] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.listAnalyses(3)])
      .then(([statsData, recentData]) => {
        setStats(statsData);
        setRecent(recentData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-14 h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">ModelMind Hub</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Machine Learning Workspace</h1>
                <p className="text-muted-foreground text-xs max-w-lg leading-relaxed">
                  Upload raw tables to profile distributions, engineer features, run automated model training competitions, and compile AI-backed conclusions.
                </p>
              </div>

              {/* Ingestion Stats */}
              {stats && stats.total_analyses > 0 && (
                <div className="flex items-center gap-4 bg-muted/20 border border-white/8 rounded-2xl p-4 shrink-0 shadow-lg backdrop-blur-md">
                  <div className="text-center px-2">
                    <p className="text-lg font-black text-white">{stats.total_analyses}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Runs</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Top Task Inferred</p>
                    <div className="flex gap-1">
                      {Object.entries(stats.by_problem_type)
                        .filter(([, val]) => val > 0)
                        .slice(0, 2)
                        .map(([key]) => (
                          <Badge key={key} className={`text-[8px] uppercase border px-1.5 ${PROBLEM_COLORS[key]}`}>
                            {key}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Layout Grid: Left (Upload Zone + Supported Tasks), Right (Recent Runs) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Upload Card */}
                <div className="glass rounded-3xl p-6 border border-white/8 bg-muted/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      Dataset Upload Portal
                    </h3>
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
                      CSV Format
                    </Badge>
                  </div>
                  
                  <UploadZone />
                </div>

                {/* Supported tasks / templates */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Supported Estimators & Task Types
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-violet-500/5 border border-violet-500/10 hover:border-violet-500/20 transition rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-violet-300">Classification</span>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Logistic Regression, Decision Trees, Random Forest, XGBoost, SVM
                      </p>
                    </div>

                    <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/20 transition rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-cyan-300">Regression</span>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Linear, Ridge, Lasso, XGBoost Regressor
                      </p>
                    </div>

                    <div className="p-3 bg-green-500/5 border border-green-500/10 hover:border-green-500/20 transition rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-green-300">Clustering</span>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        K-Means, DBSCAN, Agglomerative Clustering
                      </p>
                    </div>

                    <div className="p-3 bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/20 transition rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-orange-300">Time-Series</span>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Prophet, ARIMA forecasting (coming soon)
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Recent Runs */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Your Recent Runs
                  </h3>
                  <Badge variant="ghost" className="text-[10px] text-muted-foreground">
                    Latest 3
                  </Badge>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-2xl border border-white/5" />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <div className="p-8 text-center bg-muted/10 border border-white/5 rounded-2xl space-y-2">
                    <Database className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">Workspace is empty. Ingest data to see history.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recent.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => router.push(`/analysis/${item.id}`)}
                        className="group p-4 bg-muted/10 border border-white/5 hover:border-white/10 transition rounded-2xl cursor-pointer relative shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="text-xs font-bold text-white truncate max-w-[150px]">
                            {item.name || item.filename}
                          </p>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition group-hover:translate-x-0.5 shrink-0" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {item.problem_type && (
                            <Badge className={`text-[9px] px-1.5 py-0 border ${PROBLEM_COLORS[item.problem_type]}`}>
                              {item.problem_type}
                            </Badge>
                          )}
                          {item.winning_model && (
                            <Badge variant="outline" className="text-[9px] border-white/10 text-muted-foreground font-mono">
                              🏆 {item.winning_model.split(" ")[0]}
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t border-white/5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.created_at ? formatDistanceToNow(item.created_at) : "–"}
                          </span>
                          <span>
                            {item.shape_rows?.toLocaleString() ?? 0} rows
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
