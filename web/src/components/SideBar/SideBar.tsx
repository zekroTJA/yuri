import {
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useNavigate } from "react-router";
import styles from "./SideBar.module.css";
import { ChannelActionsContext, ChannelContext } from "../../contexts";
import {
  API_CLIENT,
  type ChannelResponse,
  type ChannelUserResponse,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import IconButton from "../IconButton/IconButton";
import ErrorTile from "../ErrorTile/ErrorTile";
import TabBar from "../TabBar/TabBar";
import Input from "../Input/Input";
import Button from "../Button/Button";
import SpeakerIcon from "../../assets/speaker.svg?react";
import LeaveIcon from "../../assets/leave.svg?react";
import SettingsIcon from "../../assets/settings.svg?react";
import PlusIcon from "../../assets/plus.svg?react";
import InviteIcon from "../../assets/invite.svg?react";
import CopyIcon from "../../assets/copy.svg?react";
import CloseIcon from "../../assets/close.svg?react";

const inviteMaxActivations = 1;
const inviteLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const widthStorageKey = "sidebar-width";

function loadWidth(): number | undefined {
  const width = Number(localStorage.getItem(widthStorageKey));
  return width > 0 ? width : undefined;
}

function inviteExpiresAt(): string {
  return new Date(Date.now() + inviteLifetimeMs).toISOString();
}

type Invite = {
  channelId: number;
  code: string;
};

export default function SideBar() {
  const navigate = useNavigate();
  const channelState = useContext(ChannelContext);
  const channelActions = useContext(ChannelActionsContext);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [invite, setInvite] = useState<Invite | undefined>();
  const [error, setError] = useState<string | undefined>();
  const container = useRef<HTMLElement>(null);
  // Undefined means that the default width from the stylesheet is used. The
  // minimum and maximum width are enforced by the stylesheet as well.
  const [width, setWidth] = useState(loadWidth);
  const [isResizing, setIsResizing] = useState(false);

  const connectedChannel = channelState.channels.find(
    (c) => c.id == channelState.connected,
  );

  const onConnect = async (channelId: number) => {
    if (channelId == channelState.connected) return;
    setError(undefined);
    try {
      await channelActions.connect(channelId);
      navigate("/");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onDisconnect = async () => {
    setError(undefined);
    try {
      await channelActions.disconnect();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onCreateInvite = async (channelId: number) => {
    setError(undefined);
    try {
      const created = await API_CLIENT.createChannelInvite(channelId, {
        max_activations: inviteMaxActivations,
        expires_at: inviteExpiresAt(),
      });
      setInvite({ channelId, code: created.code });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onResizeStart = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizing(true);
  };

  const onResize = (e: PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !container.current) return;
    setWidth(e.clientX - container.current.getBoundingClientRect().left);
  };

  const onResizeEnd = () => {
    if (!isResizing || !container.current) return;
    setIsResizing(false);
    // The rendered width is stored so that values clamped by the stylesheet
    // are not persisted.
    const renderedWidth = container.current.getBoundingClientRect().width;
    setWidth(renderedWidth);
    localStorage.setItem(widthStorageKey, String(renderedWidth));
  };

  return (
    <nav
      ref={container}
      className={styles.container}
      style={width !== undefined ? { width } : undefined}
    >
      <header className={styles.header}>
        <span className={styles.title}>Channels</span>
        <IconButton
          title={isAddingChannel ? "Cancel" : "Add channel"}
          onClick={() => setIsAddingChannel(!isAddingChannel)}
        >
          {isAddingChannel ? <CloseIcon /> : <PlusIcon />}
        </IconButton>
      </header>

      {isAddingChannel && (
        <AddChannelForm
          onAdded={(channel) => {
            channelActions.addChannel(channel);
            setIsAddingChannel(false);
          }}
        />
      )}

      {!!error && <ErrorTile message={error} />}

      <ul className={styles.channels}>
        {channelState.channels.map((c) => (
          <Channel
            key={c.id}
            channel={c}
            isConnected={c.id == channelState.connected}
            invite={invite?.channelId == c.id ? invite.code : undefined}
            onConnect={() => onConnect(c.id)}
            onCreateInvite={() => onCreateInvite(c.id)}
            onCloseInvite={() => setInvite(undefined)}
          />
        ))}
        {channelState.channels.length == 0 && !isAddingChannel && (
          <li className={styles.empty}>
            No channels yet. Create one or join one with an invite code.
          </li>
        )}
      </ul>

      <footer className={styles.footer}>
        <div className={styles.status}>
          {connectedChannel ? (
            <>
              <span className={styles.statusConnected}>Connected</span>
              <span className={styles.statusChannel}>
                {connectedChannel.name}
              </span>
            </>
          ) : (
            <span className={styles.statusDisconnected}>Not connected</span>
          )}
        </div>
        {!!connectedChannel && (
          <IconButton title="Leave channel" onClick={onDisconnect}>
            <LeaveIcon />
          </IconButton>
        )}
        <IconButton title="Settings" onClick={() => navigate("/settings")}>
          <SettingsIcon />
        </IconButton>
      </footer>

      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ""}`}
        onPointerDown={onResizeStart}
        onPointerMove={onResize}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
      />
    </nav>
  );
}

type ChannelProps = {
  channel: ChannelResponse;
  isConnected: boolean;
  invite: string | undefined;
  onConnect: () => void;
  onCreateInvite: () => void;
  onCloseInvite: () => void;
};

function Channel({
  channel,
  isConnected,
  invite,
  onConnect,
  onCreateInvite,
  onCloseInvite,
}: ChannelProps) {
  return (
    <li className={styles.channel}>
      <div
        className={`${styles.channelRow} ${isConnected ? styles.connected : ""}`}
      >
        <button
          className={styles.channelButton}
          title={isConnected ? channel.name : `Join ${channel.name}`}
          onClick={onConnect}
        >
          <SpeakerIcon />
          <span className={styles.channelName}>{channel.name}</span>
        </button>
        {channel.is_owner && (
          <IconButton
            className={styles.channelAction}
            title="Create invite"
            onClick={onCreateInvite}
          >
            <InviteIcon />
          </IconButton>
        )}
      </div>

      {invite !== undefined && (
        <InviteBox code={invite} onClose={onCloseInvite} />
      )}

      {channel.connected_users.length > 0 && (
        <ul className={styles.users}>
          {channel.connected_users.map((u) => (
            <User key={u.id} user={u} />
          ))}
        </ul>
      )}
    </li>
  );
}

function User({ user }: { user: ChannelUserResponse }) {
  return (
    <li className={styles.user}>
      <span className={styles.avatar}>{user.handle.charAt(0)}</span>
      <span className={styles.userHandle}>{user.handle}</span>
    </li>
  );
}

function InviteBox({ code, onClose }: { code: string; onClose: () => void }) {
  const [isCopied, setIsCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
  };

  return (
    <div className={styles.invite}>
      <span className={styles.inviteLabel}>
        {isCopied ? "Copied!" : "Single-use invite, valid for 7 days"}
      </span>
      <div className={styles.inviteRow}>
        <code className={styles.inviteCode}>{code}</code>
        <IconButton title="Copy invite code" onClick={onCopy}>
          <CopyIcon />
        </IconButton>
        <IconButton title="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  );
}

const addChannelTabs = [
  { id: "create", element: "Create" },
  { id: "join", element: "Join" },
];

function AddChannelForm({
  onAdded,
}: {
  onAdded: (channel: ChannelResponse) => void;
}) {
  const [selectedTab, setSelectedTab] = useState("create");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async () => {
    if (!value) return;
    setError(undefined);
    try {
      const channel =
        selectedTab == "create"
          ? await API_CLIENT.createChannel({ name: value })
          : await API_CLIENT.redeemInvite(value);
      setValue("");
      onAdded(channel);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") onSubmit();
  };

  return (
    <div className={styles.addChannel}>
      <TabBar options={addChannelTabs} onSelect={(id) => setSelectedTab(id)} />
      {!!error && <ErrorTile message={error} />}
      <Input
        placeholder={selectedTab == "create" ? "Channel name" : "Invite code"}
        value={value}
        onInput={(e) => setValue(e.currentTarget.value)}
        onKeyUp={onKeyUp}
        autoFocus
      />
      <Button variant="primary" disabled={!value} onClick={onSubmit}>
        {selectedTab == "create" ? "Create channel" : "Join channel"}
      </Button>
    </div>
  );
}
