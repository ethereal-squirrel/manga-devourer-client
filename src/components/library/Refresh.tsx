import { useLibrary } from "../../hooks/useLibrary";
import { useLocal } from "../../hooks/useLocal";

export default function Refresh({ local }: { local?: boolean }) {
  const { refreshLibrary } = useLibrary();
  const { retrieveLocalData } = useLocal();

  return (
    <button onClick={local ? retrieveLocalData : refreshLibrary}>
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        height={32}
        width={32}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </button>
  );
}
