"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, Brain, Zap, BarChart3, BookOpen, ChevronRight, 
  Sparkles, ShieldCheck, Database, GitMerge, FileCheck, CheckCircle2,
  Award, Play, HelpCircle, Activity, LayoutDashboard
} from "lucide-react";
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
        timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 50);
      } else {
        timeout = setTimeout(() => setTyping(false), 2200);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 25);
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

// Interactive Live Dashboard Demo component for the Hero showcase
function InteractivePreviewDemo() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const demoSteps = [
    { num: 0, title: "1. Auto Ingestion", icon: Database },
    { num: 1, title: "2. Model Competition", icon: Zap },
    { num: 2, title: "3. AI Explanations", icon: Brain },
  ];

  return (
    <div className="w-full glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-primary/5 transition-all duration-500 hover:border-primary/20">
      {/* Chrome Tab Bar Mockup */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-muted-foreground font-mono select-none">modelmind.ai/dashboard</span>
        </div>
        <div className="flex gap-1">
          {demoSteps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.num;
            return (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 ${
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3" />
                {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Demo Viewport Container */}
      <div className="p-6 bg-card min-h-[260px] flex flex-col justify-between relative overflow-hidden transition-all">
        
        {/* Step 1 Content: Ingestion */}
        {activeStep === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Live Profiling</span>
                <h4 className="text-sm font-semibold text-white mt-0.5">industrial_sensor_telemetry.csv</h4>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Ready to Fit</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-left">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Total Rows</span>
                <span className="text-base font-black text-white mt-1 block">42,916</span>
              </div>
              <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-left">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Suggested Target</span>
                <span className="text-xs font-bold text-primary mt-1 block font-mono">failure_imminent</span>
              </div>
              <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-left">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">Problem Type</span>
                <span className="text-xs font-bold text-accent mt-1 block font-mono">Classification</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-left">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="text-white font-semibold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                  AI Attribute Suggestion
                </span>
                Detected time-series alignment with sensor data. Recommending K-Fold cross-validation splits to shield evaluation metrics from lookahead bias.
              </p>
            </div>
          </div>
        )}

        {/* Step 2 Content: Model Battle */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Model Competition</span>
                <h4 className="text-sm font-semibold text-white mt-0.5">Automated Estimator Race</h4>
              </div>
              <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">Training Completed</Badge>
            </div>

            <div className="space-y-2.5">
              {[
                { name: "Random Forest Classifier", f1: "95.6%", time: "0.45s", isWinner: true },
                { name: "Gradient Boosting Machine", f1: "93.1%", time: "1.12s" },
                { name: "Support Vector Machine (SVM)", f1: "89.4%", time: "0.08s" },
              ].map((m, idx) => (
                <div 
                  key={m.name} 
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    m.isWinner 
                      ? "bg-primary/10 border-primary/30 shadow-md shadow-primary/5" 
                      : "bg-white/3 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                    <div>
                      <span className="text-xs font-semibold text-white block">{m.name}</span>
                      <span className="text-[9px] text-muted-foreground">Train Speed: {m.time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono ${m.isWinner ? "text-primary" : "text-muted-foreground"}`}>{m.f1}</span>
                    <span className="text-[9px] text-muted-foreground block">F1-Score</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 Content: AI Explanations */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400">AI Explanations</span>
                <h4 className="text-sm font-semibold text-white mt-0.5">Narrative Diagnostics</h4>
              </div>
              <Badge className="bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px]">Calibrated: Learner</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Sparkles className="w-12 h-12 text-violet-400" />
                </div>
                <h5 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-1.5">Executive Summary</h5>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The <span className="font-semibold text-white font-mono px-1 rounded bg-white/5">Random Forest</span> winner achieved an accuracy of <span className="text-emerald-400 font-bold font-mono">95.6%</span>. It is robust to outliers and requires no additional numeric scaling.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Award className="w-12 h-12 text-cyan-400" />
                </div>
                <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">Why This Model Won</h5>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  It effectively handled multi-collinear attributes and performed deep feature boundary splits, resulting in <span className="text-emerald-400 font-bold font-mono">0.05%</span> variance across cross-validation checks.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-muted-foreground">Explain level slider adapted instantly</span>
              </div>
              <span className="text-[10px] text-primary font-semibold">Switch Persona →</span>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Sparkles,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    glow: "shadow-violet-500/5 hover:border-violet-500/30",
    title: "Auto EDA Narrator",
    desc: "Drop a CSV. AI instantly profiles datasets, extracts structure, and narrates key observations in seconds.",
  },
  {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    glow: "shadow-yellow-500/5 hover:border-yellow-500/30",
    title: "Multi-Model Battle",
    desc: "Multiple algorithms compete in parallel. The winner is selected automatically, with explanation logs generated.",
  },
  {
    icon: Brain,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    glow: "shadow-cyan-500/5 hover:border-cyan-500/30",
    title: "Persona Adapter",
    desc: "Dynamic explanation adapter switches target depth from Beginner to PhD Expert, adapting narratives on the fly.",
  },
  {
    icon: BarChart3,
    color: "text-green-400",
    bg: "bg-green-500/10",
    glow: "shadow-green-500/5 hover:border-green-500/30",
    title: "Rich Visualisations",
    desc: "Multi-metric radar comparisons, confusion matrices, and speed benchmarks compiled instantly.",
  },
  {
    icon: BookOpen,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    glow: "shadow-orange-500/5 hover:border-orange-500/30",
    title: "Jupyter Code Export",
    desc: "Export models directly into formatted .ipynb Jupyter notebooks containing production-ready code.",
  },
  {
    icon: ChevronRight,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    glow: "shadow-pink-500/5 hover:border-pink-500/30",
    title: "What-If Simulator",
    desc: "Simulate and test features live. Adjust input parameters and see immediate inferences without training code.",
  },
];

const STEPS = [
  { num: "01", title: "Upload Data", desc: "Drag-and-drop any standard dataset CSV. We parse structure, headers, and values securely." },
  { num: "02", title: "Estimator Duel", desc: "AI launches parallel training runs. Models battle across cross-validation folds." },
  { num: "03", title: "Adaptive Explanation", desc: "Select your comfort level. Walk away with fully annotated code templates." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden relative">
      
      {/* Custom Styles Injection for floating animations & grid patterns */}
      <style jsx global>{`
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.08); }
        }
        .animate-float-1 {
          animation: float-orb-1 12s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-orb-2 16s ease-in-out infinite;
        }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* Background Dark Tech Layer */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      {/* Floating Glowing Neon Orbs */}
      <div className="absolute top-[-100px] left-[15%] w-[450px] h-[450px] bg-primary/10 rounded-full blur-[130px] pointer-events-none z-0 animate-float-1" />
      <div className="absolute top-[200px] right-[10%] w-[380px] h-[380px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0 animate-float-2" />
      <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[140px] pointer-events-none z-0 animate-float-1" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5 backdrop-blur-md bg-background/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight gradient-text">ModelMind AI</span>
              <span className="text-[9px] text-muted-foreground block font-mono tracking-wider -mt-1 uppercase">Automated Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-[10px] font-semibold border-white/10 text-muted-foreground bg-white/3 hidden sm:flex">
              Powered by Advanced AI
            </Badge>
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/95 glow-violet font-semibold transition-all hover:scale-102">
                Open Dashboard <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-20 px-6 text-center z-10 max-w-7xl mx-auto">
        <Badge className="mb-6 inline-flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20 text-xs px-4 py-1.5 rounded-full font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          ABB Hackathon Selection · Premium AutoML Edition
        </Badge>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.08] tracking-tight">
          <TypewriterHero />
          <br />
          <span className="text-white/80 text-3xl sm:text-5xl lg:text-6xl font-light block mt-2">
            No code. Drag-and-drop. Deploy.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          ModelMind AI analyses any CSV instantly, coordinates a competitive 
          <span className="text-primary font-semibold"> multi-algorithm estimator race</span>, 
          and translates complex findings to <span className="text-cyan-400 font-semibold">any audience level</span> — from complete beginner to machine learning engineer.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-violet px-9 py-6 text-base font-bold transition-all hover:scale-105"
            >
              Analyze Your Dataset <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 hover:border-white/20 hover:bg-white/5 px-9 py-6 text-base font-semibold transition-all"
            >
              Explore Live Demo
            </Button>
          </Link>
        </div>

        {/* Live Interactive Dashboard Preview Container */}
        <div className="mt-16 max-w-4xl mx-auto animate-fade-in relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none h-20 bottom-0" />
          <InteractivePreviewDemo />
        </div>
      </section>

      {/* ── Key Statistics Row ── */}
      <section className="py-12 border-y border-white/5 bg-white/2 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <span className="text-3xl font-black text-white block">4+</span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">Parallel ML Competitors</span>
          </div>
          <div>
            <span className="text-3xl font-black text-primary block">&lt; 60s</span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">End-to-End Pipeline Inferences</span>
          </div>
          <div>
            <span className="text-3xl font-black text-cyan-400 block">4 Levels</span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">Adaptive AI Narrators</span>
          </div>
          <div>
            <span className="text-3xl font-black text-emerald-400 block">100%</span>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">Annotated Jupyter Exports</span>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Go from raw CSV to <span className="gradient-text">model insights</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Six advanced modules running in unison to demystify neural and statistical modeling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`glass rounded-3xl p-6 border border-white/8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl group animate-fade-in ${f.glow}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <Badge className="bg-white/5 border border-white/10 text-[9px] text-muted-foreground tracking-wider uppercase font-semibold">
                  Module {i + 1}
                </Badge>
              </div>
              <h3 className="font-bold text-base mb-2 text-white">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works Stepper ── */}
      <section className="py-24 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">The 3-Step Flow</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Upload, compete, and customize. Simple as that.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative text-center animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[65%] w-[70%] h-[1.5px] bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 mx-auto mb-5 flex items-center justify-center text-xl font-bold gradient-text shadow-lg shadow-primary/5">
                {step.num}
              </div>
              <h3 className="font-bold text-base mb-2 text-white">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto glass rounded-3xl p-10 md:p-14 border border-white/10 bg-gradient-to-b from-primary/5 via-transparent to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] pointer-events-none" />
          
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white">
            Unleash Advanced AutoML Today
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Upload any standard CSV. Let the algorithms battle, adapt explanations to your depth, and export production code instantly.
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-violet px-10 py-6 text-base font-bold transition-all hover:scale-105"
            >
              Get Started Instantly <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6 text-center text-xs text-muted-foreground z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-white">ModelMind AI</span>
          </div>
          <p>
            Built with <span className="text-primary">♥</span> for the ABB Hackathon · Next.js · FastAPI · Multi-LLM Orchestrator
          </p>
        </div>
      </footer>
    </main>
  );
}
