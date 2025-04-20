import { DeepPartial } from "./utils";
import type { en } from "../locales/en";
import type { fr } from "../locales/fr";
import type { es } from "../locales/es";
import type { de } from "../locales/de";
import type { ja } from "../locales/ja";
import type { it } from "../locales/it";
import type { zh } from "../locales/zh";

export type Translations =
  | typeof en
  | typeof fr
  | typeof es
  | typeof de
  | typeof ja
  | typeof it
  | typeof zh;

export type TranslationsMap = Record<string, Translations>;

// Type for supported locales
export type SupportedLocales = "en" | "fr" | "es" | "de" | "ja" | "it" | "zh";

export type TranslationParams = Record<string, string | number>;

// Context types
export interface LanguageContextType {
  locale: SupportedLocales;
  translations: TranslationsMap;
  setLocale: (locale: SupportedLocales) => void;
}

export interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLocale?: SupportedLocales;
  initialTranslations?: DeepPartial<TranslationsMap>;
}
