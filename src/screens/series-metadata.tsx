import { open, confirm } from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory,
  copyFile,
  remove,
  open as openFile,
} from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";
import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Container } from "../components/Container";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useSeriesStore } from "../store/series";
import { useSeries } from "../hooks/useSeries";
import { useTranslation } from "../hooks/useTranslation";

interface MangaData {
  metadata_id?: string;
  synopsis?: string;
  authors: string[];
  genres: string[];
  themes: string[];
}

interface SeriesPayload {
  id: number;
  title: string;
  coverOriginal?: string;
  mangaData: MangaData;
}

const MetadataButton = memo(
  ({
    onClick,
    children,
  }: {
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="bg-primary w-full hover:cursor-pointer hover:bg-secondary rounded-lg px-3 py-1"
    >
      <span className="text-lg font-semibold text-white">{children}</span>
    </button>
  )
);

const TagList = memo(
  ({
    items,
    onDelete,
    type,
  }: {
    items: string[];
    onDelete: (type: keyof MangaData, index: number) => void;
    type: keyof MangaData;
  }) => {
    if (!items.length) return null;

    return (
      <div className="flex flex-row flex-wrap gap-5 my-5">
        {items.map((item, index) => (
          <div
            key={item}
            className="bg-secondary text-sm rounded-lg px-3 py-1 border border-tertiary text-white font-semibold"
          >
            <button
              onClick={() => onDelete(type, index)}
              className="text-white mr-2 hover:cursor-pointer"
            >
              X
            </button>
            {item}
          </div>
        ))}
      </div>
    );
  }
);

const MetadataInput = memo(
  ({
    label,
    value,
    onChange,
    disabled = false,
    isTextArea = false,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    isTextArea?: boolean;
  }) => (
    <div>
      <div className="font-semibold">{label}</div>
      {isTextArea ? (
        <textarea
          value={value}
          className="w-full bg-white h-[12rem] rounded-lg px-3 py-1 border border-secondary"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          value={value}
          className={`w-full bg-white rounded-lg px-3 py-1 border border-secondary ${
            disabled ? "opacity-50" : ""
          }`}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
);

const TagInput = memo(
  ({
    value,
    onChange,
    onAdd,
    addLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    onAdd: () => void;
    addLabel: string;
  }) => (
    <div className="flex flex-row">
      <input
        type="text"
        value={value}
        className="w-full bg-white rounded-lg rounded-r-none px-3 py-1 border border-secondary"
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        onClick={onAdd}
        className="bg-primary hover:cursor-pointer hover:bg-secondary rounded-lg rounded-l-none px-3 py-1 text-white font-semibold w-[12rem]"
      >
        {addLabel}
      </button>
    </div>
  )
);

export default function SeriesMetadataScreen() {
  const navigation = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const libraryId = parseInt(searchParams.get("libraryId") || "0");

  const { server } = useCommonStore();
  const { series } = useSeriesStore();
  const [payload, setPayload] = useState<SeriesPayload | null>(null);
  const { t } = useTranslation();
  const { retrieveSeries, retrieveLocalSeries } = useSeries();

  const [isLocal] = useState(searchParams.get("isLocal") === "true");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [theme, setTheme] = useState("");

  const retrieveSeriesData = useCallback(async () => {
    try {
      const seriesId = parseInt(String(id), 10);
      const data = isLocal
        ? await retrieveLocalSeries(seriesId)
        : await retrieveSeries(seriesId);

      if (!data?.id || !data?.title) return;

      const initializedData: SeriesPayload = {
        id: data.id,
        title: data.title,
        coverOriginal: (data as any).coverOriginal,
        mangaData: {
          ...(data.mangaData || {}),
          authors: data.mangaData?.authors || [],
          genres: data.mangaData?.genres || [],
          themes: data.mangaData?.themes || [],
          synopsis: data.mangaData?.synopsis || "",
        },
      };

      setPayload(initializedData);
    } catch (error) {
      console.error("Failed to retrieve series data:", error);
    }
  }, [id, isLocal, retrieveLocalSeries, retrieveSeries]);

  useEffect(() => {
    retrieveSeriesData();
  }, []);

  const handleDeletion = useCallback((type: keyof MangaData, index: number) => {
    setPayload((prev) => {
      if (!prev?.mangaData?.[type] || typeof prev.mangaData[type] === "string")
        return prev;
      return {
        ...prev,
        mangaData: {
          ...prev.mangaData,
          [type]: (prev.mangaData[type] as string[]).filter(
            (_: string, i: number) => i !== index
          ),
        },
      };
    });
  }, []);

  const handleGoBack = useCallback(() => {
    navigation(
      `/series/${id}?libraryId=${libraryId}${isLocal ? "&isLocal=true" : ""}`
    );
  }, [navigation, id, libraryId, isLocal]);

  const updateCover = useCallback(async () => {
    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: "Image", extensions: ["gif", "webp", "png", "jpeg", "jpg"] },
        ],
      });

      if (!file) return;

      const fileName = await basename(file);

      if (isLocal) {
        await copyFile(
          file,
          `${BaseDirectory.AppLocalData}/series/${id}/${fileName}`,
          {
            toPathBaseDir: BaseDirectory.AppLocalData,
          }
        );

        await db.execute("UPDATE series SET coverImage = $1 WHERE id = $2", [
          fileName,
          id,
        ]);

        if (payload?.coverOriginal) {
          try {
            await remove(
              `${BaseDirectory.AppLocalData}/series/${id}/${payload.coverOriginal}`,
              {
                baseDir: BaseDirectory.AppLocalData,
              }
            );
          } catch (error) {
            console.error("Failed to remove old cover:", error);
          }
        }
      } else {
        await copyFile(file, `${BaseDirectory.AppLocalData}/${fileName}`, {
          toPathBaseDir: BaseDirectory.AppLocalData,
        });

        const fileData = await openFile(
          `${BaseDirectory.AppLocalData}/${fileName}`,
          {
            read: true,
            baseDir: BaseDirectory.AppLocalData,
          }
        );

        const stat = await fileData.stat();
        const buf = new Uint8Array(stat.size);
        await fileData.read(buf);
        await fileData.close();

        const imageBlob = new Blob([buf], { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("coverImage", imageBlob, fileName);

        await fetch(`${server}/series/${id}/cover-image`, {
          method: "POST",
          body: formData,
        });

        try {
          await remove(`${BaseDirectory.AppLocalData}/${fileName}`, {
            baseDir: BaseDirectory.AppLocalData,
          });
        } catch (error) {
          console.error("Failed to remove temporary file:", error);
        }
      }

      toast.success(t("seriesMetadata.updateCoverSuccess"));
    } catch (error) {
      console.error("Failed to update cover:", error);
      toast.error(t("seriesMetadata.updateCoverError"));
    }
  }, [id, isLocal, server, payload?.coverOriginal, t]);

  const saveChanges = useCallback(async () => {
    if (!payload || !series) return;

    try {
      const confirmation = await confirm(t("seriesMetadata.cannotRevert"), {
        title: t("seriesMetadata.saveChanges"),
        kind: "warning",
      });

      if (!confirmation) return;

      if (payload.mangaData.metadata_id !== series.mangaData.metadata_id) {
        console.log("Updating MAL ID");
        return;
      }

      if (isLocal) {
        await db.execute(
          "UPDATE series SET title = $1, mangaData = $2 WHERE id = $3",
          [payload.title, JSON.stringify(payload.mangaData), id]
        );
      } else {
        await Promise.all([
          fetch(`${server}/series/${id}/title`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: payload.title }),
          }),
          fetch(`${server}/series/${id}/mangaData`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mangaData: payload.mangaData }),
          }),
        ]);
      }

      toast.success(t("seriesMetadata.saveChangesSuccess"));
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  }, [payload, series, isLocal, id, server, t]);

  if (!series || !payload) {
    return <Container className="px-5 pt-5" />;
  }

  return (
    <Container className="px-5 pt-5">
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MetadataButton onClick={handleGoBack}>
            {t("common.goBack")}
          </MetadataButton>
          <MetadataButton onClick={updateCover}>
            {t("seriesMetadata.updateCover")}
          </MetadataButton>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5">
          <MetadataInput
            label="MAL ID"
            value={payload.mangaData.metadata_id || ""}
            onChange={(value) =>
              setPayload((prev) =>
                prev
                  ? {
                      ...prev,
                      mangaData: { ...prev.mangaData, metadata_id: value },
                    }
                  : null
              )
            }
            disabled
          />

          <MetadataInput
            label={t("seriesMetadata.title")}
            value={payload.title}
            onChange={(value) =>
              setPayload((prev) => (prev ? { ...prev, title: value } : null))
            }
          />

          <MetadataInput
            label={t("seriesMetadata.synopsis")}
            value={payload.mangaData.synopsis || ""}
            onChange={(value) =>
              setPayload((prev) =>
                prev
                  ? {
                      ...prev,
                      mangaData: { ...prev.mangaData, synopsis: value },
                    }
                  : null
              )
            }
            isTextArea
          />

          <div>
            <div className="font-semibold">{t("seriesMetadata.authors")}</div>
            <TagList
              items={payload.mangaData.authors}
              onDelete={handleDeletion}
              type="authors"
            />
            <TagInput
              value={author}
              onChange={setAuthor}
              onAdd={() => {
                setPayload((prev) =>
                  prev
                    ? {
                        ...prev,
                        mangaData: {
                          ...prev.mangaData,
                          authors: [...prev.mangaData.authors, author],
                        },
                      }
                    : null
                );
                setAuthor("");
              }}
              addLabel={t("seriesMetadata.addAuthor")}
            />
          </div>

          <div>
            <div className="font-semibold">{t("seriesMetadata.genres")}</div>
            <TagList
              items={payload.mangaData.genres}
              onDelete={handleDeletion}
              type="genres"
            />
            <TagInput
              value={genre}
              onChange={setGenre}
              onAdd={() => {
                setPayload((prev) =>
                  prev
                    ? {
                        ...prev,
                        mangaData: {
                          ...prev.mangaData,
                          genres: [...prev.mangaData.genres, genre],
                        },
                      }
                    : null
                );
                setGenre("");
              }}
              addLabel={t("seriesMetadata.addGenre")}
            />
          </div>

          <div>
            <div className="font-semibold">{t("seriesMetadata.themes")}</div>
            <TagList
              items={payload.mangaData.themes}
              onDelete={handleDeletion}
              type="themes"
            />
            <TagInput
              value={theme}
              onChange={setTheme}
              onAdd={() => {
                setPayload((prev) =>
                  prev
                    ? {
                        ...prev,
                        mangaData: {
                          ...prev.mangaData,
                          themes: [...prev.mangaData.themes, theme],
                        },
                      }
                    : null
                );
                setTheme("");
              }}
              addLabel={t("seriesMetadata.addTheme")}
            />
          </div>

          <MetadataButton onClick={saveChanges}>
            {t("seriesMetadata.saveChanges")}
          </MetadataButton>
        </div>
      </div>
    </Container>
  );
}
