import { useCallback, useContext } from "react";

import { LanguageContext } from "../contexts/LanguageContext";
import type {
  Translations,
  TranslationParams,
} from "../interfaces/translations";
import type { DeepKeyOf } from "../interfaces/utils";

export const useTranslation = () => {
  const { locale, translations, setLocale } = useContext(LanguageContext);

  const t = useCallback(
    (key: DeepKeyOf<Translations>, params?: TranslationParams) => {
      const getValue = (obj: any, path: string) => {
        return path.split(".").reduce((acc, part) => acc?.[part], obj);
      };

      let value = getValue(translations[locale], key);

      if (!value) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }

      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          const regex = new RegExp(`{{${paramKey}}}`, "g");
          value = value.replace(regex, String(paramValue));
        });
      }

      return value;
    },
    [locale, translations]
  );

  return { t, locale, setLocale };
};
