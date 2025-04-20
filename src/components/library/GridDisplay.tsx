import { useTranslation } from "../../hooks/useTranslation";

interface GridDisplayProps {
  gridColumns: number;
  setGridColumns: (columns: number) => void;
}

const GRID_OPTIONS = [2, 3, 4, 5, 6] as const;
type GridColumns = (typeof GRID_OPTIONS)[number];

const styles = {
  activeButton:
    "mx-1 items-center bg-primary border border-primary rounded-md p-3 hover:cursor-pointer",
  activeText: "text-white text-md font-bold text-center",
  inactiveButton:
    "mx-1 items-center bg-transparent border border-primary rounded-md p-3 hover:cursor-pointer",
  inactiveText: "text-primary text-md font-bold text-center",
} as const;

export default function GridDisplay({
  gridColumns,
  setGridColumns,
}: GridDisplayProps) {
  const { t } = useTranslation();

  const handleColumnChange = (columns: GridColumns) => {
    setGridColumns(columns);
  };

  return (
    <div className="mr-10 hidden flex-row items-center md:flex">
      <span className="mr-1 font-bold">{t("library.grid.display")}:</span>
      {GRID_OPTIONS.map((num) => (
        <button
          key={num}
          className={
            gridColumns === num ? styles.activeButton : styles.inactiveButton
          }
          onClick={() => handleColumnChange(num)}
        >
          <span
            className={
              gridColumns === num ? styles.activeText : styles.inactiveText
            }
          >
            {num}
          </span>
        </button>
      ))}
    </div>
  );
}
