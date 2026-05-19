/**
 * Zustand global store with localStorage persistence.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Analysis } from "./api";

export type ExpertiseLevel = "beginner" | "learner" | "practitioner" | "expert";

interface ModelMindStore {
  expertiseLevel: ExpertiseLevel;
  activeAnalysisId: string | null;
  analysisHistory: Analysis[];
  setExpertiseLevel: (level: ExpertiseLevel) => void;
  setActiveAnalysis: (id: string | null) => void;
  setHistory: (history: Analysis[]) => void;
  upsertHistory: (analysis: Analysis) => void;
  removeFromHistory: (id: string) => void;
}

export const useStore = create<ModelMindStore>()(
  persist(
    (set) => ({
      expertiseLevel: "practitioner",
      activeAnalysisId: null,
      analysisHistory: [],

      setExpertiseLevel: (level) => set({ expertiseLevel: level }),
      setActiveAnalysis: (id) => set({ activeAnalysisId: id }),
      setHistory: (history) => set({ analysisHistory: history }),

      upsertHistory: (analysis) =>
        set((state) => {
          const exists = state.analysisHistory.find((a) => a.id === analysis.id);
          if (exists) {
            return {
              analysisHistory: state.analysisHistory.map((a) =>
                a.id === analysis.id ? analysis : a
              ),
            };
          }
          return { analysisHistory: [analysis, ...state.analysisHistory].slice(0, 20) };
        }),

      removeFromHistory: (id) =>
        set((state) => ({
          analysisHistory: state.analysisHistory.filter((a) => a.id !== id),
          activeAnalysisId: state.activeAnalysisId === id ? null : state.activeAnalysisId,
        })),
    }),
    {
      name: "modelmind-store",
      partialState: (state) => ({
        expertiseLevel: state.expertiseLevel,
      }),
    } as Parameters<typeof persist>[1]
  )
);
