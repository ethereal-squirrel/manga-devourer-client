import { create } from 'zustand';

import { Library } from '../interfaces/library';

export interface LibraryState {
  libraryId: number | null;
  libraryName: string | null;
  libraryPath: string | null;
  libraryData: null | Library;
  librariesData: null | Library[];
  setLibraryId: (libraryId: number | null) => void;
  setLibraryName: (libraryName: string | null) => void;
  setLibraryPath: (libraryPath: string | null) => void;
  setLibraryData: (libraryData: Library | null) => void;
  setLibrariesData: (librariesData: Library[] | null) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  libraryId: null,
  libraryName: null,
  libraryPath: null,
  libraryData: null,
  librariesData: null,
  setLibraryId: (libraryId: number | null) => set({ libraryId }),
  setLibraryName: (libraryName: string | null) => set({ libraryName }),
  setLibraryPath: (libraryPath: string | null) => set({ libraryPath }),
  setLibraryData: (libraryData: Library | null) => set({ libraryData }),
  setLibrariesData: (librariesData: Library[] | null) => set({ librariesData }),
}));
