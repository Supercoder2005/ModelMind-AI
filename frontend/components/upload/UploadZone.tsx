"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { api, type EdaResult, type DataProfile } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

const DOMAINS = [
  "Auto-detect",
  "Healthcare",
  "Finance",
  "Retail",
  "HR",
  "Marketing",
  "Real Estate",
  "Other",
];

type Stage = "idle" | "uploading" | "profiling" | "detecting" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "",
  uploading: "Uploading file...",
  profiling: "Profiling dataset...",
  detecting: "Gemini is detecting problem type...",
  done: "Analysis ready!",
  error: "Upload failed.",
};

export function UploadZone() {
  const router = useRouter();
  const { upsertHistory } = useStore();
  const [domain, setDomain] = useState("Auto-detect");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [eda, setEda] = useState<EdaResult | null>(null);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setFilename(file.name);
      setError(null);
      setEda(null);

      try {
        setStage("uploading");
        setProgress(15);
        await new Promise((r) => setTimeout(r, 300));

        setStage("profiling");
        setProgress(40);

        const selectedDomain = domain === "Auto-detect" ? undefined : domain;
        setStage("detecting");
        setProgress(70);

        const res = await api.upload(file, selectedDomain);

        setProgress(100);
        setStage("done");
        setEda(res.eda_result);
        setProfile(res.profile);

        // Update sidebar history
        const mockAnalysis = {
          id: res.analysis_id,
          filename: res.filename,
          created_at: new Date().toISOString(),
          domain: res.eda_result.domain_guess,
          problem_type: res.eda_result.problem_type,
          shape_rows: res.shape.rows,
          shape_cols: res.shape.cols,
          target_col: res.eda_result.target_col,
          winning_model: null,
          name: null,
          is_favorite: false,
          eda_result: res.eda_result,
          profile: res.profile,
          results_json: null,
        };
        upsertHistory(mockAnalysis);

        // Navigate to analysis page after short delay
        setTimeout(() => router.push(`/analysis/${res.analysis_id}`), 1200);
      } catch (err: unknown) {
        setStage("error");
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [domain, router, upsertHistory]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    disabled: stage !== "idle" && stage !== "error",
  });

  const isActive = stage !== "idle" && stage !== "error";

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Domain selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Dataset domain:</span>
        <Select value={domain} onValueChange={setDomain} disabled={isActive}>
          <SelectTrigger className="w-44 h-8 text-xs bg-muted/40 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        id="upload-dropzone"
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          min-h-[220px] flex flex-col items-center justify-center p-10 text-center
          ${isDragActive ? "border-primary bg-primary/10 glow-violet" : "border-white/15 hover:border-white/30 hover:bg-white/3"}
          ${isActive ? "pointer-events-none opacity-80" : ""}
        `}
      >
        <input {...getInputProps()} id="csv-file-input" />

        {stage === "idle" || stage === "error" ? (
          <>
            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-transform duration-300 ${isDragActive ? "scale-110 bg-primary/20" : "bg-muted"}`}>
              {isDragActive ? (
                <Upload className="w-7 h-7 text-primary animate-bounce" />
              ) : (
                <FileText className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <p className="font-semibold text-base mb-1">
              {isDragActive ? "Drop it!" : "Drag & drop your CSV file"}
            </p>
            <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
            <Badge variant="secondary" className="text-xs">Supports .csv files up to any size</Badge>
          </>
        ) : stage === "done" ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
            <p className="font-semibold text-base text-green-400">Upload complete!</p>
            <p className="text-sm text-muted-foreground mt-1">Redirecting to analysis...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="font-medium text-sm mb-1">{filename}</p>
            <p className="text-xs text-muted-foreground mb-5">{STAGE_LABELS[stage]}</p>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-1.5" />
            </div>
          </>
        )}

        {stage === "error" && error && (
          <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* EDA result preview */}
      {eda && profile && (
        <div className="glass rounded-2xl p-5 border border-white/10 animate-fade-in space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Gemini EDA Result
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">{eda.narrative}</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{eda.problem_type}</Badge>
              <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">{eda.domain_guess}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-white/5">
            <span>{profile.shape.rows.toLocaleString()} rows</span>
            <span>{profile.shape.cols} columns</span>
            {eda.target_col && <span>Target: <code className="text-primary bg-primary/10 px-1 rounded">{eda.target_col}</code></span>}
            <Badge variant="outline" className="text-[10px] ml-auto">Confidence: {eda.confidence}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
