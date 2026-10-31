import { useContext, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router";
import styles from "./ChannelEdit.module.css";
import { ChannelContext } from "../../contexts";
import { API_CLIENT, type ChannelResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import { onTagsInput, parseTags } from "../../utils/tags";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";

export default function ChannelEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const channelState = useContext(ChannelContext);

  const channel = channelState.channels.find((c) => c.id == Number(id));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>Edit Channel</h1>
      </header>
      {!channel ? (
        <span className={styles.empty}>Channel not found.</span>
      ) : !channel.is_owner ? (
        <span className={styles.empty}>
          Only the owner of the channel can edit it.
        </span>
      ) : (
        // Keyed by ID so that the form state is reset when the edited channel
        // changes.
        <ChannelEditForm
          key={channel.id}
          channel={channel}
          onSaved={() => navigate("/")}
        />
      )}
    </div>
  );
}

function ChannelEditForm({
  channel,
  onSaved,
}: {
  channel: ChannelResponse;
  onSaved: () => void;
}) {
  const [name, setName] = useState(channel.name);
  const [tagBlocklist, setTagBlocklist] = useState(
    channel.tag_blocklist?.join(", ") ?? "",
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const trimmedName = name.trim();

  const onSave = async () => {
    if (!trimmedName) return;
    setError(undefined);
    setIsPending(true);
    try {
      // The channel is updated in the list by the resulting channel-update
      // event.
      await API_CLIENT.updateChannel(channel.id, {
        name: trimmedName,
        tag_blocklist: parseTags(tagBlocklist),
      });
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
        <span className={styles.label}>Name</span>
        <Input
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Blocked tags (comma separated)</span>
        <Input
          value={tagBlocklist}
          onInput={(e) => onTagsInput(e, setTagBlocklist)}
          onKeyUp={onKeyUp}
        />
        <span className={styles.hint}>
          Sounds with any of these tags can not be played in this channel.
        </span>
      </label>
      <div className={styles.actions}>
        <Button
          variant="primary"
          disabled={!trimmedName || isPending}
          onClick={onSave}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </section>
  );
}
