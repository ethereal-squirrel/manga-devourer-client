import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { join, appLocalDataDir } from "@tauri-apps/api/path";
import { BaseDirectory } from "@tauri-apps/plugin-fs";

import { db } from "../lib/database";
import { useLocalStore } from "../store/local";

export function useLocal() {
  const { setLocalData } = useLocalStore();

  const retrieveLocalData = async () => {
    const localDataDir = await appLocalDataDir();

    await db.connect();
    const series = await db.select<Record<string, any>[]>(
      "SELECT * FROM series ORDER BY title ASC"
    );

    const batchSize = 20;
    const seriesWithParsedData = [];

    for (let i = 0; i < series.length; i += batchSize) {
      const batch = await Promise.all(
        series.slice(i, i + batchSize).map(async (series) => ({
          ...series,
          mangaData: series.mangaData
            ? JSON.parse(series.mangaData)
            : undefined,
          coverImage: await getAssetUrl(series.id, localDataDir),
        }))
      );
      seriesWithParsedData.push(...batch);
    }

    setLocalData(seriesWithParsedData);
  };

  const getAssetUrl = async (seriesId: number, dataDir: string) => {
    const path = await join(
      dataDir,
      String(BaseDirectory.AppLocalData),
      "series",
      String(seriesId),
      "cover.jpg"
    );

    return convertFileSrc(path);
  };

  const deleteLocalSeries = async (seriesId: number) => {
    console.log("deleteLocalSeries", seriesId);

    try {
      const localDataDir = await appLocalDataDir();

      const path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        String(seriesId)
      );

      await invoke("remove_folder", {
        path,
      });
    } catch (error) {
      console.error("Error deleting files from local series:", error);
    }

    await db.connect();
    await db.execute("DELETE FROM file WHERE seriesId = ?", [seriesId]);
    await db.execute("DELETE FROM series WHERE id = ?", [seriesId]);

    return true;
  };
  return {
    retrieveLocalData,
    deleteLocalSeries,
  };
}
