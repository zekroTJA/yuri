import { useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router";
import styles from "./SoundBoard.module.css";
import { ChannelContext, SoundContext } from "../../contexts";
import { API_CLIENT, type SoundResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import { downloadBlob } from "../../utils/download";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import ContextMenu from "../../components/ContextMenu/ContextMenu";
import UploadIcon from "../../assets/upload.svg?react";
import EditIcon from "../../assets/edit.svg?react";
import DownloadIcon from "../../assets/download.svg?react";
import TrashIcon from "../../assets/trash.svg?react";
import SortAlphaIcon from "../../assets/sort-alpha.svg?react";
import ClockIcon from "../../assets/clock.svg?react";

type SortOrder = "alphabetical" | "latest";

const sortOrderStorageKey = "sound-sort-order";

function loadSortOrder(): SortOrder {
  return localStorage.getItem(sortOrderStorageKey) == "latest"
    ? "latest"
    : "alphabetical";
}

function compareSounds(
  a: SoundResponse,
  b: SoundResponse,
  sortOrder: SortOrder,
): number {
  if (sortOrder == "latest") {
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  }
  return a.handle.localeCompare(b.handle);
}

type SoundContextMenu = {
  sound: SoundResponse;
  x: number;
  y: number;
};

export default function SoundBoard() {
  const navigate = useNavigate();
  const channelState = useContext(ChannelContext);
  const soundState = useContext(SoundContext);
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState(loadSortOrder);
  const [error, setError] = useState<string | undefined>();
  const [contextMenu, setContextMenu] = useState<
    SoundContextMenu | undefined
  >();

  const isConnected = channelState.connected !== undefined;

  const normalizedFilter = filter.trim().toLowerCase();
  const sounds = soundState.sounds
    .filter(
      (s) =>
        !normalizedFilter ||
        s.handle.toLowerCase().includes(normalizedFilter) ||
        s.tags?.some((t) => t.toLowerCase().includes(normalizedFilter)),
    )
    .toSorted((a, b) => compareSounds(a, b, sortOrder));

  const onToggleSortOrder = () => {
    const newSortOrder =
      sortOrder == "alphabetical" ? "latest" : "alphabetical";
    setSortOrder(newSortOrder);
    localStorage.setItem(sortOrderStorageKey, newSortOrder);
  };

  const onPlay = async (sound: SoundResponse) => {
    setError(undefined);
    try {
      await API_CLIENT.playSound(sound.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onDownload = async (sound: SoundResponse) => {
    setError(undefined);
    try {
      downloadBlob(await API_CLIENT.getSound(sound.id), `${sound.handle}.oga`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onDelete = async (sound: SoundResponse) => {
    if (
      !window.confirm(
        `Do you really want to delete the sound "${sound.handle}"?`,
      )
    ) {
      return;
    }
    setError(undefined);
    try {
      // The sound is removed from the list by the resulting sound-delete event.
      await API_CLIENT.deleteSound(sound.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onOpenContextMenu = (sound: SoundResponse, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ sound, x: e.clientX, y: e.clientY });
  };

  const onCloseContextMenu = useCallback(() => setContextMenu(undefined), []);

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
          title={
            sortOrder == "alphabetical"
              ? "Sorted alphabetically, click to sort by latest added"
              : "Sorted by latest added, click to sort alphabetically"
          }
          onClick={onToggleSortOrder}
        >
          <span className={styles.buttonContent}>
            {sortOrder == "alphabetical" ? <SortAlphaIcon /> : <ClockIcon />}
            {sortOrder == "alphabetical" ? "A–Z" : "Latest"}
          </span>
        </Button>
        <Button variant="primary" onClick={() => navigate("/sounds/upload")}>
          <span className={styles.buttonContent}>
            <UploadIcon />
            Upload
          </span>
        </Button>
      </header>

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
              onContextMenu={(e) => onOpenContextMenu(s, e)}
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

      {!!contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={onCloseContextMenu}
          items={[
            {
              label: "Edit",
              icon: <EditIcon />,
              onClick: () => navigate(`/sounds/${contextMenu.sound.id}/edit`),
            },
            {
              label: "Download",
              icon: <DownloadIcon />,
              onClick: () => onDownload(contextMenu.sound),
            },
            {
              label: "Delete",
              icon: <TrashIcon />,
              isDanger: true,
              onClick: () => onDelete(contextMenu.sound),
            },
          ]}
        />
      )}
    </div>
  );
}

type SoundButtonProps = {
  sound: SoundResponse;
  isPlaying: boolean;
  disabled: boolean;
  onPlay: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

function SoundButton({
  sound,
  isPlaying,
  disabled,
  onPlay,
  onContextMenu,
}: SoundButtonProps) {
  return (
    <button
      className={`${styles.sound} ${isPlaying ? styles.playing : ""}`}
      // aria-disabled is used instead of disabled because disabled buttons do
      // not receive the contextmenu event in all browsers.
      aria-disabled={disabled}
      title={
        sound.creator.handle
          ? `${sound.handle} (uploaded by ${sound.creator.handle})`
          : sound.handle
      }
      onClick={() => !disabled && onPlay()}
      onContextMenu={onContextMenu}
    >
      {sound.handle}
    </button>
  );
}
