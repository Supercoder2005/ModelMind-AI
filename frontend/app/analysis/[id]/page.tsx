"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Analysis, type ModelResults } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "@/components/eda/OverviewTab";
import { ModelBattleTab } from "@/components/models/ModelBattleTab";
import { ResultsTab } from "@/components/results/ResultsTab";
import { ExplainTab } from "@/components/explain/ExplainTab";
import { WhatIfTab } from "@/components/whatif/WhatIfTab";
import { PipelineWalkthrough } from "@/components/pipeline/PipelineWalkthrough";
import {
  BarChart2, Brain, FlaskConical, Lightbulb, Wand2,
  Download, Play, RefreshCw, Trophy
} from "lucide-react";

const PROBLEM_COLORS: Record<string, string> = {
  classification: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  regression: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  clustering: "bg-green-500/20 text-green-300 border-green-500/30",
  timeseries: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { expertiseLevel, upsertHistory } = useStore();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<ModelResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"pipeline" | "tabs">("pipeline");

  // Load analysis record
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getAnalysis(id);
        setAnalysis(data);
        if (data.results_json) {
          setResults(data.results_json);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const runModels = async () => {
    if (!id || !analysis) return;
    setRunning(true);
    setError(null);
    try {
      const res = await api.runModels({ analysis_id: id, expertise_level: expertiseLevel });
      setResults(res);
      // Refresh local analysis record
      const updated = await api.getAnalysis(id);
      setAnalysis(updated);
      upsertHistory(updated);
      setActiveTab("models");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Model training failed");
    } finally {
      setRunning(false);
    }
  };

  // Auto-run models if ?run=true is set
  useEffect(() => {
    if (analysis && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("run") === "true" && !results && !running) {
        // Clear param from URL to avoid re-runs on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        runModels();
      }
    }
  }, [analysis, results, running]);

  const handleExport = () => {
    if (!id) return;
    window.open(api.exportNotebookUrl(id), "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex pt-14 h-screen">
          <Sidebar />
          <main className="flex-1 p-8 space-y-4">
            <Skeleton className="h-8 w-64 shimmer" />
            <Skeleton className="h-4 w-48 shimmer" />
            <Skeleton className="h-64 w-full rounded-2xl shimmer" />
          </main>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-lg mb-2">{error}</p>
          <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-14 h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 max-w-6xl mx-auto">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate max-w-sm">
                    {analysis?.name || analysis?.filename || "Analysis"}
                  </h1>
                  {analysis?.problem_type && (
                    <Badge className={`text-xs border ${PROBLEM_COLORS[analysis.problem_type]}`}>
                      {analysis.problem_type}
                    </Badge>
                  )}
                  {analysis?.domain && (
                    <Badge variant="outline" className="text-xs border-white/15 text-muted-foreground">
                      {analysis.domain}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis?.shape_rows?.toLocaleString()} rows · {analysis?.shape_cols} columns
                  {analysis?.target_col && ` · Target: ${analysis.target_col}`}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* View Mode Toggler */}
                <div className="flex bg-muted/40 border border-white/8 rounded-xl p-0.5 shrink-0">
                  <button
                    onClick={() => setViewMode("pipeline")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      viewMode === "pipeline" 
                        ? "bg-primary text-primary-foreground shadow" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    11-Step Pipeline
                  </button>
                  <button
                    onClick={() => setViewMode("tabs")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      viewMode === "tabs" 
                        ? "bg-primary text-primary-foreground shadow" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Expert Tabs
                  </button>
                </div>

                {results?.winner && (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full">
                    <Trophy className="w-3 h-3" />
                    {results.winner}
                  </div>
                )}
                {results && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-white/15"
                    onClick={handleExport}
                    id="export-notebook-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Notebook
                  </Button>
                )}
                {!results ? (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={runModels}
                    disabled={running}
                    id="run-models-btn"
                  >
                    {running ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Training...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" />Run Models</>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-white/15"
                    onClick={runModels}
                    disabled={running}
                    id="rerun-models-btn"
                  >
                    {running ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Re-running...</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" />Re-run</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* ── Error Banner ── */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* ── Training Banner ── */}
            {running && (
              <div className="mb-4 p-4 rounded-xl glass border border-primary/20 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">Training models in parallel...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Running 4+ algorithms simultaneously. AI will explain the results after.
                  This may take 30–90 seconds depending on dataset size.
                </p>
              </div>
            )}

            {/* ── Conditional Render based on viewMode ── */}
            {viewMode === "pipeline" && analysis ? (
              <PipelineWalkthrough 
                analysis={analysis} 
                results={results} 
                running={running} 
                runModels={runModels} 
                onRefresh={() => {
                  api.getAnalysis(id).then(setAnalysis);
                }}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/40 border border-white/8 rounded-xl mb-6 p-1 gap-0.5">
                  <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg" id="tab-overview">
                    <BarChart2 className="w-3.5 h-3.5" />Overview
                  </TabsTrigger>
                  <TabsTrigger value="models" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg" id="tab-models" disabled={!results}>
                    <FlaskConical className="w-3.5 h-3.5" />Model Battle
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg" id="tab-results" disabled={!results}>
                    <Brain className="w-3.5 h-3.5" />Results
                  </TabsTrigger>
                  <TabsTrigger value="explain" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg" id="tab-explain" disabled={!results}>
                    <Lightbulb className="w-3.5 h-3.5" />Explain
                  </TabsTrigger>
                  <TabsTrigger value="whatif" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg" id="tab-whatif" disabled={!results || analysis?.problem_type === "clustering"}>
                    <Wand2 className="w-3.5 h-3.5" />What-If
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 animate-fade-in">
                  {analysis && <OverviewTab analysis={analysis} />}
                </TabsContent>

                <TabsContent value="models" className="mt-0 animate-fade-in">
                  {results && analysis && <ModelBattleTab results={results} analysis={analysis} />}
                </TabsContent>

                <TabsContent value="results" className="mt-0 animate-fade-in">
                  {results && analysis && <ResultsTab results={results} analysis={analysis} />}
                </TabsContent>

                <TabsContent value="explain" className="mt-0 animate-fade-in">
                  {analysis && results && (
                    <ExplainTab
                      analysisId={id}
                      domain={analysis.domain}
                      initialExplanation={results.explanation}
                      nextSteps={results.next_steps}
                    />
                  )}
                </TabsContent>

                <TabsContent value="whatif" className="mt-0 animate-fade-in">
                  {analysis && results && (
                    <WhatIfTab analysis={analysis} results={results} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
