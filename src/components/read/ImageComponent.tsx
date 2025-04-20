export default function ImageComponent({
  src,
  pageNum,
  full,
}: {
  src: string;
  pageNum: number;
  full?: boolean;
}) {
  if (!src) return <></>;

  return (
    <img
      src={`${src}?${Date.now()}`}
      alt={`Page ${pageNum}`}
      className={
        full ? "w-full min-h-0" : "h-full w-auto object-contain max-h-screen"
      }
    />
  );
}
