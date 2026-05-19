"use client";

import { useStore, type ExpertiseLevel } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain } from "lucide-react";

const LEVELS: { value: ExpertiseLevel; label: string; emoji: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱", desc: "No jargon, simple analogies" },
  { value: "learner", label: "Learner", emoji: "📚", desc: "Terms explained with definitions" },
  { value: "practitioner", label: "Practitioner", emoji: "🔬", desc: "Standard ML vocabulary" },
  { value: "expert", label: "Expert", emoji: "🧠", desc: "Dense technical output" },
];

export function ExpertiseSlider() {
  const { expertiseLevel, setExpertiseLevel } = useStore();
  const currentIndex = LEVELS.findIndex((l) => l.value === expertiseLevel);
  const current = LEVELS[currentIndex];

  return (
    <div className="flex items-center gap-2">
      <Brain className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
      <div className="flex items-center gap-0.5">
        {LEVELS.map((level, i) => (
          <Tooltip key={level.value}>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setExpertiseLevel(level.value)}
                  className={`
                    relative px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200
                    ${level.value === expertiseLevel
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }
                  `}
                  aria-label={`Set expertise level to ${level.label}`}
                >
                  <span className="hidden sm:inline">{level.label}</span>
                  <span className="sm:hidden">{level.emoji}</span>
                </button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">
              <strong>{level.emoji} {level.label}</strong>
              <br />
              {level.desc}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
