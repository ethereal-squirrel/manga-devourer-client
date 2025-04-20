import { create } from 'zustand';

export interface ReadState {
  pageMode: 'single' | 'double';
  resizeMode: 'contain' | 'full';
  direction: 'ltr' | 'rtl';
  setPageMode: (pageMode: 'single' | 'double') => void;
  setResizeMode: (resizeMode: 'contain' | 'full') => void;
  setDirection: (direction: 'ltr' | 'rtl') => void;
}

export const useReadStore = create<ReadState>((set) => ({
  pageMode: 'double',
  resizeMode: 'contain',
  direction: 'rtl',
  setPageMode: (pageMode: 'single' | 'double') => set({ pageMode }),
  setResizeMode: (resizeMode: 'contain' | 'full') => set({ resizeMode }),
  setDirection: (direction: 'ltr' | 'rtl') => set({ direction }),
}));
