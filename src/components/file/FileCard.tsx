import { ask } from "@tauri-apps/plugin-dialog";
import { toast } from "react-toastify";
import { memo } from "react";

import { useTranslation } from "../../hooks/useTranslation";
import { useCommonStore } from "../../store/common";
import { useImportQueueStore } from "../../store/importQueue";

interface FileData {
  id: number;
  coverImage?: string;
  volume?: number;
  chapter?: number;
  currentPage: number;
  totalPages: number;
}

interface Series {
  id: number;
  libraryId: number;
}

interface FileCardProps {
  file: FileData;
  handleFilePress: (fileId: number) => void;
  libraryId?: number | null;
  series?: Series | null;
  recentlyRead?: boolean;
}

const ImportButton = memo(
  ({ onImport }: { onImport: (e: React.MouseEvent) => Promise<void> }) => (
    <button
      className="absolute right-1 top-1 bg-black/50 p-2 rounded-full"
      onClick={onImport}
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
  )
);

const ChapterBadge = memo(
  ({ volume, chapter }: { volume?: number; chapter?: number }) => {
    if (!volume && !chapter) return null;

    return (
      <div className="absolute left-2 top-2 bg-black/75 px-2 py-1 text-center font-semibold text-white rounded-full">
        {volume && volume > 0 ? `v${volume}` : `c${chapter}`}
      </div>
    );
  }
);

const ProgressBadge = memo(
  ({
    currentPage,
    totalPages,
  }: {
    currentPage: number;
    totalPages: number;
  }) => {
    const getProgressClass = () => {
      if (currentPage === totalPages) return "bg-green-500/85 text-black";
      if (currentPage > 1) return "bg-orange-500/85 text-white";
      return "bg-black/75 text-white";
    };

    const getProgressText = () => {
      if (currentPage === 1) return totalPages;
      if (currentPage === totalPages) return totalPages;
      return `${currentPage} / ${totalPages}`;
    };

    return (
      <div
        className={`absolute bottom-2 right-2 px-2 py-1 text-center font-semibold rounded-full ${getProgressClass()}`}
      >
        {getProgressText()}
      </div>
    );
  }
);

const FileCard = memo(function FileCard({
  file,
  handleFilePress,
  libraryId = null,
  series = null,
  recentlyRead = false,
}: FileCardProps) {
  const { server } = useCommonStore();
  const { importFile } = useImportQueueStore();
  const { t } = useTranslation();

  const isLocal = libraryId === null;

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const answer = await ask(t("library.importAreYouSure"), {
        title: t("library.importFile"),
        kind: "info",
      });

      if (answer && series) {
        importFile(series.id, file.id);
        toast.success(t("library.startedImport"));
      }
    } catch (error) {
      console.error("Failed to import file:", error);
    }
  };

  return (
    <div
      onClick={() => handleFilePress(file.id)}
      role="button"
      className="mb-3 w-full aspect-[4/1.5] hover:cursor-pointer"
    >
      <div className="relative mx-3">
        <img
          src={
            isLocal
              ? file.coverImage
              : `${server}/preview-image/${series?.libraryId}/${series?.id}/${file.id}.jpg`
          }
          className="h-full w-full object-cover rounded-lg"
          loading="lazy"
          alt=""
        />

        {!isLocal && !recentlyRead && <ImportButton onImport={handleImport} />}

        <ChapterBadge volume={file.volume} chapter={file.chapter} />
        <ProgressBadge
          currentPage={file.currentPage}
          totalPages={file.totalPages}
        />
      </div>
    </div>
  );
});

export default FileCard;
