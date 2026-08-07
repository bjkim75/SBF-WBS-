import { create } from 'zustand';

/**
 * Drill-down 컨텍스트 — 어디서 클릭했는지 정보
 */
export interface DrilldownContext {
  source: 'milestone' | 'division' | 'assigneeR' | 'cross' | 'task';
  milestone?: string;
  division?: string;
  assigneeR?: string;
}

interface UIStore {
  expandedSwimlanes: Set<string>;
  drilldownContext: DrilldownContext | null;
  divisionGroupMode: 'grouped' | 'flat';
  toggleSwimlane: (milestone: string) => void;
  expandAllSwimlanes: (allMilestones: string[]) => void;
  collapseAllSwimlanes: () => void;
  setDrilldown: (ctx: DrilldownContext | null) => void;
  toggleDivisionMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  expandedSwimlanes: new Set<string>(),
  drilldownContext: null,
  divisionGroupMode: 'grouped',
  toggleSwimlane: (milestone) => set((state) => {
    const next = new Set(state.expandedSwimlanes);
    if (next.has(milestone)) {
      next.delete(milestone);
    } else {
      next.add(milestone);
    }
    return { expandedSwimlanes: next };
  }),
  expandAllSwimlanes: (allMilestones) => set({ expandedSwimlanes: new Set(allMilestones) }),
  collapseAllSwimlanes: () => set({ expandedSwimlanes: new Set<string>() }),
  setDrilldown: (ctx) => set({ drilldownContext: ctx }),
  toggleDivisionMode: () => set((state) => ({
    divisionGroupMode: state.divisionGroupMode === 'grouped' ? 'flat' : 'grouped',
  })),
}));
