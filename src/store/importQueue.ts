import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";

import { create } from "zustand";

import { db } from "../lib/database";

import { useCommonStore } from "./common";

interface ImportQueueState {
  processing: boolean;
  currentFiles: any[];
  setProcessing: (processing: boolean) => void;
  setCurrentFiles: (files: any[]) => void;
  addToCurrentFiles: (files: any[]) => void;
  processQueue: () => Promise<void>;
  handleFileImport: (file: any) => Promise<void>;
  createFolder: (folder: string) => Promise<void>;
  createLocalSeries: (seriesId: number) => Promise<any | null>;
  importSeries: (seriesId: number) => Promise<void>;
  importFile: (seriesId: number, fileId: number) => Promise<void>;
}

export const useImportQueueStore = create<ImportQueueState>((set, get) => ({
  processing: false,
  currentFiles: [],
  setProcessing: (processing) => set({ processing }),
  setCurrentFiles: (files) => set({ currentFiles: files }),
  addToCurrentFiles: (files) =>
    set((state) => ({
      currentFiles: [...state.currentFiles, ...files],
    })),

  processQueue: async () => {
    const currentQueueLength = get().currentFiles.length;
    console.log("Processing import queue", currentQueueLength);

    if (currentQueueLength === 0) {
      set({ processing: false });
      return;
    }

    set({ processing: true });

    const toImportBatch = get().currentFiles.slice(0, 2);

    console.log(
      "Processing batch of:",
      toImportBatch.length,
      "files",
      toImportBatch.map((f) => f.fileName)
    );

    await Promise.all(
      toImportBatch.map(async (toImport: any) => {
        await get().handleFileImport(toImport);
      })
    );

    console.log(
      "Batch processed, removing files:",
      toImportBatch.map((f) => f.fileName)
    );

    const processedFiles = new Set(
      toImportBatch.map((f) => `${f.seriesId}-${f.fileName}`)
    );

    get().setCurrentFiles(
      get().currentFiles.filter(
        (f) => !processedFiles.has(`${f.seriesId}-${f.fileName}`)
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const remainingFiles = get().currentFiles.length;
    console.log("Remaining files:", remainingFiles);

    set({ processing: false });
  },

  handleFileImport: async (file: any) => {
    try {
      const { server } = useCommonStore.getState();
      console.log("Importing file", file.fileName);

      const existingFiles = await db.select(
        "SELECT * FROM file WHERE fileName = $1 AND seriesId = $2",
        [file.fileName, file.localSeriesId]
      );

      if (existingFiles.length > 0) {
        console.log("File already exists", file.fileName);
        return;
      }

      const result = await db.execute(
        `INSERT INTO file (
          path, fileName, fileFormat, volume, chapter, 
          totalPages, currentPage, isRead, seriesId, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          file.path,
          file.fileName,
          file.fileFormat,
          file.volume,
          file.chapter,
          file.totalPages,
          file.currentPage,
          file.isRead,
          file.localSeriesId,
          JSON.stringify({}),
        ]
      );

      console.log("Downloading file", `${server}/get-file/${file.id}`);

      const localDataDir = await appLocalDataDir();

      try {
        const path = await join(
          localDataDir,
          String(BaseDirectory.AppLocalData),
          "series",
          String(file.localSeriesId),
          "files",
          `${file.fileName}.jpg`
        );

        await invoke("download_file", {
          url: `${server}/preview-image/${file.libraryId}/${file.remoteSeriesId}/${file.id}.jpg`,
          path,
        });
      } catch (error) {
        console.error("Error downloading preview image:", error);
      }

      try {
        const startTime = Date.now();

        const path = await join(
          localDataDir,
          String(BaseDirectory.AppLocalData),
          "series",
          String(file.localSeriesId),
          "files",
          file.fileName
        );

        await invoke("download_file", {
          url: `${server}/get-file/${file.id}`,
          path,
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`${file.fileName} downloaded in ${duration}ms`);
      } catch (error) {
        console.error("Error downloading file:", error);
      }

      console.log(
        "File downloaded",
        file.localSeriesId,
        file.libraryId,
        file.remoteSeriesId,
        result.id,
        file.fileName
      );
    } catch (error) {
      console.error("Error handling file import:", error);
    }
  },

  importSeries: async (seriesId: number) => {
    try {
      const { server } = useCommonStore.getState();

      const series = (await get().createLocalSeries(seriesId)) as any;

      if (series) {
        const response = await fetch(
          server + `/series/${series.seriesId}/files`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const fileData = await response.json();

        if (!fileData.files) {
          return;
        }

        const newFiles = fileData.files.map((f: any) => ({
          ...f,
          libraryId: series.libraryId,
          localSeriesId: series.id,
          remoteSeriesId: series.seriesId,
          seriesTitle: series.title,
        }));

        get().addToCurrentFiles(newFiles);
      } else {
        console.error("Error creating local series");
      }
    } catch (error) {
      console.error("Error importing series:", error);
    }
  },

  importFile: async (seriesId: number, fileId: number) => {
    try {
      const { server } = useCommonStore.getState();

      console.log("Import file", seriesId, fileId);

      const series = (await get().createLocalSeries(seriesId)) as any;

      if (series) {
        const response = await fetch(server + `/file/${fileId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const fileData = await response.json();

        get().addToCurrentFiles([
          {
            ...fileData.file,
            libraryId: series.libraryId,
            localSeriesId: series.id,
            remoteSeriesId: series.seriesId,
            seriesTitle: series.title,
          },
        ]);
      } else {
        console.error("Error creating local series");
      }
    } catch (error) {
      console.error("Error importing series:", error);
    }
  },

  createFolder: async (folder: string) => {
    try {
      const localDataDir = await appLocalDataDir();

      const path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        folder,
        "files"
      );

      console.log("Creating folder", path);

      await invoke("create_folder", {
        path,
      });
    } catch (e) {
      console.error("Error creating folder", e);
    }
  },

  createLocalSeries: async (seriesId: number) => {
    try {
      const { server } = useCommonStore.getState();

      const response = await fetch(server + `/series/${seriesId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { id, path, libraryId, title, mangaData } = await response.json();

      const existing = await db.select(
        "SELECT * FROM series WHERE title = $1",
        [title]
      );

      if (existing.length > 0) {
        await get().createFolder(`${existing[0].id}`);
        return { ...existing[0], libraryId, seriesId };
      }

      const result = await db.execute(
        `INSERT INTO series (
          title, titleSafe, path, mangaData, metadata, coverImage
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          title,
          title.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          path,
          JSON.stringify(mangaData),
          JSON.stringify({}),
          "cover.jpg",
        ]
      );

      const newSeries = {
        id: result.lastInsertId,
        title,
        titleSafe: title.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        path,
        mangaData: JSON.stringify(mangaData),
        metadata: JSON.stringify({}),
      };

      await get().createFolder(`${newSeries.id}`);

      try {
        const localDataDir = await appLocalDataDir();

        const path = await join(
          localDataDir,
          String(BaseDirectory.AppLocalData),
          "series",
          String(newSeries.id),
          "cover.jpg"
        );

        console.log(
          "Downloading cover image",
          `${server}/cover-image/${libraryId}/${id}.jpg`
        );
        console.log(path);

        await invoke("download_file", {
          url: `${server}/cover-image/${libraryId}/${id}.jpg`,
          path,
        });
      } catch (error) {
        console.error("Error downloading cover image:", error);
      }

      return { ...newSeries, libraryId, seriesId };
    } catch (error) {
      console.error("Error creating local series:", error);
      return null;
    }
  },
}));
