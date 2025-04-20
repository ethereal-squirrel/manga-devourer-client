import { invoke } from "@tauri-apps/api/core";
import { ask, open } from "@tauri-apps/plugin-dialog";
import {
  writeFile,
  BaseDirectory,
  copyFile,
  remove,
} from "@tauri-apps/plugin-fs";
import { basename, appLocalDataDir, join } from "@tauri-apps/api/path";
import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Container } from "../components/Container";
import { useCommonStore } from "../store/common";
import { useSeriesStore } from "../store/series";
import { useLocal } from "../hooks/useLocal";
import { useSeries } from "../hooks/useSeries";
import { useTranslation } from "../hooks/useTranslation";
import { useImportQueueStore } from "../store/importQueue";
import FileCard from "../components/file/FileCard";
import { db } from "../lib/database";
import { convertImageToJpg } from "../lib/image";

interface SeriesFile {
  id: number;
  coverImage?: string;
  currentPage: number;
  totalPages: number;
}

const MetadataSection = memo(
  ({ title, items }: { title: string; items?: string[] }) => {
    const { t } = useTranslation();

    if (!items?.length) return null;

    return (
      <div className="mb-5">
        <span className="text-lg font-semibold">{t(title as any)}</span>
        <div className="mt-3 flex flex-row flex-wrap gap-2">
          {items.map((item) => (
            <button key={item} className="rounded-full bg-gray-300 px-3 py-1">
              <span className="text-sm font-semibold text-gray-800">
                {item}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

const ActionButton = memo(
  ({
    onClick,
    isNavigating,
    children,
  }: {
    onClick: () => void;
    isNavigating: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`bg-primary hover:bg-secondary hover:cursor-pointer rounded-lg w-full px-3 py-1 ${
        isNavigating ? "opacity-50" : ""
      }`}
    >
      <span className="text-lg font-semibold text-white">{children}</span>
    </button>
  )
);

export default function SeriesScreen() {
  const navigation = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const libraryId = parseInt(searchParams.get("libraryId") || "0");

  const { server } = useCommonStore();
  const { importSeries } = useImportQueueStore();
  const { series } = useSeriesStore();
  const { t } = useTranslation();

  const { deleteLocalSeries } = useLocal();
  const { retrieveSeries, retrieveLocalSeries } = useSeries();

  const [clampDescription, setClampDescription] = useState(true);
  const [gridColumns] = useState(5);
  const [isLocal] = useState(searchParams.get("isLocal") === "true");
  const [isNavigating, setIsNavigating] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const seriesId = parseInt(String(id), 10);
        if (isLocal) {
          await retrieveLocalSeries(seriesId);
        } else {
          await retrieveSeries(seriesId);
        }
      } catch (error) {
        console.error("Failed to fetch series:", error);
      }
    };

    fetchSeries();
  }, [id, isLocal]);

  const extractChapterAndVolume = (fileName: string) => {
    const result: { chapter?: number; volume?: number } = {
      chapter: 0,
      volume: 0,
    };

    // Match volume patterns
    const volumePatterns = [/v(?:ol(?:ume)?)?\.?\s*(\d+)/i, /\(v(\d+)\)/i];

    // Match chapter patterns
    const chapterPatterns = [/ch(?:apter)?\.?\s*(\d+\.?\d*)/i, /c(\d+\.?\d*)/i];

    for (const pattern of volumePatterns) {
      const match = fileName.match(pattern);
      if (match) {
        result.volume = parseInt(match[1]);
        break;
      }
    }

    for (const pattern of chapterPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        result.chapter = parseFloat(match[1]);
        break;
      }
    }

    return result;
  };

  const handleDeleteSeries = useCallback(async () => {
    try {
      const answer = await ask(t("series.deleteAreYouSure"), {
        title: t("series.deleteSeries"),
        kind: "info",
      });

      if (answer && series) {
        await deleteLocalSeries(series.id);
        if (isLocal) {
          navigation("/local");
        } else {
          navigation(`/library?libraryId=${libraryId}`);
        }
      }
    } catch (error) {
      console.error("Failed to delete series:", error);
    }
  }, [series, isLocal, libraryId, navigation, deleteLocalSeries, t]);

  const handleFilePress = useCallback(
    (fileId: number) => {
      const path = isLocal
        ? `/read/${fileId}?seriesId=${id}&isLocal=true`
        : `/read/${fileId}?seriesId=${id}`;
      navigation(path);
    },
    [id, isLocal, navigation]
  );

  const handleGoBack = useCallback(() => {
    setIsNavigating(true);
    const path = isLocal ? "/local" : `/library?libraryId=${libraryId}`;
    navigation(path);
  }, [isLocal, libraryId, navigation]);

  const getGridTemplateColumns = useCallback(
    (columns: number) => `repeat(${columns}, minmax(0, 1fr))`,
    []
  );

  const renderItem = useCallback(
    ({ item: file }: { item: SeriesFile }) => (
      <FileCard
        key={file.id}
        file={file}
        handleFilePress={() => handleFilePress(file.id)}
        libraryId={series?.libraryId}
        series={series}
      />
    ),
    [series, handleFilePress]
  );

  const handleImportSeries = useCallback(async () => {
    try {
      const answer = await ask(t("library.importAreYouSure"), {
        title: t("library.importSeries"),
        kind: "info",
      });

      if (answer && series) {
        importSeries(series.id);
      }
    } catch (error) {
      console.error("Failed to import series:", error);
    }
  }, [series, importSeries, t]);

  const handleAddFiles = async () => {
    const files = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Archives",
          extensions: ["cbz", "zip"],
        },
      ],
    });

    const localDataDir = await appLocalDataDir();

    if (files) {
      for (const file of files) {
        setImporting(true);

        try {
          const fileName = await basename(file);

          await copyFile(
            file,
            `${BaseDirectory.AppLocalData}/series/${series.id}/files/${fileName}`,
            {
              toPathBaseDir: BaseDirectory.AppLocalData,
            }
          );

          const { chapter, volume } = extractChapterAndVolume(fileName);

          const filePath = await join(
            localDataDir,
            String(BaseDirectory.AppLocalData),
            "series",
            String(series.id),
            "files",
            fileName
          );

          const unzipPath = await join(
            localDataDir,
            String(BaseDirectory.AppLocalData),
            "series",
            String(series.id),
            "files"
          );

          const data = (await invoke("zip_summary", {
            fileName,
            path: filePath,
            unzipPath,
          })) as [number, string];

          const totalPages = data[0];
          const previewImage = data[1];

          const previewPath = await join(
            localDataDir,
            String(BaseDirectory.AppLocalData),
            "series",
            String(series.id),
            "files",
            previewImage
          );

          const imageData = await convertImageToJpg(previewPath);

          await writeFile(
            `${BaseDirectory.AppLocalData}/series/${series.id}/files/${fileName}.jpg`,
            imageData,
            {
              baseDir: BaseDirectory.AppLocalData,
            }
          );

          if (!previewPath.endsWith(".jpg")) {
            const extension = previewPath.split(".").pop();

            await remove(
              `${BaseDirectory.AppLocalData}/series/${series.id}/files/${fileName}.${extension}`,
              {
                baseDir: BaseDirectory.AppLocalData,
                recursive: true,
              }
            );
          }
          await db.execute(
            `INSERT INTO file (
              path, fileName, fileFormat, volume, chapter, 
              totalPages, currentPage, isRead, seriesId, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              `${BaseDirectory.AppLocalData}/series/${series.id}/files/${fileName}`,
              fileName,
              fileName.endsWith(".cbz") ? "cbz" : "zip",
              volume,
              chapter,
              totalPages,
              1,
              false,
              series.id,
              JSON.stringify({}),
            ]
          );

          await retrieveLocalSeries(series.id);

          toast.success(`Imported ${fileName}`);
        } catch (error) {
          console.error("Failed to import file:", error);
        }

        setImporting(false);
      }
    }
  };

  if (!series) {
    return <Container className="px-5 pt-5" />;
  }

  return (
    <Container className="px-5 pt-5">
      {importing ? (
        <div className="flex flex-1 w-full h-screen justify-center items-center">
          Importing file...
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-5">
            <div className="w-full md:w-1/4">
              <ActionButton onClick={handleGoBack} isNavigating={isNavigating}>
                {t("common.goBack")}
              </ActionButton>

              <div className="mt-5">
                <img
                  src={
                    isLocal
                      ? series.coverImage
                      : `${server}/cover-image/${series.libraryId}/${series.id}.jpg`
                  }
                  style={{
                    height: 400,
                    borderRadius: 10,
                    overflow: "hidden",
                    width: "100%",
                  }}
                  className="object-cover"
                  loading="eager"
                />
              </div>

              <div className="mb-3 mt-5">
                <span className="text-3xl font-bold">{series.title}</span>
              </div>

              <div className="mb-5">
                <span className={`${clampDescription ? "line-clamp-5" : ""}`}>
                  {series.mangaData?.synopsis}
                </span>
                <button
                  className="mt-3"
                  onClick={() => setClampDescription(!clampDescription)}
                >
                  <span className="text-sm text-gray-500">
                    {clampDescription
                      ? t("series.readMore")
                      : t("series.readLess")}
                  </span>
                </button>
              </div>

              <MetadataSection
                title="series.authors"
                items={series.mangaData?.authors}
              />
              <MetadataSection
                title="series.genres"
                items={series.mangaData?.genres}
              />
              <MetadataSection
                title="series.themes"
                items={series.mangaData?.themes}
              />

              {isLocal ? (
                <>
                  <div>
                    <ActionButton
                      onClick={handleAddFiles}
                      isNavigating={isNavigating}
                    >
                      Add Files
                    </ActionButton>
                  </div>
                  <div className="mt-5">
                    <ActionButton
                      onClick={handleDeleteSeries}
                      isNavigating={isNavigating}
                    >
                      {t("series.deleteSeries")}
                    </ActionButton>
                  </div>
                </>
              ) : (
                <ActionButton
                  onClick={handleImportSeries}
                  isNavigating={isNavigating}
                >
                  {t("library.importSeries")}
                </ActionButton>
              )}

              <div className="mt-5 mb-5">
                <ActionButton
                  onClick={() =>
                    navigation(
                      `/series-metadata/${id}?libraryId=${libraryId}&isLocal=${isLocal}`
                    )
                  }
                  isNavigating={isNavigating}
                >
                  {t("series.editMetadata")}
                </ActionButton>
              </div>
            </div>

            <div className="w-full md:w-3/4">
              <div
                className="gap-4 grid grid-cols-1 md:grid-cols-[var(--grid-cols)]"
                style={
                  {
                    width: "100%",
                    "--grid-cols": getGridTemplateColumns(gridColumns),
                  } as React.CSSProperties
                }
              >
                {series?.files?.map((item: SeriesFile) => (
                  <div key={item.id.toString()}>{renderItem({ item })}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
