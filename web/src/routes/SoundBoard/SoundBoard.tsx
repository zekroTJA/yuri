import { useContext, useState } from "react";
import styles from "./SoundBoard.module.css";
import { ChannelContext, SoundContext } from "../../contexts";
import { API_CLIENT, type SoundResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import UploadForm from "../../components/UploadForm/UploadForm";
import UploadIcon from "../../assets/upload.svg?react";

export default function SoundBoard() {
  const channelState = useContext(ChannelContext);
  const soundState = useContext(SoundContext);
  const [filter, setFilter] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
      </header>

      {isUploading && <UploadForm onUploaded={() => setIsUploading(false)} />}

      {!isConnected && (
        <div className={styles.hint}>Join a channel to play sounds.</div>
      )}

      {!!error && <ErrorTile message={error} />}

      {sounds.length > 0 ? (
        <div className={styles.sounds}>
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
      {sound.handle}
    </button>
  );
}
