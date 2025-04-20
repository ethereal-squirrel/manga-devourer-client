import { useCommonStore } from "../store/common";
import { useLibraryStore } from "../store/library";

export function useLibrary() {
  const { libraryId, setLibraryId, setLibraryData, setLibrariesData } =
    useLibraryStore();
  const { server } = useCommonStore();

  const retrieveLibraries = async (host?: string): Promise<boolean> => {
    try {
      const response = await fetch(
        host ? host + "/libraries" : server + "/libraries",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const data = await response.json();
      console.log("libraries", data);

      if (response.status) {
        setLibrariesData(data.libraries);
        return true;
      } else {
        setLibrariesData([]);
        return false;
      }
    } catch (error) {
      console.error(error);
      setLibrariesData([]);
      return false;
    }
  };

  const retrieveLibrary = async (libraryId: number): Promise<boolean> => {
    try {
      const response = await fetch(server + `/library/${libraryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (data.status) {
        setLibraryData({
          ...data.library,
          series: data.series.sort((a: any, b: any) =>
            a.title.localeCompare(b.title)
          ),
        });
        setLibraryId(libraryId);
        return true;
      } else {
        setLibraryData(null);
        setLibraryId(null);
        return false;
      }
    } catch (error) {
      console.error(error);
      setLibraryData(null);
      setLibraryId(null);
      return false;
    }
  };

  const getRecentlyRead = async (): Promise<any> => {
    try {
      const response = await fetch(server + `/recently-read`, {
        method: "GET",
      });

      const data = await response.json();

      if (data.status) {
        return data.recentlyRead;
      }

      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const scanLibrary = async (): Promise<boolean> => {
    try {
      const response = await fetch(server + `/library/${libraryId}/scan`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.status) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const createLibrary = async (library: {
    name: string;
    path: string;
  }): Promise<any> => {
    try {
      const response = await fetch(server + "/libraries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(library),
      });

      const data = await response.json();

      if (data.status) {
        setLibraryData(data.library);
        setLibraryId(data.library.id);
        return data.library;
      }

      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const refreshLibrary = async (): Promise<boolean> => {
    if (libraryId) {
      setLibraryData(null);

      await new Promise((resolve) => setTimeout(resolve, 10));
      await retrieveLibrary(libraryId);

      return true;
    }

    return false;
  };

  return {
    retrieveLibraries,
    retrieveLibrary,
    createLibrary,
    refreshLibrary,
    scanLibrary,
    getRecentlyRead,
  };
}
