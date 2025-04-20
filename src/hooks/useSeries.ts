import { convertFileSrc } from "@tauri-apps/api/core";
import { join, appLocalDataDir } from "@tauri-apps/api/path";
import { BaseDirectory } from "@tauri-apps/plugin-fs";

import { Series } from "../interfaces/library";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useSeriesStore } from "../store/series";

export function useSeries() {
  const { setSeries } = useSeriesStore();
  const { server } = useCommonStore();

  const retrieveSeries = async (seriesId: number): Promise<Series | null> => {
    try {
      const response = await fetch(server + `/series/${seriesId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (data.status) {
        const files = await retrieveFiles(seriesId);

        setSeries({ ...data, files });
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error retrieving series:", error);
      return null;
    }
  };

  const retrieveLocalSeries = async (
    seriesId: number
  ): Promise<Series | null> => {
    try {
      let data: any = null;
      await db.connect();
      const series = await db.select<Record<string, any>[]>(
        "SELECT * FROM series WHERE id = $1",
        [seriesId]
      );

      if (series.length > 0) {
        data = series[0];
      } else {
        return null;
      }

      const files = await db.select<Record<string, any>[]>(
        "SELECT * FROM file WHERE seriesId = $1",
        [seriesId]
      );

      data.files = files;

      const batchSize = 20;
      const processedFiles = [];

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const processedBatch = await Promise.all(
          batch.map(async (file) => ({
            ...file,
            coverImage: await getAssetUrl(
              seriesId,
              "files",
              `${file.fileName}.jpg`
            ),
          }))
        );
        processedFiles.push(...processedBatch);
      }

      processedFiles.sort((a: any, b: any) => {
        if (a.volume > 0 && b.volume > 0) {
          return a.volume - b.volume;
        }

        if (a.volume > 0) return -1;
        if (b.volume > 0) return 1;

        if (a.chapter > 0 && b.chapter > 0) {
          return a.chapter - b.chapter;
        }
        if (a.chapter > 0) return -1;
        if (b.chapter > 0) return 1;

        return a.fileName.localeCompare(b.fileName);
      });

      data.files = processedFiles;

      if (data.mangaData) {
        data.mangaData = JSON.parse(data.mangaData);
      }

      data.coverOriginal = data.coverImage;
      data.coverImage = await getAssetUrl(seriesId, "series", data.coverImage);

      setSeries(data);

      return data;
    } catch (error) {
      console.error("Error retrieving local series:", error);
      return null;
    }
  };

  const getAssetUrl = async (
    seriesId: number,
    type: string,
    fileName: string
  ) => {
    const localDataDir = await appLocalDataDir();

    let path = "";

    if (type === "series") {
      path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        String(seriesId),
        fileName
      );
    } else {
      path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        String(seriesId),
        "files",
        fileName as string
      );
    }

    return convertFileSrc(path);
  };

  const retrieveFiles = async (seriesId: number): Promise<File[]> => {
    try {
      const response = await fetch(server + `/series/${seriesId}/files`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      return data.files;
    } catch (error) {
      console.error("Error retrieving files:", error);
      return [];
    }
  };

  return {
    retrieveSeries,
    retrieveLocalSeries,
  };
}
