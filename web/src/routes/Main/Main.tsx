import { useEffect, useReducer, useRef } from "react";
import { Outlet } from "react-router";
import SideBar from "../../components/SideBar/SideBar";
import {
  API_CLIENT,
  ApiError,
  type ChannelResponse,
  type SoundResponse,
} from "../../services/apiclient";
import { evictSound, playSound } from "../../services/soundplayer";
import styles from "./Main.module.css";
import {
  ChannelActionsContext,
  ChannelContext,
  SoundContext,
  type ChannelActions,
  type ChannelState,
  type SoundState,
} from "../../contexts";

function channelReducer(
  state: ChannelState,
  [type, payload]:
    | ["setChannels", ChannelResponse[]]
    | ["upsertChannel", ChannelResponse]
    | ["removeChannel", number]
    | ["setConnected", number | undefined],
): ChannelState {
  switch (type) {
    case "setChannels":
      return { ...state, channels: payload };
    case "upsertChannel": {
      const existing = state.channels.find((c) => c.id == payload.id);
      if (!existing) {
        return { ...state, channels: [...state.channels, payload] };
      }
      // Channel update events carry is_owner relative to the user who
      // triggered the update, so the locally known value is kept.
      return {
        ...state,
        channels: state.channels.map((c) =>
          c.id == payload.id ? { ...payload, is_owner: existing.is_owner } : c,
        ),
      };
    }
    case "removeChannel":
      return {
        ...state,
        channels: state.channels.filter((c) => c.id != payload),
        connected: state.connected == payload ? undefined : state.connected,
      };
    case "setConnected":
      return { ...state, connected: payload };
    default:
      throw `unknown action type ${type}`;
  }
}

function soundReducer(
  state: SoundState,
  [type, payload]:
    | ["setSounds", SoundResponse[]]
    | ["upsertSound", SoundResponse]
    | ["removeSound", number]
    | ["startPlaying", number]
    | ["stopPlaying", number],
): SoundState {
  switch (type) {
    case "setSounds":
      return { ...state, sounds: payload };
    case "upsertSound":
      if (!state.sounds.some((s) => s.id == payload.id)) {
        return { ...state, sounds: [...state.sounds, payload] };
      }
      return {
        ...state,
        sounds: state.sounds.map((s) => (s.id == payload.id ? payload : s)),
      };
    case "removeSound":
      return {
        ...state,
        sounds: state.sounds.filter((s) => s.id != payload),
      };
    case "startPlaying":
      return {
        ...state,
        playing: {
          ...state.playing,
          [payload]: (state.playing[payload] ?? 0) + 1,
        },
      };
    case "stopPlaying": {
      const { [payload]: count = 0, ...playing } = state.playing;
      if (count > 1) {
        playing[payload] = count - 1;
      }
      return { ...state, playing };
    }
    default:
      throw `unknown action type ${type}`;
  }
}

export default function Main() {
  const [channelState, dispatchChannelState] = useReducer(channelReducer, {
    channels: [],
    connected: undefined,
  });
  const [soundState, dispatchSoundState] = useReducer(soundReducer, {
    sounds: [],
    playing: {},
  });

  // Mirrors channelState.connected so that it can be accessed from within
  // the event stream handlers.
  const connectedChannelId = useRef<number | undefined>(undefined);

  const setConnected = (channelId: number | undefined) => {
    connectedChannelId.current = channelId;
    dispatchChannelState(["setConnected", channelId]);
  };

  const refreshChannel = async (channelId: number) => {
    try {
      const channel = await API_CLIENT.getChannel(channelId);
      dispatchChannelState(["upsertChannel", channel]);
    } catch (e) {
      console.error("failed refreshing channel", channelId, e);
    }
  };

  const channelActions: ChannelActions = {
    connect: async (channelId) => {
      try {
        const { disconnected_channel_id, ...channel } =
          await API_CLIENT.connectChannel(channelId);
        dispatchChannelState(["upsertChannel", channel]);
        // The update of the previous channel is only sent to the users
        // remaining in it, so it needs to be fetched explicitly.
        if (disconnected_channel_id) {
          refreshChannel(disconnected_channel_id);
        }
      } catch (e) {
        if (!(e instanceof ApiError && e.code == "already_connected")) {
          throw e;
        }
      }
      setConnected(channelId);
    },
    disconnect: async () => {
      try {
        await API_CLIENT.disconnectChannel();
      } catch (e) {
        if (!(e instanceof ApiError && e.code == "not_connected")) {
          throw e;
        }
      }
      setConnected(undefined);
    },
    addChannel: (channel) => {
      dispatchChannelState(["upsertChannel", channel]);
    },
  };

  useEffect(() => {
    const loadChannels = () =>
      API_CLIENT.listChannels()
        .then((chans) => dispatchChannelState(["setChannels", chans]))
        .catch((e) => console.error("failed listing channels", e));

    loadChannels();
    API_CLIENT.listSounds()
      .then((sounds) => dispatchSoundState(["setSounds", sounds]))
      .catch((e) => console.error("failed listing sounds", e));

    const eventStream = API_CLIENT.connectEvents();

    // The server drops the channel connection when the last event stream of
    // a user closes, so the connection is restored after a reconnect.
    let reconnecting = false;
    eventStream.onError(() => {
      reconnecting = true;
    });
    eventStream.onOpen(() => {
      if (!reconnecting) return;
      reconnecting = false;
      loadChannels();
      const channelId = connectedChannelId.current;
      if (channelId === undefined) return;
      API_CLIENT.connectChannel(channelId)
        .then((channel) => dispatchChannelState(["upsertChannel", channel]))
        .catch((e) => {
          if (e instanceof ApiError && e.code == "already_connected") return;
          console.error("failed reconnecting to channel", channelId, e);
          connectedChannelId.current = undefined;
          dispatchChannelState(["setConnected", undefined]);
        });
    });

    eventStream.on("channel-update", (event) =>
      dispatchChannelState(["upsertChannel", event.Channel]),
    );
    eventStream.on("channel-delete", (event) => {
      if (connectedChannelId.current == event.channel_id) {
        connectedChannelId.current = undefined;
      }
      dispatchChannelState(["removeChannel", event.channel_id]);
    });

    eventStream.on("sound-create", (event) =>
      dispatchSoundState(["upsertSound", event.Sound]),
    );
    eventStream.on("sound-update", (event) => {
      // The sound file might have changed, e.g. when it has been trimmed.
      evictSound(event.Sound.id);
      dispatchSoundState(["upsertSound", event.Sound]);
    });
    eventStream.on("sound-delete", (event) => {
      evictSound(event.sound_id);
      dispatchSoundState(["removeSound", event.sound_id]);
    });

    eventStream.on("play", (event) => {
      dispatchSoundState(["startPlaying", event.sound]);
      playSound(event.sound)
        .catch((e) => console.error("failed playing sound", event.sound, e))
        .finally(() => dispatchSoundState(["stopPlaying", event.sound]));
    });

    return () => eventStream.close();
  }, []);

  return (
    <ChannelContext value={channelState}>
      <ChannelActionsContext value={channelActions}>
        <SoundContext value={soundState}>
          <div className={styles.outer}>
            <SideBar />
            <main className={styles.content}>
              <Outlet />
            </main>
          </div>
        </SoundContext>
      </ChannelActionsContext>
    </ChannelContext>
  );
}
