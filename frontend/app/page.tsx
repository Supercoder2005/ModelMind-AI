"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Zap, BarChart3, BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPEWRITER_PHRASES = [
  "Understand your data.",
  "Battle your models.",
  "Ship insights faster.",
  "Explain it to anyone.",
];

function TypewriterHero() {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[index];
    let timeout: NodeJS.Timeout;

    if (typing) {
      if (displayed.length < phrase.length) {
        timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 55);
      } else {
        timeout = setTimeout(() => setTyping(false), 2000);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        setIndex((i) => (i + 1) % TYPEWRITER_PHRASES.length);
        setTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, typing, index]);

  return (
    <span className="gradient-text typewriter-cursor">{displayed}&nbsp;</span>
  );
}

const FEATURES = [
  {
    icon: Sparkles,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Auto EDA Narrator",
    desc: "Drop a CSV. AI reads it, identifies your problem type, and narrates what's interesting — in seconds.",
  },
  {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    title: "Multi-Model Battle",
    desc: "4+ algorithms race simultaneously. The winner is selected automatically. AI explains why it won.",
  },
  {
    icon: Brain,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    title: "Expertise Adapter",
    desc: "One slider. Four levels. Beginner to Expert. The same results explained completely differently — live.",
  },
  {
    icon: BarChart3,
    color: "text-green-400",
    bg: "bg-green-500/10",
    title: "Rich Visualisations",
    desc: "Confusion matrices, ROC curves, forecast charts, cluster scatter — auto-generated from your data.",
  },
  {
    icon: BookOpen,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    title: "Jupyter Export",
    desc: "Download a fully annotated .ipynb notebook with real code, real hyperparameters, ready to run in Colab.",
  },
  {
    icon: ChevronRight,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    title: "What-If Simulator",
    desc: "Change feature values and get live predictions from the winning model — no code required.",
  },
];

const STEPS = [
  { num: "01", title: "Upload a CSV", desc: "Drag-and-drop any CSV file. We support classification, regression, clustering, and time-series datasets." },
  { num: "02", title: "AI Detects Everything", desc: "AI analyses your data profile, identifies the problem type, guesses the domain, and narrates key observations." },
  { num: "03", title: "Models Battle & Explain", desc: "Multiple algorithms train in parallel. The winner is chosen. AI explains what it learned and what to do next." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg gradient-text">ModelMind AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs hidden sm:flex">
              Powered by Advanced AI
            </Badge>
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-violet transition-all">
                Open Dashboard <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-6 text-center">
        {/* Background glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <Badge className="mb-6 inline-flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          Hackathon Project · ModelMind AI
        </Badge>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
          <TypewriterHero />
          <br />
          <span className="text-foreground/80 text-4xl sm:text-5xl lg:text-6xl font-light">
            No code. Just upload.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          ModelMind AI analyses any CSV with{" "}
          <span className="text-primary font-medium">Advanced AI</span>,
          runs a multi-model battle, and explains results at{" "}
          <span className="text-accent font-medium">your expertise level</span> — from
          total beginner to PhD researcher.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-violet px-8 py-3 text-base transition-all hover:scale-105"
            >
              Start Analysing <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 hover:border-white/20 px-8 py-3 text-base transition-all"
            >
              View Demo
            </Button>
          </Link>
        </div>

        {/* Floating CSV → Chart animation */}
        <div className="mt-16 relative max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-6 border border-white/10 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">modelmind-ai · dashboard</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Mock EDA card */}
              <div className="col-span-2 rounded-xl bg-card p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Classification</Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">Healthcare</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">AI detected:</span> This appears to be a patient readmission dataset.
                  The target column is likely <code className="text-primary bg-primary/10 px-1 rounded text-[11px]">readmitted</code>.
                  Interesting patterns include a strong correlation between age and diagnosis count...
                </p>
                <div className="mt-3 flex gap-2">
                  <div className="h-1.5 rounded-full bg-primary/60 flex-1 animate-pulse" />
                  <div className="h-1.5 rounded-full bg-accent/60 w-2/3" />
                  <div className="h-1.5 rounded-full bg-green-500/60 w-1/2" />
                </div>
              </div>
              {/* Mock model results */}
              <div className="rounded-xl bg-card p-4 border border-white/5">
                <p className="text-xs text-muted-foreground mb-3">Model Battle</p>
                {[
                  { name: "Random Forest", score: "94.2%", winner: true },
                  { name: "Gradient Boost", score: "91.8%" },
                  { name: "Logistic Reg", score: "88.3%" },
                ].map((m) => (
                  <div key={m.name} className={`flex items-center justify-between mb-2 p-1.5 rounded-lg ${m.winner ? "bg-primary/10 border border-primary/20" : ""}`}>
                    <span className="text-[10px] font-medium">{m.name}</span>
                    <span className={`text-[10px] font-bold ${m.winner ? "text-primary" : "text-muted-foreground"}`}>{m.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to go from{" "}
            <span className="gradient-text">data to decisions</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Six powerful features working together in a single, beautiful workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 border border-white/8 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground text-lg">From upload to insights in under 60 seconds.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative text-center animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-transparent" />
              )}
              <div className="w-16 h-16 rounded-2xl gradient-border mx-auto mb-5 flex items-center justify-center text-2xl font-bold gradient-text">
                {step.num}
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto glass rounded-3xl p-12 border border-white/10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to try it?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Upload any CSV and see ModelMind AI in action — no signup required.
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-violet px-10 py-4 text-base transition-all hover:scale-105"
            >
              Open Dashboard <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-muted-foreground">
        <p>
          Built with{" "}
          <span className="text-primary">♥</span>{" "}
          using Next.js · FastAPI · Multi-LLM AI · scikit-learn
        </p>
      </footer>
    </main>
  );
}
