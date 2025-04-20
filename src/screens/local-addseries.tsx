import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, mkdir } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { useState, useCallback, memo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Container } from "../components/Container";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useSeriesStore } from "../store/series";
import { useTranslation } from "../hooks/useTranslation";
import { getJikanMetadata } from "../lib/metadata";

interface MangaData {
  metadata_id?: string;
  synopsis?: string;
  authors: string[];
  genres: string[];
  themes: string[];
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

export default function LocalAddSeriesScreen() {
  const navigation = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const libraryId = parseInt(searchParams.get("libraryId") || "0");

  const { server } = useCommonStore();
  const { series } = useSeriesStore();
  const [payload, setPayload] = useState<any>({
    title: "",
    mangaData: {
      metadata_id: "",
      authors: [],
      genres: [],
      themes: [],
    },
  });
  const { t } = useTranslation();
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [theme, setTheme] = useState("");

  const handleDeletion = useCallback((type: keyof MangaData, index: number) => {
    setPayload((prev: any) => {
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
    navigation(`/local`);
  }, [navigation, id, libraryId]);

  const addSeries = useCallback(async () => {
    if (payload.title === "") {
      toast.error("Please enter a title.");
      return;
    }

    const result = await db.execute(
      `INSERT INTO series (
        title, titleSafe, path, mangaData, metadata, coverImage
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        payload.title,
        payload.title.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        `/${payload.title.toLowerCase().replace(/[^a-z0-9-]/g, "")}`,
        JSON.stringify(payload.mangaData),
        JSON.stringify({}),
        "cover.jpg",
      ]
    );

    try {
      await mkdir(
        `${BaseDirectory.AppLocalData}/series/${result.lastInsertId}/files`,
        {
          baseDir: BaseDirectory.AppLocalData,
          recursive: true,
        }
      );
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }

    if (payload.mangaData.coverImage) {
      const localDataDir = await appLocalDataDir();

      const path = await join(
        localDataDir,
        String(BaseDirectory.AppLocalData),
        "series",
        String(result.lastInsertId),
        "cover.jpg"
      );

      console.log("Downloading cover image", `${payload.mangaData.coverImage}`);
      console.log(path);

      await invoke("download_file", {
        url: `${payload.mangaData.coverImage}`,
        path,
      });
    }

    toast.success("Series added successfully.");

    navigation(`/local`);
  }, [payload, series, id, server, t]);

  const searchMetadata = useCallback(
    async (by: "id" | "q") => {
      try {
        const metadata = await getJikanMetadata(
          by === "id" ? payload.mangaData.metadata_id : payload.title,
          by
        );

        setPayload((prev: any) => ({
          ...prev,
          title: metadata.title,
          mangaData: { ...prev.mangaData, ...metadata },
        }));
      } catch (error) {
        console.error("Failed to search metadata:", error);
        toast.error("No results found.");
      }
    },
    [payload.title, payload.mangaData.metadata_id]
  );

  return (
    <Container className="px-5 pt-5">
      <div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
          <MetadataButton onClick={handleGoBack}>
            {t("common.goBack")}
          </MetadataButton>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5">
          <div>
            <div className="font-semibold">Retrieve Metadata (MAL ID)</div>
            <div className="flex flex-row">
              <input
                type="number"
                value={payload.mangaData.metadata_id || ""}
                className="w-full bg-white rounded-lg rounded-r-none px-3 py-1 border border-secondary"
                onChange={(e) =>
                  setPayload((prev: any) => ({
                    ...prev,
                    mangaData: {
                      ...prev.mangaData,
                      metadata_id: e.target.value,
                    },
                  }))
                }
              />
              <button
                onClick={() => searchMetadata("id")}
                className="bg-primary hover:cursor-pointer hover:bg-secondary rounded-lg rounded-l-none px-3 py-1 text-white font-semibold w-[12rem]"
              >
                Retrieve
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <div className="font-semibold">{t("seriesMetadata.title")}</div>
              <div className="flex flex-row">
                <input
                  type="text"
                  value={payload.title || ""}
                  className="w-full bg-white rounded-lg rounded-r-none px-3 py-1 border border-secondary"
                  onChange={(e) =>
                    setPayload((prev: any) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
                <button
                  onClick={() => searchMetadata("q")}
                  className="bg-primary hover:cursor-pointer hover:bg-secondary rounded-lg rounded-l-none px-3 py-1 text-white font-semibold w-[12rem]"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <MetadataInput
            label={t("seriesMetadata.synopsis")}
            value={payload.mangaData.synopsis || ""}
            onChange={(value) =>
              setPayload((prev: any) =>
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
                setPayload((prev: any) =>
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
                setPayload((prev: any) =>
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
                setPayload((prev: any) =>
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

          <MetadataButton onClick={addSeries}>Add Series</MetadataButton>
        </div>
      </div>
    </Container>
  );
}
