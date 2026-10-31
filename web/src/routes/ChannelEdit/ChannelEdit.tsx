import { useContext, useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router";
import styles from "./ChannelEdit.module.css";
import { ChannelContext } from "../../contexts";
import {
  API_CLIENT,
  type ChannelInviteResponse,
  type ChannelResponse,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import { onTagsInput, parseTags } from "../../utils/tags";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";
import CopyIcon from "../../assets/copy.svg?react";
import TrashIcon from "../../assets/trash.svg?react";

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

// Lifetimes selectable for new invites. Undefined means that the invite
// never expires.
const inviteLifetimes: { label: string; lifetimeMs: number | undefined }[] = [
  { label: "1 hour", lifetimeMs: hourMs },
  { label: "1 day", lifetimeMs: dayMs },
  { label: "7 days", lifetimeMs: 7 * dayMs },
  { label: "30 days", lifetimeMs: 30 * dayMs },
  { label: "Never", lifetimeMs: undefined },
];

const defaultInviteLifetimeIndex = 2;
const defaultInviteMaxActivations = "1";

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
      {!!channel?.is_owner && (
        <ChannelInvites key={channel.id} channelId={channel.id} />
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
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Channel</h2>
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

function ChannelInvites({ channelId }: { channelId: number }) {
  const [invites, setInvites] = useState<ChannelInviteResponse[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    API_CLIENT.listChannelInvites(channelId)
      .then(setInvites)
      .catch((e) => setError(errorMessage(e)));
  }, [channelId]);

  const onDelete = async (invite: ChannelInviteResponse) => {
    if (
      !window.confirm(
        `Do you really want to delete the invite "${invite.code}"?`,
      )
    ) {
      return;
    }
    setError(undefined);
    try {
      await API_CLIENT.deleteChannelInvite(channelId, invite.id);
      setInvites((current) => current.filter((i) => i.id != invite.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Invites</h2>
      <p className={styles.description}>
        Users can join the channel by entering an invite code.
      </p>

      {!!error && <ErrorTile message={error} />}

      <InviteCreateForm
        channelId={channelId}
        onCreated={(invite) => setInvites((current) => [invite, ...current])}
      />

      {invites.length > 0 ? (
        <ul className={styles.invites}>
          {invites
            .toSorted(
              (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
            )
            .map((i) => (
              <Invite key={i.id} invite={i} onDelete={() => onDelete(i)} />
            ))}
        </ul>
      ) : (
        <span className={styles.empty}>
          There are no invites for this channel yet.
        </span>
      )}
    </section>
  );
}

function InviteCreateForm({
  channelId,
  onCreated,
}: {
  channelId: number;
  onCreated: (invite: ChannelInviteResponse) => void;
}) {
  const [maxActivations, setMaxActivations] = useState(
    defaultInviteMaxActivations,
  );
  const [lifetimeIndex, setLifetimeIndex] = useState(
    defaultInviteLifetimeIndex,
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onCreate = async () => {
    setError(undefined);
    setIsPending(true);
    try {
      const lifetimeMs = inviteLifetimes[lifetimeIndex].lifetimeMs;
      const invite = await API_CLIENT.createChannelInvite(channelId, {
        max_activations: Number(maxActivations) || 0,
        expires_at:
          lifetimeMs !== undefined
            ? new Date(Date.now() + lifetimeMs).toISOString()
            : undefined,
      });
      onCreated(invite);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={styles.inviteForm}>
      {!!error && <ErrorTile message={error} />}
      <label className={styles.field}>
        <span className={styles.label}>Max uses (empty for unlimited)</span>
        <Input
          className={styles.maxActivations}
          type="number"
          min={0}
          step={1}
          placeholder="Unlimited"
          value={maxActivations}
          onInput={(e) =>
            setMaxActivations(e.currentTarget.value.replace(/[^0-9]/g, ""))
          }
          onKeyUp={(e) => e.key == "Enter" && onCreate()}
        />
      </label>
      <div className={styles.field}>
        <span className={styles.label}>Expires after</span>
        <div className={styles.toggles}>
          {inviteLifetimes.map((l, i) => (
            <button
              key={l.label}
              className={`${styles.toggle} ${i == lifetimeIndex ? styles.selected : ""}`}
              onClick={() => setLifetimeIndex(i)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" disabled={isPending} onClick={onCreate}>
          {isPending ? "Creating..." : "Create invite"}
        </Button>
      </div>
    </div>
  );
}

function Invite({
  invite,
  onDelete,
}: {
  invite: ChannelInviteResponse;
  onDelete: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  // Captured once so that rendering stays pure. The page is re-mounted on
  // navigation, which is sufficient to keep the expired state current.
  const [mountedAt] = useState(Date.now);

  const isExpired =
    invite.expires_at !== undefined &&
    Date.parse(invite.expires_at) <= mountedAt;
  const isExhausted =
    invite.max_activations > 0 &&
    invite.activations >= invite.max_activations;

  const uses =
    invite.max_activations > 0
      ? `${invite.activations} / ${invite.max_activations} uses`
      : `${invite.activations} uses (unlimited)`;

  const expiry = isExpired
    ? "Expired"
    : invite.expires_at !== undefined
      ? `Expires ${new Date(invite.expires_at).toLocaleString()}`
      : "Never expires";

  const onCopy = async () => {
    await navigator.clipboard.writeText(invite.code);
    setIsCopied(true);
  };

  return (
    <li
      className={`${styles.invite} ${isExpired || isExhausted ? styles.inactive : ""}`}
    >
      <div className={styles.inviteInfo}>
        <code className={styles.inviteCode}>{invite.code}</code>
        <span className={styles.inviteMeta}>
          {isCopied ? "Copied!" : `${uses} · ${expiry}`}
        </span>
      </div>
      <IconButton title="Copy invite code" onClick={onCopy}>
        <CopyIcon />
      </IconButton>
      <IconButton title="Delete invite" onClick={onDelete}>
        <TrashIcon />
      </IconButton>
    </li>
  );
}
