import { BaseDirectory, mkdir, readDir, remove } from "@tauri-apps/plugin-fs";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import ImageComponent from "../components/read/ImageComponent";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useReadStore } from "../store/read";
import { useTranslation } from "../hooks/useTranslation";

export default function ReadScreen() {
  const navigation = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const { server } = useCommonStore();
  const {
    pageMode,
    resizeMode,
    direction,
    setPageMode,
    // @ts-ignore
    setResizeMode,
    setDirection,
  } = useReadStore();
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(1);
  const [displayMenu, setDisplayMenu] = useState(false);
  const [downloading, setDownloading] = useState(true);
  const [file, setFile] = useState<any>(null);
  const [fileId, setFileId] = useState<number>(parseInt(id || "0"));
  const [fileList, setFileList] = useState<any[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  // @ts-ignore
  const [directMode, setDirectMode] = useState(
    searchParams.get("direct") === "true"
  );
  const [nextFile, setNextFile] = useState<any>(null);
  // @ts-ignore
  const [isLocal, setIsLocal] = useState(
    searchParams.get("isLocal") === "true"
  );
  // @ts-ignore
  const [seriesId, setSeriesId] = useState<string>(
    searchParams.get("seriesId") || "1"
  );

  const handlePageMode = async (mode: string) => {
    setPageMode(mode as "double" | "single");

    await db.execute("UPDATE config SET value = $1 WHERE key = 'pageMode'", [
      mode,
    ]);
  };

  const handleResizeMode = async (mode: string) => {
    setResizeMode(mode as "contain" | "full");

    await db.execute("UPDATE config SET value = $1 WHERE key = 'resizeMode'", [
      mode,
    ]);
  };

  const handleDirection = async (direction: string) => {
    setDirection(direction as "ltr" | "rtl");

    await db.execute("UPDATE config SET value = $1 WHERE key = 'direction'", [
      direction,
    ]);
  };

  useEffect(() => {
    const setFullHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setFullHeight();
    window.addEventListener("resize", setFullHeight);

    return () => {
      window.removeEventListener("resize", setFullHeight);
    };
  }, []);

  useEffect(() => {
    if (fileList.length > 0) {
      return;
    }

    if (searchParams.get("direct") === "true") {
      loadLocalFile();
    } else if (isLocal && initialLoad) {
      connectDb();
    } else {
      retrieveFile();
    }

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [fileList, currentPage, direction]);

  const connectDb = async () => {
    await db.connect();
  };

  useEffect(() => {
    if (initialLoad) {
      if (isLocal && db) {
        retrieveFile();
      }
    }
  }, [db]);

  useEffect(() => {
    switchFile();
  }, [fileId]);

  const loadLocalFile = async () => {
    try {
      await remove(`${BaseDirectory.AppLocalData}/temp`, {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });
    } catch (error) {
      console.error("Failed to remove temp directory:", error);
    }

    setCurrentPage(1);

    const localDataDir = await appLocalDataDir();

    const path = await join(
      localDataDir,
      String(BaseDirectory.AppLocalData),
      "local.zip"
    );

    await handleUnzip(path);
  };

  const switchFile = async () => {
    if (initialLoad) {
      return;
    }

    await cleanup();

    console.log("Switching file", fileId);

    setFileList([]);

    await new Promise((resolve) => setTimeout(resolve, 100));
    retrieveFile();
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft":
        if (fileList.length > 0) {
          if (direction === "ltr") {
            goToPreviousPage(currentPage);
          } else {
            goToNextPage(currentPage);
          }
        }
        break;
      case "ArrowRight":
        if (fileList.length > 0) {
          if (direction === "ltr") {
            goToNextPage(currentPage);
          } else {
            goToPreviousPage(currentPage);
          }
        }
        break;
    }
  };

  const cleanup = async () => {
    setNextFile(null);

    try {
      await remove(`${BaseDirectory.AppLocalData}/temp`, {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });
    } catch (error) {
      console.error("Cleanup error:", error);
    }

    try {
      await remove(`${BaseDirectory.AppLocalData}/local.zip`, {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  const retrieveFile = async () => {
    try {
      await remove(`${BaseDirectory.AppLocalData}/temp`, {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });
    } catch (error) {
      console.error("Failed to remove temp directory:", error);
    }

    try {
      await mkdir(`${BaseDirectory.AppLocalData}/temp/files`, {
        baseDir: BaseDirectory.AppLocalData,
        recursive: true,
      });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }

    if (!isLocal) {
      markRecentlyRead();

      const response = await fetch(server + "/file/" + fileId, {
        method: "GET",
      });

      const data = await response.json();
      setFile(data.file);
      setCurrentPage(data.file.currentPage);
      await downloadFile(data.file);
    } else {
      const f = (await db.select("SELECT * FROM file WHERE id = $1", [
        fileId,
      ])) as Record<string, any>[];

      setFile(f[0]);
      setCurrentPage(f[0].currentPage);

      const nextFile = (await db.select(
        `
        SELECT * FROM file 
        WHERE seriesId = $1
        AND (
          (CASE 
            WHEN $2 > 0 THEN volume = $2 + 1  -- If current has volume, find next volume
            WHEN $3 > 0 THEN chapter = $3 + 1 -- If current has chapter, find next chapter
            ELSE FALSE                         -- If neither, don't look for next
          END)
        )
        ORDER BY 
          COALESCE(volume, 0) ASC,
          COALESCE(chapter, 0) ASC,
          id ASC
        LIMIT 1
      `,
        [f[0].seriesId, f[0].volume || 0, f[0].chapter || 0]
      )) as Record<string, any>[];

      if (nextFile.length > 0) {
        const localDataDir = await appLocalDataDir();

        const path = await join(
          localDataDir,
          String(BaseDirectory.AppLocalData),
          "series",
          String(nextFile[0].seriesId),
          "files",
          `${nextFile[0].fileName}.jpg`
        );

        const filePreview = getAssetUrl(path);

        setNextFile({
          id: nextFile[0].id,
          fileName: nextFile[0].fileName,
          volume: nextFile[0].volume,
          chapter: nextFile[0].chapter,
          filePreview,
        });
      }

      const localDataDir = await appLocalDataDir();

      const path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        String(f[0].seriesId),
        "files",
        f[0].fileName
      );

      await handleUnzip(path);
    }

    setInitialLoad(false);
  };

  const downloadFile = async (f: any) => {
    try {
      const localDataDir = await appLocalDataDir();

      const path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "temp",
        f.fileName
      );

      const downloadStart = new Date();

      await invoke("download_file", {
        url: server + "/get-file/" + fileId,
        path,
      });

      const downloadEnd = new Date();
      console.log(
        `Download time: ${downloadEnd.getTime() - downloadStart.getTime()}ms`
      );

      setDownloading(false);
      await handleUnzip(path);
    } catch (error) {
      console.error(error);
    }
  };

  const markRecentlyRead = async () => {
    const series = await fetch(server + `/series/${seriesId}`, {
      method: "GET",
    });

    const seriesData = await series.json();

    fetch(
      server + `/recently-read/${seriesData.libraryId}/${seriesId}/${fileId}`,
      {
        method: "POST",
      }
    );
  };

  const handleUnzip = async (filePath: string) => {
    const localDataDir = await appLocalDataDir();

    const path = await join(
      localDataDir,
      String(BaseDirectory.AppLocalData),
      "temp",
      "files"
    );

    console.log(`Unzipping file.`);

    const unzipStart = new Date();

    await invoke("unzip_file", {
      path: filePath,
      destination: path,
    });

    const unzipEnd = new Date();
    console.log(`Unzip time: ${unzipEnd.getTime() - unzipStart.getTime()}ms`);

    getFileList();
  };

  const readDirRecursive = async (dirPath: string): Promise<any[]> => {
    const entries = await readDir(dirPath, {
      baseDir: BaseDirectory.AppLocalData,
    });

    let files: any[] = [];
    for (const entry of entries) {
      if (entry.isDirectory) {
        const subDirPath = await join(dirPath, entry.name);
        const subDirFiles = await readDirRecursive(subDirPath);
        files = [...files, ...subDirFiles];
      } else {
        const filePath = await join(dirPath, entry.name);
        files.push({ ...entry, path: filePath });
      }
    }
    return files;
  };

  const getFileList = async () => {
    const localDataDir = await appLocalDataDir();
    const path = await join(
      localDataDir,
      String(BaseDirectory.AppLocalData),
      "temp",
      "files"
    );

    const files = await readDirRecursive(path);

    let assetUrls: string[] = [];
    for (const f of files) {
      const assetUrl = getAssetUrl(f.path);
      assetUrls.push(assetUrl);
    }

    assetUrls.sort((a: string, b: string) => {
      const aName = a.split("/").pop() || "";
      const bName = b.split("/").pop() || "";
      return aName.localeCompare(bName);
    });

    setFileList(assetUrls);
  };

  const getAssetUrl = (filePath: string) => {
    return convertFileSrc(filePath);
  };

  const goToNextPage = (currentPage: number) => {
    if (currentPage >= fileList.length - 1) {
      handlePageEvent(fileList.length);
      setCurrentPage(fileList.length);
      return;
    }

    const increment = pageMode === "double" ? 2 : 1;
    handlePageEvent(currentPage + increment);
    setCurrentPage(currentPage + increment);
  };

  const goToPreviousPage = (currentPage: number) => {
    if (currentPage <= 1) {
      handlePageEvent(1);
      setCurrentPage(1);
      return;
    }

    const decrement = pageMode === "double" ? 2 : 1;
    handlePageEvent(currentPage - decrement);
    setCurrentPage(currentPage - decrement);
  };

  const jumpToPage = (pageId: number) => {
    setCurrentPage(pageId);
    handlePageEvent(pageId);
  };

  const handlePageEvent = async (pageId: number) => {
    if (isLocal) {
      if (db) {
        await db.execute("UPDATE file SET currentPage = $1 WHERE id = $2", [
          pageId,
          file.id,
        ]);
      }
    } else {
      fetch(`${server}/page-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          page: pageId,
        }),
      });
    }
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-0" style={{ zIndex: 999 }}>
        {currentPage === fileList.length ||
        currentPage === fileList.length - 1 ||
        displayMenu ? (
          <div
            className="flex w-full flex-row flex-wrap items-center justify-between bg-black/75 p-5"
            style={{ zIndex: 500 }}
          >
            <div className="flex flex-row flex-wrap items-center gap-5">
              <button
                className="bg-white/25 text-black font-semibold text-white p-2 rounded-md"
                onClick={() => {
                  if (searchParams.get("google") === "true") {
                    navigation(`/provider-google`);
                  } else if (searchParams.get("direct") === "true") {
                    navigation(`/local`);
                  } else if (isLocal) {
                    navigation(`/series/${seriesId}?isLocal=true`);
                  } else {
                    navigation(`/series/${seriesId}`);
                  }
                }}
              >
                {t("common.goBack")}
              </button>
              {file && (
                <div className="text-white font-semibold">
                  {file.volume > 0
                    ? `Volume ${file.volume}`
                    : file.chapter > 0
                    ? `Chapter ${file.chapter}`
                    : ""}
                </div>
              )}
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <button
                className="bg-black/50 text-white font-semibold text-white p-2 rounded-md"
                onClick={() => {
                  handleDirection(direction === "rtl" ? "ltr" : "rtl");
                }}
              >
                {direction === "rtl" ? t("settings.ltr") : t("settings.rtl")}
              </button>
              <button
                className="bg-black/50 text-white font-semibold text-white p-2 rounded-md"
                onClick={() => {
                  handleResizeMode(resizeMode === "full" ? "contain" : "full");
                }}
              >
                {resizeMode === "full"
                  ? t("settings.contain")
                  : t("settings.full")}
              </button>
              <button
                className="bg-black/50 text-white font-semibold text-white p-2 rounded-md"
                onClick={() => {
                  handlePageMode(pageMode === "double" ? "single" : "double");
                }}
              >
                {pageMode === "double"
                  ? t("settings.single")
                  : t("settings.double")}
              </button>
              <button
                className="bg-black/50 text-white font-semibold text-white p-2 rounded-md"
                onClick={() => setDisplayMenu(false)}
              >
                {t("read.menu")}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex w-full flex-row items-center justify-end p-5"
            style={{ zIndex: 500 }}
          >
            <button
              className="bg-black/50 text-white font-semibold text-white p-2 rounded-md"
              onClick={() => setDisplayMenu(true)}
            >
              {t("read.menu")}
            </button>
          </div>
        )}
      </div>
      <div
        className="bg-black"
        style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}
      >
        {fileList.length > 0 && (
          <>
            {resizeMode === "full" ? (
              <ImageComponent
                src={fileList[currentPage - 1]}
                pageNum={currentPage}
                full={true}
              />
            ) : (
              <div
                className="w-screen flex items-center justify-center bg-black"
                style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}
              >
                {pageMode === "single" ? (
                  <>
                    <div className="flex items-center justify-center">
                      <ImageComponent
                        src={fileList[currentPage - 1]}
                        pageNum={currentPage}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-row justify-center">
                    <div className="flex flex-row justify-center">
                      <ImageComponent
                        src={
                          direction === "ltr"
                            ? fileList[currentPage - 1]
                            : fileList[currentPage]
                        }
                        pageNum={
                          direction === "ltr" ? currentPage : currentPage + 1
                        }
                      />
                    </div>
                    <div className="flex flex-row justify-center">
                      <ImageComponent
                        src={
                          direction === "ltr"
                            ? fileList[currentPage]
                            : fileList[currentPage - 1]
                        }
                        pageNum={
                          direction === "ltr" ? currentPage + 1 : currentPage
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {fileList.length > 0 &&
        (displayMenu || currentPage >= fileList.length - 1) && (
          <div
            className="fixed bottom-0 left-0 right-0 z-10 w-full bg-black/75 p-5"
            style={{ zIndex: 500 }}
          >
            <div>
              <input
                type="range"
                id="slider"
                name="slider"
                min="1"
                max={fileList.length}
                value={currentPage}
                className="w-full mb-5"
                style={{
                  transform: direction === "rtl" ? "scaleX(-1)" : "none",
                }}
                onChange={(e) => {
                  jumpToPage(parseInt(e.target.value));
                }}
                step="1"
              />
            </div>
            <div className="flex flex-row items-center justify-center">
              <div>
                <button
                  className="bg-white/25 text-black font-semibold text-white p-2 rounded-md"
                  onClick={() => {
                    if (direction === "ltr") {
                      goToPreviousPage(currentPage);
                    } else {
                      goToNextPage(currentPage);
                    }
                  }}
                >
                  <span className="text-center text-lg font-bold text-white">
                    &lt;&lt;{" "}
                    {direction === "ltr" ? t("read.prev") : t("read.next")}
                  </span>
                </button>
              </div>
              <div className="mx-3 text-center text-white">
                {currentPage}
                {pageMode === "double" &&
                  fileList[currentPage] &&
                  ` - ${currentPage + 1}`}{" "}
                {t("read.of")} {fileList.length}
              </div>
              <div>
                <button
                  className="bg-white/25 text-black font-semibold text-white p-2 rounded-md"
                  onClick={() => {
                    if (direction === "ltr") {
                      goToNextPage(currentPage);
                    } else {
                      goToPreviousPage(currentPage);
                    }
                  }}
                >
                  <span className="text-center text-lg font-bold text-white">
                    {direction === "ltr" ? t("read.next") : t("read.prev")}{" "}
                    &gt;&gt;
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      <div
        className="absolute top-0 left-0 bottom-0 w-[12rem]"
        style={{ zIndex: 50 }}
        onClick={() => {
          if (direction === "ltr") {
            goToPreviousPage(currentPage);
          } else {
            goToNextPage(currentPage);
          }
        }}
      />
      <div
        className="absolute top-0 right-0 bottom-0 w-[12rem]"
        style={{ zIndex: 50 }}
        onClick={() => {
          if (direction === "ltr") {
            goToNextPage(currentPage);
          } else {
            goToPreviousPage(currentPage);
          }
        }}
      />
      {fileList.length === 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 w-full bg-black/75 p-5">
          <div className="flex flex-row items-center justify-center text-white">
            {downloading && !isLocal
              ? t("read.downloading")
              : t("read.extractingArchive")}
          </div>
        </div>
      )}
      {nextFile && fileList.length > 0 && currentPage >= fileList.length && (
        <div
          className="absolute left-[1rem] h-[50%] top-[25%] flex items-center w-[12rem]"
          style={{ zIndex: 100 }}
        >
          <img
            onClick={async () => {
              setFileId(nextFile.id);
            }}
            src={nextFile.filePreview}
            alt={t("read.nextFile")}
            className="w-full object-cover rounded-lg"
          />
        </div>
      )}
    </>
  );
}
