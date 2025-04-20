import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Container } from "../components/Container";
import { ConfigService } from "../lib/config";
import { useLibrary } from "../hooks/useLibrary";
import { useTranslation } from "../hooks/useTranslation";
import { useCommonStore } from "../store/common";
import { TabBar } from "../components/common/TabBar";
import { useReadStore } from "../store/read";

interface Provider {
  name: string;
  route: string;
}

const providers: Provider[] = [
  { name: "Google Drive", route: "/provider-google" },
  { name: "Dropbox", route: "/provider-dropbox" },
];

const ProviderButton = memo(
  ({
    provider,
    onClick,
  }: {
    provider: Provider;
    onClick: (route: string) => void;
  }) => {
    return (
      <div>
        <button
          className={styles.providerButton}
          onClick={() => onClick(provider.route)}
        >
          {provider.name}
        </button>
      </div>
    );
  }
);

const ServerInput = memo(
  ({
    value,
    onChange,
    onConnect,
    isLoading,
  }: {
    value: string;
    onChange: (value: string) => void;
    onConnect: () => void;
    isLoading: boolean;
  }) => {
    const { t } = useTranslation();

    return (
      <>
        <div className="flex flex-col items-center justify-center w-full md:w-1/2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className="flex flex-col items-center justify-center w-full md:w-1/2">
          <button
            onClick={onConnect}
            className={`${styles.button} ${isLoading ? "opacity-50" : ""}`}
            disabled={isLoading}
          >
            {t("server.connect")}
          </button>
        </div>
      </>
    );
  }
);

export default function ServerScreen() {
  const { setActiveTab, server, setServer } = useCommonStore();
  const { setPageMode, setResizeMode, setDirection } = useReadStore();
  const { t, setLocale } = useTranslation();
  const { retrieveLibraries } = useLibrary();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [serverString, setServerString] = useState(server || "");

  useEffect(() => {
    ConfigService.initializeConfig({
      onServerUpdate: setServer,
      onDirectionUpdate: setDirection,
      onPageModeUpdate: setPageMode,
      onResizeModeUpdate: setResizeMode,
      onLocaleUpdate: setLocale,
    });
  }, []);

  useEffect(() => {
    setServerString(server || "");
  }, [server]);

  const handleProviderClick = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const connectToServer = useCallback(async () => {
    if (serverString === "" || loading) return;

    const trimmedServer = serverString.trim().replace(/\/$/, "");
    setServerString(trimmedServer);
    setLoading(true);
    setServer(trimmedServer);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const status = await retrieveLibraries(trimmedServer);

      if (status) {
        await ConfigService.updateServerConfig(trimmedServer);
        setActiveTab("/");
        navigate("/libraries");
      } else {
        toast.error(t("server.error"));
      }
    } catch (error) {
      console.error("Server connection error:", error);
      toast.error(t("server.error"));
    } finally {
      setLoading(false);
    }
  }, [
    serverString,
    loading,
    setServer,
    retrieveLibraries,
    t,
    setActiveTab,
    navigate,
  ]);

  return (
    <div className="h-screen flex flex-col">
      <Container className="flex-1 px-5 pb-24 md:px-0">
        <div className="flex flex-col items-center justify-center h-full w-full">
          <ServerInput
            value={serverString}
            onChange={setServerString}
            onConnect={connectToServer}
            isLoading={loading}
          />
          <div className="mt-5 gap-5 grid grid-cols-1 md:grid-cols-4 w-full md:w-1/2">
            {providers.map((provider) => (
              <ProviderButton
                key={provider.route}
                provider={provider}
                onClick={handleProviderClick}
              />
            ))}
          </div>
        </div>
      </Container>
      <TabBar />
    </div>
  );
}

const styles = {
  input: "border border-gray-400 rounded-md rounded-b-none p-5 w-full bg-white",
  button:
    "bg-primary text-white p-5 rounded-md w-full rounded-t-none mx-auto hover:cursor-pointer",
  providerButton:
    "bg-secondary text-white p-5 rounded-md w-full mx-auto font-semibold hover:cursor-pointer",
};
