import { create } from "zustand";

export interface SeriesState {
  series: any;
  setSeries: (series: any) => void;
  file: any;
  setFile: (file: any) => void;
  files: any;
  setFiles: (files: any) => void;
}

export const useSeriesStore = create<SeriesState>((set) => ({
  series: null,
  file: null,
  files: null,
  setSeries: (series: any) => set({ series }),
  setFile: (file: any) => set({ file }),
  setFiles: (files: any) => set({ files }),
}));
