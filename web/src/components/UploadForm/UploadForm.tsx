import { useRef, useState } from "react";
import styles from "./UploadForm.module.css";
import { API_CLIENT, type SoundResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../Input/Input";
import Button from "../Button/Button";
import ErrorTile from "../ErrorTile/ErrorTile";

type Props = {
  onUploaded: (sound: SoundResponse) => void;
};

// Derives a sound handle from the given file name by dropping the extension
// and replacing everything except alphanumerics, dashes and underscores.
function handleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function UploadForm({ onUploaded }: Props) {
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
    if (!file || !handle) return;
    setError(undefined);
    setIsPending(true);
    try {
      const sound = await API_CLIENT.uploadSound({
        handle,
        file,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => !!t),
        filters: normalize ? ["normalize"] : [],
      });
      onUploaded(sound);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className={styles.container}>
      {!!error && <ErrorTile message={error} />}
      <div className={styles.row}>
        <input
          ref={fileInput}
          className={styles.fileInput}
          type="file"
          accept="audio/*,video/*"
          onChange={onFileChange}
        />
        <Button onClick={() => fileInput.current?.click()}>Choose file</Button>
        <span className={styles.fileName}>
          {file ? file.name : "No file selected"}
        </span>
      </div>
      <div className={styles.row}>
        <Input
          className={styles.grow}
          placeholder="Handle"
          value={handle}
          onInput={(e) => setHandle(e.currentTarget.value)}
        />
        <Input
          className={styles.grow}
          placeholder="Tags (comma separated)"
          value={tags}
          onInput={(e) => setTags(e.currentTarget.value)}
        />
      </div>
      <div className={styles.row}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={normalize}
            onChange={(e) => setNormalize(e.currentTarget.checked)}
          />
          Normalize loudness
        </label>
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
