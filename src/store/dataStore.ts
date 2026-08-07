import { create } from 'zustand';
import { NormalizedWork, MilestoneGroup } from '../models/normalized';

interface DataStore {
  normalizedWorks: NormalizedWork[];
  milestoneGroups: MilestoneGroup[];
  setData: (works: NormalizedWork[], groups: MilestoneGroup[]) => void;
  reset: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  normalizedWorks: [],
  milestoneGroups: [],
  setData: (works, groups) => set({ normalizedWorks: works, milestoneGroups: groups }),
  reset: () => set({ normalizedWorks: [], milestoneGroups: [] }),
}));
