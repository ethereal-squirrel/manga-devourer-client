import { useTranslation } from "../../hooks/useTranslation";
import { useImportQueueStore } from "../../store/importQueue";

export default function ImportStatus() {
  const { currentFiles } = useImportQueueStore();
  const { t } = useTranslation();
  if (!currentFiles || currentFiles.length === 0) {
    return null;
  }

  return (
    <span
      className={`ml-3 text-sm ${
        currentFiles.length > 0 ? "inline" : "hidden"
      }`}
    >
      {t("library.currentlyImporting", {
        count: currentFiles.length,
      })}
    </span>
  );
}
