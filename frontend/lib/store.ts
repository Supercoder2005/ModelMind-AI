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

      setExpertiseLevel: (level: ExpertiseLevel) => set({ expertiseLevel: level }),
      setActiveAnalysis: (id: string | null) => set({ activeAnalysisId: id }),
      setHistory: (history: Analysis[]) => set({ analysisHistory: history }),

      upsertHistory: (analysis: Analysis) =>
        set((state: ModelMindStore) => {
          const exists = state.analysisHistory.find((a: Analysis) => a.id === analysis.id);
          if (exists) {
            return {
              analysisHistory: state.analysisHistory.map((a: Analysis) =>
                a.id === analysis.id ? analysis : a
              ),
            };
          }
          return { analysisHistory: [analysis, ...state.analysisHistory].slice(0, 20) };
        }),

      removeFromHistory: (id: string) =>
        set((state: ModelMindStore) => ({
          analysisHistory: state.analysisHistory.filter((a: Analysis) => a.id !== id),
          activeAnalysisId: state.activeAnalysisId === id ? null : state.activeAnalysisId,
        })),
    }),
    {
      name: "modelmind-store",
      partialize: (state: ModelMindStore) => ({
        expertiseLevel: state.expertiseLevel,
      }),
    }
  )
);
