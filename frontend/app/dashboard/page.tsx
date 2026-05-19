import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { UploadZone } from "@/components/upload/UploadZone";
import { Database, Upload } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard — ModelMind AI",
  description: "Upload a dataset and start automated ML analysis",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-14 h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-10 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">New Analysis</h1>
              </div>
              <p className="text-muted-foreground text-sm max-w-md">
                Upload a CSV file. Gemini will profile it, identify the ML problem type,
                and run all relevant models automatically.
              </p>
            </div>

            {/* Upload Zone */}
            <UploadZone />

            {/* Hint */}
            <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-white/5 flex items-start gap-3 animate-fade-in">
              <Database className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground/80">Supported datasets:</strong>{" "}
                Classification (churn, fraud, diagnosis), Regression (prices, scores),
                Clustering (segments, cohorts), Time-Series (sales, metrics over time).
                The AI will auto-detect which one applies.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
