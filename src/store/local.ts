import { create } from 'zustand';

export interface LocalState {
  localData: any;
  setLocalData: (localData: any) => void;
}

// @ts-ignore
export const useLocalStore = create<LocalState>((set, get) => ({
  localData: null,
  setLocalData: (localData: any) => set({ localData }),
}));
