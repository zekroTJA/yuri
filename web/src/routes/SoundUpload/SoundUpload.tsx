import { useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import styles from "./SoundUpload.module.css";
import { API_CLIENT } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import { onSoundHandleInput } from "../../utils/handle";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import TagInput from "../../components/TagInput/TagInput";
import TabBar from "../../components/TabBar/TabBar";
import BackIcon from "../../assets/back.svg?react";

// Derives a sound handle from the given file name by dropping the extension
// and replacing everything except alphanumerics, dashes and underscores.
function handleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SourceType = "file" | "url";

export default function SoundUpload() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>Upload Sound</h1>
      </header>
      <SoundUploadForm onUploaded={() => navigate("/")} />
    </div>
  );
}

function SoundUploadForm({ onUploaded }: { onUploaded: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [file, setFile] = useState<File | undefined>();
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [normalize, setNormalize] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.currentTarget.files?.[0];
    setFile(selected);
    if (selected && !handle) {
      setHandle(handleFromFileName(selected.name));
    }
  };

  const hasSource = sourceType === "file" ? !!file : !!url.trim();

  const onUpload = async () => {
    if (!hasSource || !handle || isPending) return;
    setError(undefined);
    setIsPending(true);
    try {
      await API_CLIENT.uploadSound({
        handle,
        file: sourceType === "file" ? file : undefined,
        url: sourceType === "url" ? url.trim() : undefined,
        tags,
        filters: normalize ? ["normalize"] : [],
      });
      onUploaded();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsPending(false);
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") onUpload();
  };

  return (
    <section className={styles.form}>
      {!!error && <ErrorTile message={error} />}
      <TabBar
        options={[
          { id: "file", element: "File" },
          { id: "url", element: "URL" },
        ]}
        onSelect={(id) => setSourceType(id as SourceType)}
      />
      {sourceType === "url" ? (
        <label className={styles.field}>
          <span className={styles.label}>Video URL</span>
          <Input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onInput={(e) => setUrl(e.currentTarget.value)}
            onKeyUp={onKeyUp}
          />
        </label>
      ) : (
        <div className={styles.field}>
          <span className={styles.label}>File</span>
          <div className={styles.fileRow}>
            <input
              ref={fileInput}
              className={styles.fileInput}
              type="file"
              accept="audio/*,video/*"
              onChange={onFileChange}
            />
            <Button onClick={() => fileInput.current?.click()}>
              Choose file
            </Button>
            <span className={styles.fileName}>
              {file ? file.name : "No file selected"}
            </span>
          </div>
        </div>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Handle</span>
        <Input
          value={handle}
          onInput={(e) => onSoundHandleInput(e, setHandle)}
          onKeyUp={onKeyUp}
        />
      </label>
      <div className={styles.field}>
        <span className={styles.label}>Tags</span>
        <TagInput tags={tags} onChange={setTags} onKeyUp={onKeyUp} />
      </div>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={normalize}
          onChange={(e) => setNormalize(e.currentTarget.checked)}
        />
        Normalize loudness
      </label>
      <div className={styles.actions}>
        <Button
          variant="primary"
          disabled={!hasSource || !handle || isPending}
          onClick={onUpload}
        >
          {isPending
            ? sourceType === "url"
              ? "Downloading..."
              : "Uploading..."
            : "Upload"}
        </Button>
      </div>
    </section>
  );
}
