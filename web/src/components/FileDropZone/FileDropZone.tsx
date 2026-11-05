import { useRef, useState, type DragEvent } from "react";
import styles from "./FileDropZone.module.css";

export type FileDropCallback = (file: File) => void;

type Props = React.PropsWithChildren & {
  // Same format as the "accept" attribute of file inputs, e.g.
  // "audio/*,video/*" or ".tar.gz,application/gzip".
  accept?: string;
  disabled?: boolean;
  className?: string;
  onFileDrop: FileDropCallback;
  onRejectedFileDrop?: FileDropCallback;
};

// Returns whether the given file matches the given "accept" specifier list.
// An empty or missing accept list matches all files.
function fileMatchesAccept(file: File, accept?: string): boolean {
  const specifiers = (accept ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => !!s);
  if (specifiers.length == 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return specifiers.some((specifier) => {
    if (specifier.startsWith(".")) return fileName.endsWith(specifier);
    if (specifier.endsWith("/*")) {
      return fileType.startsWith(specifier.slice(0, -1));
    }
    return fileType == specifier;
  });
}

function hasFiles(e: DragEvent<HTMLElement>): boolean {
  return e.dataTransfer.types.includes("Files");
}

export default function FileDropZone({
  accept,
  disabled,
  className,
  onFileDrop,
  onRejectedFileDrop,
  children,
}: Props) {
  // dragenter and dragleave also fire when moving over child elements, so the
  // nesting depth is tracked to know when the cursor actually left the zone.
  const dragDepth = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetDrag = () => {
    dragDepth.current = 0;
    setIsDragOver(false);
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current++;
    setIsDragOver(true);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current == 0) setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    resetDrag();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (fileMatchesAccept(file, accept)) {
      onFileDrop(file);
    } else {
      onRejectedFileDrop?.(file);
    }
  };

  return (
    <div
      className={`${styles.zone} ${isDragOver ? styles.dragOver : ""} ${disabled ? styles.disabled : ""} ${className ?? ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}
