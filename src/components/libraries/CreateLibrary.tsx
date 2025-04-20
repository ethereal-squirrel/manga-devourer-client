import { useState } from "react";
import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

import { useLibrary } from "../../hooks/useLibrary";
import { useCommonStore } from "../../store/common";
import { useTranslation } from "../../hooks/useTranslation";
export default function CreateLibrary() {
  const { server } = useCommonStore();
  const { t } = useTranslation();

  const [displayCreateLibrary, setDisplayCreateLibrary] = useState(false);
  const { retrieveLibraries } = useLibrary();
  const [libraryName, setLibraryName] = useState("");
  const [libraryPath, setLibraryPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateLibrary = async () => {
    if (libraryName === "" || libraryPath === "" || loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(server + `/libraries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: libraryName,
          path: libraryPath,
        }),
      });

      const data = await res.json();

      if (data.status) {
        setDisplayCreateLibrary(false);
        setLibraryName("");
        setLibraryPath("");

        await retrieveLibraries();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(t("library.create.error"));
    } finally {
      setLoading(false);
    }

    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => {
          setDisplayCreateLibrary(!displayCreateLibrary);
        }}
        className="flex flex-row items-center gap-2 bg-secondary rounded-md bg-primary px-3 py-2"
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
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        <span className="text-sm font-semibold text-white">
          {t("library.create.title")}
        </span>
      </button>
      <Dialog
        open={displayCreateLibrary}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => setDisplayCreateLibrary(false)}
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-md rounded-xl bg-black/50 p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <div className="bg-gray-700 text-white p-5 rounded-lg">
                <DialogTitle as="h2" className="text-base/7 font-semibold">
                  {t("library.create.title")}
                </DialogTitle>
                <p className="mt-2 text-sm/6">
                  {t("library.create.description")}
                </p>
                {error && (
                  <div className="mt-4 text-red-800 text-sm/6 bg-red-200 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="mt-4">
                  <label
                    htmlFor="libraryName"
                    className="text-sm/6 font-semibold"
                  >
                    {t("library.create.name")}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-white py-1.5 px-3 text-sm/6 font-semibold text-black shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                  />
                </div>
                <div className="mt-4">
                  <label
                    htmlFor="libraryPath"
                    className="text-sm/6 font-semibold"
                  >
                    {t("library.create.path")}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-white py-1.5 px-3 text-sm/6 font-semibold text-black shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                    value={libraryPath}
                    onChange={(e) => setLibraryPath(e.target.value)}
                  />
                </div>
                <div className="mt-4">
                  <Button
                    className="gap-2 rounded-md bg-primary w-full text-center py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                    onClick={handleCreateLibrary}
                  >
                    {t("library.create.create")}
                  </Button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
