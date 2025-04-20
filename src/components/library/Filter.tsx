import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";

import { useTranslation } from "../../hooks/useTranslation";
import { useLibraryStore } from "../../store/library";
import { useLocalStore } from "../../store/local";

interface FilterStates {
  titleFilter: string | null;
  authorFilter: string | null;
  genreFilter: string | null;
  setTitleFilter: (value: string) => void;
  setAuthorFilter: (value: string) => void;
  setGenreFilter: (value: string) => void;
}

interface FilterProps {
  states: FilterStates;
  local?: boolean;
}

const selectStyles =
  "w-full rounded-md bg-white py-1.5 px-3 text-sm/6 font-semibold text-black shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700";

export default function Filter({ states, local = false }: FilterProps) {
  const { libraryData } = useLibraryStore();
  const { localData } = useLocalStore();
  const { t } = useTranslation();

  const [displayFilter, setDisplayFilter] = useState(false);
  const [uniqueAuthors, setUniqueAuthors] = useState<string[]>([]);
  const [uniqueGenres, setUniqueGenres] = useState<string[]>([]);

  const processData = useMemo(() => {
    const data = local ? localData : libraryData?.series;
    if (!data) return { authors: [], genres: [] };

    const authors = [
      ...new Set(
        data.reduce(
          (acc: string[], series: any) =>
            acc.concat(series.mangaData?.authors ?? []),
          []
        )
      ),
    ].sort();

    const genres = [
      ...new Set(
        data.reduce(
          (acc: string[], series: any) =>
            acc.concat(series.mangaData?.genres ?? []),
          []
        )
      ),
    ].sort();

    return { authors, genres };
  }, [local, localData, libraryData?.series]);

  useEffect(() => {
    setUniqueAuthors(processData.authors as string[]);
    setUniqueGenres(processData.genres as string[]);
  }, [processData]);

  return (
    <>
      <div>
        <button
          className="flex flex-row items-center bg-primary rounded-md p-3 hover:cursor-pointer"
          onClick={() => setDisplayFilter(!displayFilter)}
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
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
            />
          </svg>
          <span className="ml-2 text-lg font-semibold text-white">
            {t("library.filter.title")}
          </span>
        </button>
      </div>

      <Dialog
        open={displayFilter}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => setDisplayFilter(false)}
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-md rounded-xl bg-black/50 p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <div className="bg-gray-700 text-white p-5 rounded-lg">
                <div>
                  <input
                    type="text"
                    className={selectStyles}
                    value={states.titleFilter || ""}
                    onChange={(e) => states.setTitleFilter(e.target.value)}
                    placeholder={t("library.filter.search")}
                  />
                </div>
                <div className="mt-4">
                  <select
                    className={selectStyles}
                    value={states.authorFilter || ""}
                    onChange={(e) => states.setAuthorFilter(e.target.value)}
                  >
                    <option value="">{t("library.filter.author")}</option>
                    {uniqueAuthors.map((author) => (
                      <option key={author} value={author}>
                        {author}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4">
                  <select
                    className={selectStyles}
                    value={states.genreFilter || ""}
                    onChange={(e) => states.setGenreFilter(e.target.value)}
                  >
                    <option value="">{t("library.filter.genre")}</option>
                    {uniqueGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
