import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, copyFile } from "@tauri-apps/plugin-fs";
import { useCallback, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import Refresh from "../components/library/Refresh";
import GridDisplay from "../components/library/GridDisplay";
import Filter from "../components/library/Filter";
import { useLocal } from "../hooks/useLocal";
import { useLocalStore } from "../store/local";
import { toast } from "react-toastify";

export default function LocalScreen() {
  const { retrieveLocalData } = useLocal();
  const { localData } = useLocalStore();
  const navigate = useNavigate();

  const [gridColumns, setGridColumns] = useState(6);
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState<string | null>(null);
  const [loadingDirect, setLoadingDirect] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);

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
    retrieveLocalData();
  }, []);

  const handleFileDialog = async () => {
    try {
      const file = await open({
        multiple: false,
        directory: false,
      });

      if (file) {
        setLoadingDirect(true);

        await copyFile(file, `${BaseDirectory.AppLocalData}/local.zip`, {
          toPathBaseDir: BaseDirectory.AppLocalData,
        });

        setLoadingDirect(false);

        navigate(`/read/0?direct=true` as any);
      }
    } catch (e) {
      setLoadingDirect(false);
      toast.error(`Failed to open local file. ${e}`);
    }
  };

  const handleSeriesPress = async (seriesId: number) => {
    navigate(`/series/${seriesId}?isLocal=true` as any);
  };

  const getGridTemplateColumns = (columns: number) =>
    `repeat(${columns}, minmax(0, 1fr))`;

  const LibraryGrid = () => {
    const parentRef = useRef<HTMLDivElement>(null);

    const filteredData = localData?.filter((series: any) => {
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

    const rowVirtualizer = useVirtualizer({
      count: Math.ceil((filteredData?.length || 0) / gridColumns),
      getScrollElement: () => parentRef.current,
      estimateSize: () => 265,
      overscan: 5,
    });

    return (
      <div
        ref={parentRef}
        className={`h-full overflow-auto pt-[2rem] ${
          gridColumns === 1 ? "pb-30" : "pb-20"
        }`}
        style={{
          scrollbarWidth: "none",
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
                    top: 0,
                    transform: `translateY(${virtualRow.start}px)`,
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
          src={`${item.coverImage}`}
          style={{
            height: 230,
            borderRadius: 10,
            overflow: "hidden",
            width: "100%",
          }}
          className="w-full h-full object-cover"
        />
        <div className="mt-2 line-clamp-1 text-center text-sm">
          {item.title}
        </div>
      </div>
    ),
    [localData]
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
                  <Refresh />
                </div>
                <div className="ml-3">
                  <span className="text-lg font-bold">Local</span>
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
                  local
                />
              </div>
            </div>
          </div>
          {loadingDirect ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-lg font-bold">Opening local file...</span>
            </div>
          ) : (
            <div className="h-full">{localData && <LibraryGrid />}</div>
          )}
        </div>
        {loadingDirect ? (
          <></>
        ) : (
          <>
            {gridColumns === 1 ? (
              <>
                <div className="fixed bottom-[7rem] right-[10%] w-[80%] flex flex-row gap-3">
                  <div className="w-full">
                    <button
                      onClick={handleFileDialog}
                      className="w-full bg-secondary text-white px-4 py-2 rounded-md hover:cursor-pointer"
                    >
                      <span className="text-md font-bold">Add Series</span>
                    </button>
                  </div>
                  <div className="w-full">
                    <button
                      onClick={handleFileDialog}
                      className="w-full bg-primary text-white px-4 py-2 rounded-md hover:cursor-pointer"
                    >
                      <span className="text-md font-bold">Open File</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="fixed bottom-2 right-2 flex flex-col gap-3">
                  <div className="w-[8rem]">
                    <button
                      onClick={() => navigate("/local/create")}
                      className="w-full bg-secondary text-white px-4 py-2 rounded-md hover:cursor-pointer"
                    >
                      <span className="text-md font-bold">Add Series</span>
                    </button>
                  </div>
                  <div className="w-[8rem]">
                    <button
                      onClick={handleFileDialog}
                      className="w-full bg-primary text-white px-4 py-2 rounded-md hover:cursor-pointer"
                    >
                      <span className="text-md font-bold">Open File</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
