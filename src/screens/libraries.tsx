import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import FileCard from "../components/file/FileCard";
import CreateLibrary from "../components/libraries/CreateLibrary";
import { useLibrary } from "../hooks/useLibrary";
import { useLibraryStore } from "../store/library";
import { Library } from "../interfaces/library";
import { useCommonStore } from "../store/common";

interface RecentlyReadItem {
  id: number;
  currentPage: number;
  totalPages: number;
  series: {
    id: number;
    libraryId: number;
  };
}

const LibraryImage = memo(
  ({ src, className }: { src: string; className: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          src={src}
          alt=""
          className={`w-full h-full object-cover ${className}`}
          onLoad={() => setIsLoading(false)}
          loading="lazy"
        />
      </div>
    );
  }
);

const LibraryCard = memo(
  ({
    library,
    loading,
    onPress,
    server,
  }: {
    library: Library;
    loading: boolean;
    onPress: (library: Library) => void;
    server: string;
  }) => (
    <button
      className={`w-full flex flex-col gap-3 rounded-xl bg-white text-white shadow-md shadow-blue-100/10 hover:cursor-pointer ${
        loading ? "opacity-50" : ""
      }`}
      onClick={() => onPress(library)}
    >
      <div className="grid grid-cols-4 rounded-t-md bg-primary aspect-[4/1.5]">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-full">
            {library.series && library.series.length > index ? (
              <LibraryImage
                src={`${server}/cover-image/${library.id}/${library.series[index].id}.jpg`}
                className={`${
                  index === 0
                    ? "rounded-tl-md"
                    : index === 3
                    ? "rounded-tr-md"
                    : ""
                }`}
              />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
        ))}
      </div>
      <div className="px-3 pb-5 flex flex-col gap-2">
        <h2 className="text-center text-black text-xl font-semibold text-start line-wrap-1">
          {library.name}
        </h2>
        <div className="flex">
          <div className="bg-primary/10 text-primary text-center text-sm rounded-full font-semibold py-2 px-3">
            {library.seriesCount} series
          </div>
        </div>
      </div>
    </button>
  )
);

const RecentlyReadSection = memo(
  ({
    items,
    onFilePress,
  }: {
    items: RecentlyReadItem[];
    onFilePress: (fileId: number, seriesId: number) => void;
  }) => {
    if (items.length === 0) return null;

    return (
      <div className="mt-7">
        <div className="mb-3 px-3">
          <h2 className="text-2xl font-semibold">Resume reading...</h2>
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
          {items.map((item) => (
            <FileCard
              key={item.id}
              file={item}
              handleFilePress={() => onFilePress(item.id, item.series.id)}
              libraryId={item.series.libraryId}
              series={item.series}
              recentlyRead
            />
          ))}
        </div>
      </div>
    );
  }
);

export default function LibrariesScreen() {
  const { server } = useCommonStore();
  const { retrieveLibrary, retrieveLibraries, getRecentlyRead } = useLibrary();
  const { librariesData } = useLibraryStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      const recentlyReadData = await getRecentlyRead();
      if (recentlyReadData) {
        const filteredRead = recentlyReadData.filter(
          (item: RecentlyReadItem) => item.currentPage < item.totalPages
        );
        setRecentlyRead(filteredRead);
      }
      await retrieveLibraries();
    };

    initializeData();
  }, []);

  const handleFilePress = useCallback(
    (fileId: number, seriesId: number) => {
      navigate(`/read/${fileId}?seriesId=${seriesId}`);
    },
    [navigate]
  );

  const handleLibraryPress = useCallback(
    async (library: Library) => {
      if (loading) return;

      setLoading(true);
      try {
        await retrieveLibrary(library.id);
        navigate(`/library?libraryId=${library.id}`);
      } finally {
        setLoading(false);
      }
    },
    [loading, retrieveLibrary, navigate]
  );

  return (
    <>
      <Container className="flex-1 px-5 pb-24">
        <div className="flex flex-row justify-end py-3">
          <CreateLibrary />
        </div>
        <div className="mb-3 px-3">
          <h2 className="text-2xl font-semibold">Libraries</h2>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-3 px-3">
          {librariesData?.map((library) => (
            <LibraryCard
              key={library.id}
              library={library}
              loading={loading}
              onPress={handleLibraryPress}
              server={server}
            />
          ))}
        </div>
        <RecentlyReadSection
          items={recentlyRead}
          onFilePress={handleFilePress}
        />
      </Container>
      <TabBar />
    </>
  );
}
