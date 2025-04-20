import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { appLocalDataDir, join } from "@tauri-apps/api/path";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import { db } from "../lib/database";
import { useCommonStore } from "../store/common";
import { useTranslation } from "../hooks/useTranslation";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  path: string;
}

interface GroupedFiles {
  [key: string]: DriveFile[];
}

const FileGroup = memo(
  ({
    path,
    files,
    isCollapsed,
    onToggle,
    onFileClick,
  }: {
    path: string;
    files: DriveFile[];
    isCollapsed: boolean;
    onToggle: (path: string) => void;
    onFileClick: (file: DriveFile) => void;
  }) => {
    const { t } = useTranslation();

    return (
      <div className="mb-6">
        <div
          className="text-left font-bold text-lg mb-2 border-b pb-1 flex items-center cursor-pointer"
          onClick={() => onToggle(path)}
        >
          <span className="mr-2">{isCollapsed ? "▶" : "▼"}</span>
          <span>📁 {path}</span>
          <span className="ml-2 text-sm text-gray-500">
            ({files.length} files)
          </span>
        </div>
        {!isCollapsed && (
          <div className="pl-4">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onFileClick(file)}
                className="cursor-pointer hover:bg-gray-100 p-2 rounded text-left"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-bold">{t("providers.read")}:</span>
                  <span>{file.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

export default function ProviderDropboxScreen() {
  const { oauthDropboxAccessToken, setOauthDropboxAccessToken } =
    useCommonStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mounted = useRef(false);

  const [availableFiles, setAvailableFiles] = useState<DriveFile[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [retrievingFile, setRetrievingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndRefreshToken = useCallback(
    async (accessToken: string, refreshToken: string) => {
      try {
        const response = await fetch(
          "https://api.dropboxapi.com/2/users/get_current_account",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: "null",
          }
        );

        if (response.ok) {
          setOauthDropboxAccessToken(accessToken);
          return accessToken;
        }

        const refreshResponse = await fetch(
          "https://devourer.app/api/auth/dropbox/refresh",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }
        );

        const data = await refreshResponse.json();
        if (data.error) throw new Error(data.error);

        setOauthDropboxAccessToken(data.access_token);
        return data.access_token;
      } catch (error) {
        console.error("Token validation/refresh failed:", error);
        navigate("/oauth-dropbox");
        return null;
      }
    },
    [navigate, setOauthDropboxAccessToken]
  );

  const retrieveFiles = useCallback(
    async (token: string) => {
      const allowedExtensions = [".zip", ".cbz"];
      const files: DriveFile[] = [];

      async function listFiles(path: string = "") {
        try {
          const response = await fetch(
            "https://api.dropboxapi.com/2/files/list_folder",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                path: path,
                recursive: true,
              }),
            }
          );

          if (!response.ok) throw new Error("Failed to fetch files");

          const data = await response.json();

          for (const entry of data.entries) {
            if (
              entry[".tag"] === "file" &&
              allowedExtensions.some((ext) =>
                entry.name.toLowerCase().endsWith(ext)
              )
            ) {
              files.push({
                id: entry.id,
                name: entry.name,
                mimeType: entry.name.split(".").pop() || "",
                path:
                  entry.path_display.split("/").slice(0, -1).join("/") ||
                  "Root",
                parents: [],
              });
            }
          }

          if (data.has_more) {
            await listMoreFiles(data.cursor, token);
          }
        } catch (error) {
          console.error("Error listing files:", error);
          setError(t("server.error"));
        }
      }

      async function listMoreFiles(cursor: string, token: string) {
        try {
          const response = await fetch(
            "https://api.dropboxapi.com/2/files/list_folder/continue",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ cursor }),
            }
          );

          if (!response.ok) throw new Error("Failed to fetch more files");

          const data = await response.json();

          for (const entry of data.entries) {
            if (
              entry[".tag"] === "file" &&
              allowedExtensions.some((ext) =>
                entry.name.toLowerCase().endsWith(ext)
              )
            ) {
              files.push({
                id: entry.id,
                name: entry.name,
                mimeType: entry.name.split(".").pop() || "",
                path:
                  entry.path_display.split("/").slice(0, -1).join("/") ||
                  "Root",
                parents: [],
              });
            }
          }

          if (data.has_more) {
            await listMoreFiles(data.cursor, token);
          }
        } catch (error) {
          console.error("Error listing more files:", error);
        }
      }

      try {
        await listFiles("");
        setAvailableFiles(files);
      } catch (error) {
        console.error("Error fetching files:", error);
        setError(t("server.error"));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const handleFileClick = useCallback(
    async (file: DriveFile) => {
      setRetrievingFile(true);
      setError(null);

      try {
        const url = "https://content.dropboxapi.com/2/files/download";
        const localDataDir = await appLocalDataDir();
        const path = await join(
          localDataDir,
          String(BaseDirectory.AppLocalData),
          "local.zip"
        );

        await invoke("download_file", {
          url,
          path: path,
          token: oauthDropboxAccessToken,
          mode: "dropbox",
          target: file.path + "/" + file.name,
        });

        navigate(`/read/0?direct=true&dropbox=true`);
      } catch (error) {
        console.error("Error downloading file:", error);
        setError(t("server.error"));
      } finally {
        setRetrievingFile(false);
      }
    },
    [oauthDropboxAccessToken, navigate, t]
  );

  const toggleGroup = useCallback((path: string) => {
    setCollapsedGroups((prev) => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(path)) {
        newCollapsed.delete(path);
      } else {
        newCollapsed.add(path);
      }
      return newCollapsed;
    });
  }, []);

  const groupFilesByPath = useCallback((files: DriveFile[]): GroupedFiles => {
    const groups = files.reduce((groups: GroupedFiles, file) => {
      const key = file.path || "Root";
      if (!groups[key]) groups[key] = [];
      groups[key].push(file);
      return groups;
    }, {});

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const initDropbox = async () => {
      try {
        const [accessTokenRow] = await db.select(
          "SELECT * FROM config WHERE key = $1",
          ["oauthDropboxAccessToken"]
        );
        const [refreshTokenRow] = await db.select(
          "SELECT * FROM config WHERE key = $1",
          ["oauthDropboxRefreshToken"]
        );

        if (!accessTokenRow?.value || !refreshTokenRow?.value) {
          await openPath("https://devourer.app/oauth/dropbox");
          return;
        }

        const validToken = await validateAndRefreshToken(
          accessTokenRow.value,
          refreshTokenRow.value
        );

        if (validToken) {
          if (validToken !== accessTokenRow.value) {
            await db.execute("UPDATE config SET value = $1 WHERE key = $2", [
              validToken,
              "oauthDropboxAccessToken",
            ]);
          }
          await retrieveFiles(validToken);
        } else {
          await openPath("https://devourer.app/oauth/dropbox");
        }
      } catch (error) {
        console.error("Init failed:", error);
        setError(t("server.error"));
      }
    };

    initDropbox();
  }, [validateAndRefreshToken, retrieveFiles, t]);

  return (
    <div className="h-screen flex flex-col">
      <Container className="flex-1 px-5 pb-24 md:px-0">
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="mt-5 w-full md:w-1/2 text-center">
            <div className="text-2xl font-bold mb-10">Dropbox</div>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {retrievingFile ? (
              <div>{t("providers.retrievingFile")}</div>
            ) : (
              <>
                {isLoading ? (
                  <div>{t("providers.retrievingFiles")}</div>
                ) : (
                  <>
                    {Object.entries(groupFilesByPath(availableFiles))
                      .sort(([pathA], [pathB]) => {
                        if (pathA === "Root") return -1;
                        if (pathB === "Root") return 1;
                        return pathA.localeCompare(pathB);
                      })
                      .map(([path, files]) => (
                        <FileGroup
                          key={path}
                          path={path}
                          files={files}
                          isCollapsed={collapsedGroups.has(path)}
                          onToggle={toggleGroup}
                          onFileClick={handleFileClick}
                        />
                      ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
      <TabBar />
    </div>
  );
}
