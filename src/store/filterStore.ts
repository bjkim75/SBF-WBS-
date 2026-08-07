import { create } from 'zustand';
import { FilterState, INITIAL_FILTER_STATE } from '../models/filter';
import { IA_DEFAULT_EXCLUDED_DIVISIONS } from '../core/constants/iaSchema';

interface FilterStore {
  filters: FilterState;
  /** 데이터 로드 후 분과 목록으로 초기화 (기본 제외 분과 해제) */
  initializeDivisions: (allDivisions: string[]) => void;
  setSelectedDivisions: (divisions: string[]) => void;
  selectAllDivisions: (allDivisions: string[]) => void;
  deselectAllDivisions: () => void;
  toggleDivision: (division: string) => void;
  setMilestones: (milestones: string[]) => void;
  setAssigneesR: (assignees: string[]) => void;
  setDateRange: (dateRange: { start: Date | null; end: Date | null }) => void;
  setAssigneesAXPlan: (assignees: string[]) => void;
  setAssigneesAXDev: (assignees: string[]) => void;
  resetFilters: (allDivisions?: string[]) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: INITIAL_FILTER_STATE,

  initializeDivisions: (allDivisions) => set((state) => ({
    filters: {
      ...state.filters,
      selectedDivisions: allDivisions.filter(d =>
        !(IA_DEFAULT_EXCLUDED_DIVISIONS as readonly string[]).includes(d)
      ),
    }
  })),

  setSelectedDivisions: (divisions) => set((state) => ({
    filters: { ...state.filters, selectedDivisions: divisions }
  })),

  selectAllDivisions: (allDivisions) => set((state) => ({
    filters: { ...state.filters, selectedDivisions: [...allDivisions] }
  })),

  deselectAllDivisions: () => set((state) => ({
    filters: { ...state.filters, selectedDivisions: [] }
  })),

  toggleDivision: (division) => set((state) => {
    const current = state.filters.selectedDivisions || [];
    const next = current.includes(division)
      ? current.filter(d => d !== division)
      : [...current, division];
    return { filters: { ...state.filters, selectedDivisions: next } };
  }),

  setMilestones: (milestones) => set((state) => ({ filters: { ...state.filters, milestones } })),
  setAssigneesR: (assignees) => set((state) => ({ filters: { ...state.filters, assigneesR: assignees } })),
  setDateRange: (dateRange) => set((state) => ({ filters: { ...state.filters, dateRange } })),
  setAssigneesAXPlan: (assignees) => set((state) => ({ filters: { ...state.filters, assigneesAXPlan: assignees } })),
  setAssigneesAXDev: (assignees) => set((state) => ({ filters: { ...state.filters, assigneesAXDev: assignees } })),

  resetFilters: (allDivisions) => set({
    filters: {
      ...INITIAL_FILTER_STATE,
      selectedDivisions: allDivisions
        ? allDivisions.filter(d => !(IA_DEFAULT_EXCLUDED_DIVISIONS as readonly string[]).includes(d))
        : null,
    }
  }),
}));
