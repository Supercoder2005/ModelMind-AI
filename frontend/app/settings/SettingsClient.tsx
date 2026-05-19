"use client";

import { useEffect, useState } from "react";
import { useStore, type ExpertiseLevel } from "@/lib/store";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Brain, Database, Trash2 } from "lucide-react";

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string; emoji: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱", desc: "No jargon, simple analogies, percentages explained." },
  { value: "learner", label: "Learner", emoji: "📚", desc: "Terms introduced with definitions." },
  { value: "practitioner", label: "Practitioner", emoji: "🔬", desc: "Standard ML vocabulary — F1, AUC-ROC, RMSE." },
  { value: "expert", label: "Expert", emoji: "🧠", desc: "Dense technical output — hyperparameters, bias-variance, CI." },
];

export function SettingsClient() {
  const { expertiseLevel, setExpertiseLevel } = useStore();
  const [stats, setStats] = useState<{ total_analyses: number; by_problem_type: Record<string, number> } | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const handleClearAll = async () => {
    if (!confirm("This will delete ALL analyses and their files. Are you sure?")) return;
    setClearing(true);
    try {
      const list = await api.listAnalyses(100);
      await Promise.all(list.map((a) => api.deleteAnalysis(a.id)));
      setStats((s) => s ? { ...s, total_analyses: 0, by_problem_type: {} } : null);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">Configure your ModelMind AI experience.</p>
      </div>

      {/* Expertise Level */}
      <section className="glass rounded-2xl p-6 border border-white/8 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Default Expertise Level</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Controls how Gemini explains results. Persists across sessions.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {EXPERTISE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setExpertiseLevel(opt.value)}
              className={`
                p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01]
                ${expertiseLevel === opt.value
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/20 border-white/8 hover:border-white/15"
                }
              `}
              id={`expertise-${opt.value}`}
            >
              <div className="text-xl mb-1">{opt.emoji}</div>
              <div className="text-xs font-semibold mb-0.5">{opt.label}</div>
              <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Usage Stats */}
      {stats && (
        <section className="glass rounded-2xl p-6 border border-white/8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Usage Stats</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass rounded-xl p-3 text-center border border-white/8">
              <p className="text-2xl font-bold gradient-text">{stats.total_analyses}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Analyses</p>
            </div>
            {Object.entries(stats.by_problem_type).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} className="glass rounded-xl p-3 text-center border border-white/8">
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{k}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="rounded-2xl p-6 border border-destructive/20 bg-destructive/5 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently delete all analyses, uploaded files, and cached results from the database.
        </p>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 text-xs"
          onClick={handleClearAll}
          disabled={clearing}
          id="clear-all-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? "Clearing..." : "Clear All History"}
        </Button>
      </section>
    </div>
  );
}
