import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

import { Container } from "../components/Container";
import { TabBar } from "../components/common/TabBar";
import { useTranslation } from "../hooks/useTranslation";
import { db } from "../lib/database";
import { useReadStore } from "../store/read";
import { ConfigService } from "../lib/config";

const SettingsButton = memo(
  ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={active ? styles.button : styles.buttonInactive}
    >
      {children}
    </button>
  )
);

const languages = {
  en: "English",
  fr: "French",
  de: "German",
  ja: "Japanese",
  zh: "Chinese (Mandarin)",
  es: "Spanish",
  it: "Italian",
};

export default function SettingsScreen() {
  const {
    pageMode,
    setPageMode,
    resizeMode,
    setResizeMode,
    direction,
    setDirection,
  } = useReadStore();

  const navigate = useNavigate();
  const { t, locale, setLocale } = useTranslation();

  useEffect(() => {
    const loadConfig = async () => {
      await ConfigService.initializeConfig({
        onServerUpdate: () => {},
        onDirectionUpdate: setDirection,
        onPageModeUpdate: setPageMode,
        onResizeModeUpdate: setResizeMode,
        onLocaleUpdate: setLocale,
      });
    };

    loadConfig();
  }, []);

  const updateConfig = useCallback(
    async (key: string, value: string) => {
      try {
        await db.connect();
        const existingConfig = await db.select<Record<string, any>[]>(
          "SELECT * FROM config WHERE key = $1",
          [key]
        );

        const query =
          existingConfig.length > 0
            ? `UPDATE config SET value = $1 WHERE key = $2`
            : `INSERT INTO config (key, value) VALUES ($2, $1)`;

        await db.execute(query, [value, key]);

        switch (key) {
          case "pageMode":
            setPageMode(value as "double" | "single");
            break;
          case "resizeMode":
            setResizeMode(value as "contain" | "full");
            break;
          case "direction":
            setDirection(value as "rtl" | "ltr");
            break;
          case "language":
            setLocale(value);
            break;
        }
      } catch (error) {
        console.error("Failed to update config:", error);
      }
    },
    [setPageMode, setResizeMode, setDirection, setLocale]
  );

  const handleSupportClick = useCallback(async () => {
    try {
      await openPath("https://devourer.app/support");
    } catch (error) {
      console.error("Failed to open support page:", error);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Container className="flex-1 px-5 pb-24 md:px-0">
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-1/2">
            <div className="col-span-2">{t("settings.setLanguage")}</div>
            <div className="col-span-2">
              <select
                className="border border-gray-400 rounded-md p-1 w-full bg-white"
                value={locale}
                onChange={(e) => updateConfig("language", e.target.value)}
              >
                {["en", "fr", "de", "ja", "zh", "es", "it"].map((lang) => (
                  <option key={lang} value={lang}>
                    {languages[lang as keyof typeof languages]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-1/2 mt-5">
            <div className="col-span-2">{t("settings.direction")}</div>
            <div className="w-full">
              <SettingsButton
                active={direction === "ltr"}
                onClick={() => updateConfig("direction", "ltr")}
              >
                {t("settings.ltr")}
              </SettingsButton>
            </div>
            <div className="w-full">
              <SettingsButton
                active={direction === "rtl"}
                onClick={() => updateConfig("direction", "rtl")}
              >
                {t("settings.rtl")}
              </SettingsButton>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-1/2 mt-5">
            <div className="col-span-2">{t("settings.pageMode")}</div>
            <div className="w-full">
              <SettingsButton
                active={pageMode === "single"}
                onClick={() => updateConfig("pageMode", "single")}
              >
                {t("settings.single")}
              </SettingsButton>
            </div>
            <div className="w-full">
              <SettingsButton
                active={pageMode === "double"}
                onClick={() => updateConfig("pageMode", "double")}
              >
                {t("settings.double")}
              </SettingsButton>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-1/2 mt-5">
            <div className="col-span-2">{t("settings.resizeMode")}</div>
            <div className="w-full">
              <SettingsButton
                active={resizeMode === "contain"}
                onClick={() => updateConfig("resizeMode", "contain")}
              >
                {t("settings.contain")}
              </SettingsButton>
            </div>
            <div className="w-full">
              <SettingsButton
                active={resizeMode === "full"}
                onClick={() => updateConfig("resizeMode", "full")}
              >
                {t("settings.full")}
              </SettingsButton>
            </div>
          </div>

          <div className="mt-5 w-full md:w-1/2">
            <button
              onClick={() => navigate("/how-to-use")}
              className="w-full bg-secondary text-white p-3 rounded-md text-xl font-semibold hover:bg-primary hover:cursor-pointer"
            >
              {t("settings.howToUse")}
            </button>
          </div>

          <div className="mt-5 w-full md:w-1/2">
            <button
              onClick={handleSupportClick}
              className="w-full bg-secondary text-white p-3 rounded-md text-xl font-semibold hover:bg-primary hover:cursor-pointer"
            >
              {t("settings.support")}
            </button>
          </div>
        </div>
      </Container>
      <TabBar />
    </div>
  );
}

const styles = {
  button:
    "bg-primary text-white px-3 py-1 rounded-md w-full mx-auto hover:cursor-pointer",
  buttonInactive:
    "bg-gray-500 text-white px-3 py-1 rounded-md w-full mx-auto hover:cursor-pointer",
};
