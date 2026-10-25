import { useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import styles from "./SoundUpload.module.css";
import { API_CLIENT } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
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
  const [file, setFile] = useState<File | undefined>();
  const [handle, setHandle] = useState("");
  const [tags, setTags] = useState("");
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

  const onUpload = async () => {
    if (!file || !handle || isPending) return;
    setError(undefined);
    setIsPending(true);
    try {
      await API_CLIENT.uploadSound({
        handle,
        file,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => !!t),
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
      <label className={styles.field}>
        <span className={styles.label}>Handle</span>
        <Input
          value={handle}
          onInput={(e) => setHandle(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Tags (comma separated)</span>
        <Input
          value={tags}
          onInput={(e) => setTags(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
      </label>
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
          disabled={!file || !handle || isPending}
          onClick={onUpload}
        >
          {isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </section>
  );
}
