import { createContext, useState, useCallback, ReactNode } from "react";

import type { Translations } from "../interfaces/translations";
import { en } from "../locales/en";
import { fr } from "../locales/fr";
import { es } from "../locales/es";
import { de } from "../locales/de";
import { ja } from "../locales/ja";
import { it } from "../locales/it";
import { zh } from "../locales/zh";

type LanguageContextType = {
  locale: string;
  translations: Record<string, Translations>;
  setLocale: (locale: string) => void;
};

export const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  translations: { en },
  setLocale: () => {},
});

type LanguageProviderProps = {
  children: ReactNode;
  defaultLocale?: string;
};

export const LanguageProvider = ({
  children,
  defaultLocale = "en",
}: LanguageProviderProps) => {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations] = useState({ en, fr, es, de, ja, it, zh });

  const handleSetLocale = useCallback((newLocale: string) => {
    setLocale(newLocale);
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        translations,
        setLocale: handleSetLocale,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
