import { ask } from "@tauri-apps/plugin-dialog";
import { useCallback, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "react-toastify";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import Refresh from "../components/library/Refresh";
import GridDisplay from "../components/library/GridDisplay";
import Filter from "../components/library/Filter";
import { useTranslation } from "../hooks/useTranslation";
import { useCommonStore } from "../store/common";
import { useImportQueueStore } from "../store/importQueue";
import { useLibraryStore } from "../store/library";
import { useLibrary } from "../hooks/useLibrary";
import ExitLibrary from "../components/library/ExitLibrary";

export default function LibraryScreen() {
  const { libraryData } = useLibraryStore();
  const { server } = useCommonStore();
  const { currentFiles, importSeries } = useImportQueueStore();
  const { scanLibrary } = useLibrary();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gridColumns, setGridColumns] = useState(6);
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const headerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollPosition = useRef<number>(0);

  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);

  useEffect(() => {
    if (lastScrollPosition.current > 0) {
      setTimeout(() => {
        setForceUpdate((prev) => prev + 1);
      }, 50);
    }
  }, [currentFiles]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setGridColumns(isMobile ? 1 : 6);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!headerRef.current || !tabBarRef.current) return;

    const headerObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setHeaderHeight(height);
    });

    const tabBarObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setTabBarHeight(height);
    });

    headerObserver.observe(headerRef.current);
    tabBarObserver.observe(tabBarRef.current);

    return () => {
      headerObserver.disconnect();
      tabBarObserver.disconnect();
    };
  }, []);

  const handleScanLibrary = async () => {
    const answer = await ask(t("library.scanLibraryAreYouSure"), {
      title: t("library.scanLibrary"),
      kind: "info",
    });

    if (answer) {
      const result = await scanLibrary();

      if (result) {
        toast.success(t("library.scanLibrarySuccess"));
      } else {
        toast.error(t("library.scanLibraryError"));
      }
    }
  };

  const handleSeriesPress = async (seriesId: number) => {
    navigate(`/series/${seriesId}?libraryId=${libraryData?.id}` as any);
  };

  const getGridTemplateColumns = (columns: number) =>
    `repeat(${columns}, minmax(0, 1fr))`;

  const LibraryGrid = () => {
    const filteredData = libraryData?.series?.filter((series: any) => {
      if (authorFilter && series.mangaData?.authors) {
        const hasAuthor = series.mangaData.authors.some((author: string) =>
          author.toLowerCase().includes(authorFilter.toLowerCase())
        );
        if (!hasAuthor) return false;
      }

      if (genreFilter && series.mangaData?.genres) {
        const hasGenre = series.mangaData.genres.some((genre: string) =>
          genre.toLowerCase().includes(genreFilter.toLowerCase())
        );
        if (!hasGenre) return false;
      }

      if (titleFilter && titleFilter.length > 0) {
        const hasTitle = series.title
          .toLowerCase()
          .includes(titleFilter.toLowerCase());
        if (!hasTitle) return false;
      }

      return true;
    });

    useEffect(() => {
      if (containerRef.current && lastScrollPosition.current > 0) {
        containerRef.current.scrollTop = lastScrollPosition.current;
      }
    }, [forceUpdate]);

    const rowVirtualizer = useVirtualizer({
      count: Math.ceil((filteredData?.length || 0) / gridColumns),
      getScrollElement: () => containerRef.current,
      estimateSize: () => 265,
      overscan: 5,
    });

    return (
      <div
        ref={containerRef}
        className={`h-full overflow-auto pt-[2rem] ${
          gridColumns === 1 ? "pb-30" : "pb-20"
        }`}
        style={{
          scrollbarWidth: "none",
        }}
        onScroll={(e) => {
          const newScrollTop = e.currentTarget.scrollTop;
          lastScrollPosition.current = newScrollTop;
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * gridColumns;
            const rowItems = filteredData?.slice(
              startIndex,
              startIndex + gridColumns
            );

            return (
              <div
                key={virtualRow.index}
                className="gap-4 px-4 grid grid-cols-1 md:grid-cols-[var(--grid-cols)]"
                style={
                  {
                    position: "absolute",
                    top: `${virtualRow.start}px`,
                    left: 0,
                    width: "100%",
                    "--grid-cols": getGridTemplateColumns(gridColumns),
                  } as React.CSSProperties
                }
              >
                {rowItems?.map((item: any) => (
                  <div key={item.id.toString()}>{renderItem({ item })}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <div
        onClick={() => handleSeriesPress(item.id)}
        className="relative mb-1 w-full cursor-pointer"
        role="button"
      >
        <img
          src={`${server}/cover-image/${libraryData?.id}/${item.id}.jpg`}
          style={{
            height: 230,
            borderRadius: 10,
            overflow: "hidden",
            width: "100%",
          }}
          className="w-full h-full object-cover"
        />
        <button
          className="absolute right-1 top-1 bg-black/50 p-2 rounded-full"
          onClick={async (e) => {
            e.stopPropagation();

            const answer = await ask(t("library.importAreYouSure"), {
              title: t("library.importSeries"),
              kind: "info",
            });

            if (answer) {
              importSeries(item.id);
              toast.success(t("library.startedImport"));
            }
          }}
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="#FFFFFF"
            height={24}
            width={24}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </button>
        <div className="mt-2 line-clamp-1 text-center text-sm">
          {item.title}
        </div>
      </div>
    ),
    [server, libraryData?.id]
  );

  return (
    <>
      <Container className="flex-1 px-5 md:px-0">
        <div
          style={{
            height: `calc(100vh - 30px - ${tabBarHeight}px)`,
            paddingTop: `${headerHeight}px`,
          }}
          className="overflow-hidden"
        >
          <div ref={headerRef} className={styles.header}>
            <div className={styles.headerInner}>
              <div className="flex flex-row items-center">
                <div>
                  <ExitLibrary />
                </div>
                <div className="ml-3">
                  <Refresh />
                </div>
                <div className="ml-3">
                  <span className="text-lg font-bold">{libraryData?.name}</span>
                  <span
                    className={`ml-3 text-sm ${
                      currentFiles.length > 0 ? "inline" : "hidden"
                    }`}
                  >
                    {t("library.currentlyImporting", {
                      count: currentFiles.length,
                    })}
                  </span>
                </div>
              </div>
              <div className="ml-auto mr-0 flex flex-row items-center">
                <GridDisplay
                  gridColumns={gridColumns}
                  setGridColumns={setGridColumns}
                />
                <Filter
                  states={{
                    authorFilter: authorFilter || "",
                    setAuthorFilter,
                    titleFilter: titleFilter || "",
                    setTitleFilter,
                    genreFilter: genreFilter || "",
                    setGenreFilter,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="h-full">
            {libraryData && libraryData.series && <LibraryGrid />}
          </div>
        </div>
        {gridColumns === 1 ? (
          <>
            <div className="fixed bottom-[7rem] right-[10%] w-[80%] flex flex-row gap-3">
              <div className="w-full">
                <button
                  onClick={handleScanLibrary}
                  className="w-full bg-secondary text-white px-4 py-2 rounded-md"
                >
                  <span className="text-md font-bold">
                    {t("library.scanLibrary")}
                  </span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="fixed bottom-2 right-2 flex flex-col gap-3">
              <div className="w-[8rem]">
                <button
                  onClick={handleScanLibrary}
                  className="w-full bg-secondary text-white px-4 py-2 rounded-md"
                >
                  <span className="text-md font-bold">
                    {t("library.scanLibrary")}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </Container>
      <div ref={tabBarRef} className="fixed bottom-0 left-0 right-0">
        <TabBar />
      </div>
    </>
  );
}

const styles = {
  header:
    "flex flex-row justify-between items-center w-full p-5 fixed top-0 left-0 right-0 z-10",
  headerInner:
    "flex flex-row items-center w-full bg-white rounded-full p-3 px-5",
};
