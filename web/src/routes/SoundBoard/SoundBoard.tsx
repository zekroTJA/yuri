import { useContext, useRef, useState } from "react";
import styles from "./SoundBoard.module.css";
import { ChannelContext, SoundContext } from "../../contexts";
import {
  API_CLIENT,
  type SoundImportResponse,
  type SoundResponse,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import UploadForm from "../../components/UploadForm/UploadForm";
import IconButton from "../../components/IconButton/IconButton";
import UploadIcon from "../../assets/upload.svg?react";
import DownloadIcon from "../../assets/download.svg?react";
import PackageIcon from "../../assets/package.svg?react";
import CloseIcon from "../../assets/close.svg?react";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking synchronously may cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url));
}

function exportFileName(): string {
  return `yuri-sounds-${new Date().toISOString().slice(0, 10)}.tar.gz`;
}

export default function SoundBoard() {
  const channelState = useContext(ChannelContext);
  const soundState = useContext(SoundContext);
  const [filter, setFilter] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    SoundImportResponse | undefined
  >();
  const [error, setError] = useState<string | undefined>();
  const importInput = useRef<HTMLInputElement>(null);

  const isConnected = channelState.connected !== undefined;

  const normalizedFilter = filter.trim().toLowerCase();
  const sounds = soundState.sounds
    .filter(
      (s) =>
        !normalizedFilter ||
        s.handle.toLowerCase().includes(normalizedFilter) ||
        s.tags?.some((t) => t.toLowerCase().includes(normalizedFilter)),
    )
    .toSorted((a, b) => a.handle.localeCompare(b.handle));

  const onPlay = async (sound: SoundResponse) => {
    setError(undefined);
    try {
      await API_CLIENT.playSound(sound.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onExport = async () => {
    setError(undefined);
    setIsExporting(true);
    try {
      downloadBlob(await API_CLIENT.exportSounds(), exportFileName());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsExporting(false);
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archive = e.currentTarget.files?.[0];
    // Reset the input so that the same file can be selected again.
    e.currentTarget.value = "";
    if (!archive) return;
    setError(undefined);
    setImportResult(undefined);
    setIsImporting(true);
    try {
      setImportResult(await API_CLIENT.importSounds(archive));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Input
          className={styles.search}
          placeholder="Search sounds"
          value={filter}
          onInput={(e) => setFilter(e.currentTarget.value)}
        />
        <Button
          variant={isUploading ? "default" : "primary"}
          onClick={() => setIsUploading(!isUploading)}
        >
          <span className={styles.buttonContent}>
            <UploadIcon />
            {isUploading ? "Cancel" : "Upload"}
          </span>
        </Button>
        <input
          ref={importInput}
          className={styles.fileInput}
          type="file"
          accept=".tar.gz,.tgz,application/gzip"
          onChange={onImport}
        />
        <Button
          disabled={isImporting}
          title="Import sounds from a .tar.gz archive"
          onClick={() => importInput.current?.click()}
        >
          <span className={styles.buttonContent}>
            <PackageIcon />
            {isImporting ? "Importing..." : "Import"}
          </span>
        </Button>
        <Button
          disabled={isExporting || soundState.sounds.length == 0}
          title="Export all sounds as a .tar.gz archive"
          onClick={onExport}
        >
          <span className={styles.buttonContent}>
            <DownloadIcon />
            {isExporting ? "Exporting..." : "Export"}
          </span>
        </Button>
      </header>

      {isUploading && <UploadForm onUploaded={() => setIsUploading(false)} />}

      {!isConnected && (
        <div className={styles.hint}>
          Join a channel in the sidebar to play sounds.
        </div>
      )}

      {!!error && <ErrorTile message={error} />}

      {!!importResult && (
        <ImportResult
          result={importResult}
          onClose={() => setImportResult(undefined)}
        />
      )}

      {sounds.length > 0 ? (
        <div className={styles.grid}>
          {sounds.map((s) => (
            <SoundButton
              key={s.id}
              sound={s}
              isPlaying={!!soundState.playing[s.id]}
              disabled={!isConnected}
              onPlay={() => onPlay(s)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {soundState.sounds.length == 0
            ? "No sounds have been uploaded yet."
            : "No sounds match your search."}
        </div>
      )}
    </div>
  );
}

type SoundButtonProps = {
  sound: SoundResponse;
  isPlaying: boolean;
  disabled: boolean;
  onPlay: () => void;
};

function SoundButton({ sound, isPlaying, disabled, onPlay }: SoundButtonProps) {
  return (
    <button
      className={`${styles.sound} ${isPlaying ? styles.playing : ""}`}
      disabled={disabled}
      title={
        sound.creator.handle
          ? `${sound.handle} (uploaded by ${sound.creator.handle})`
          : sound.handle
      }
      onClick={onPlay}
    >
      <span className={styles.soundHandle}>{sound.handle}</span>
      {!!sound.tags?.length && (
        <span className={styles.soundTags}>
          {sound.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

type ImportResultProps = {
  result: SoundImportResponse;
  onClose: () => void;
};

function ImportResult({ result, onClose }: ImportResultProps) {
  return (
    <div className={styles.importResult}>
      <div className={styles.importResultHeader}>
        <span>
          Imported {result.imported.length}{" "}
          {result.imported.length == 1 ? "sound" : "sounds"}
          {result.skipped.length > 0 && `, skipped ${result.skipped.length}`}
        </span>
        <IconButton title="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      {result.skipped.length > 0 && (
        <ul className={styles.skipped}>
          {result.skipped.map((s) => (
            <li key={s.name}>
              <span className={styles.skippedName}>{s.name}</span>: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
