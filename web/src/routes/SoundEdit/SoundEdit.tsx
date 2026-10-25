import { useContext, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router";
import styles from "./SoundEdit.module.css";
import { SoundContext } from "../../contexts";
import { API_CLIENT, type SoundResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import SoundTrimmer, {
  type TrimRange,
} from "../../components/SoundTrimmer/SoundTrimmer";
import BackIcon from "../../assets/back.svg?react";

export default function SoundEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const soundState = useContext(SoundContext);

  const sound = soundState.sounds.find((s) => s.id == Number(id));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>Edit Sound</h1>
      </header>
      {sound ? (
        // Keyed by ID so that the form state is reset when the edited sound
        // changes.
        <SoundEditForm
          key={sound.id}
          sound={sound}
          onSaved={() => navigate("/")}
        />
      ) : (
        <span className={styles.empty}>Sound not found.</span>
      )}
    </div>
  );
}

function SoundEditForm({
  sound,
  onSaved,
}: {
  sound: SoundResponse;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(sound.handle);
  const [tags, setTags] = useState(sound.tags?.join(", ") ?? "");
  const [trimRange, setTrimRange] = useState<TrimRange | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSave = async () => {
    if (!handle) return;
    setError(undefined);
    setIsPending(true);
    try {
      await API_CLIENT.updateSound(sound.id, {
        handle,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => !!t),
      });
      if (trimRange) {
        await API_CLIENT.trimSound(sound.id, trimRange);
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsPending(false);
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") onSave();
  };

  return (
    <section className={styles.form}>
      {!!error && <ErrorTile message={error} />}
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
      <div className={styles.field}>
        <span className={styles.label}>Trim</span>
        <SoundTrimmer soundId={sound.id} onChange={setTrimRange} />
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          disabled={!handle || isPending}
          onClick={onSave}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </section>
  );
}
