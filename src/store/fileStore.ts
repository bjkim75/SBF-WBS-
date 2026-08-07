import { create } from 'zustand';

interface FileStore {
  file: File | null;
  setFile: (file: File) => void;
  reset: () => void;
}

export const useFileStore = create<FileStore>((set) => ({
  file: null,
  setFile: (file) => set({ file }),
  reset: () => set({ file: null }),
}));
