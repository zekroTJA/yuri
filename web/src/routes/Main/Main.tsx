import { useEffect, useReducer } from "react";
import SideBar from "../../components/SideBar/SideBar";
import { API_CLIENT, type ChannelResponse } from "../../services/apiclient";
import styles from "./Main.module.css";
import { ChannelContext, type ChannelState } from "../../contexts";

function channelReducer(
  state: ChannelState,
  [type, payload]:
    | ["setChannels", ChannelResponse[]]
    | ["updateChannel", ChannelResponse]
    | ["addChannel", ChannelResponse]
    | ["removeChannel", number],
): ChannelState {
  switch (type) {
    case "setChannels":
      return { ...state, channels: payload };
    case "updateChannel":
      return {
        ...state,
        channels: state.channels.map((c) => (c.id == payload.id ? payload : c)),
      };
    case "addChannel":
      return {
        ...state,
        channels: [...state.channels, payload],
      };
    case "removeChannel":
      return {
        ...state,
        channels: state.channels.filter((c) => c.id != payload),
      };
    default:
      throw `unknown action type ${type}`;
  }
}

export default function Main() {
  const [channelState, dispatchChannelState] = useReducer(channelReducer, {
    channels: [],
    connected: undefined,
  });

  useEffect(() => {
    API_CLIENT.listChannels().then((chans) => {
      dispatchChannelState(["setChannels", chans]);
    });

    const eventStream = API_CLIENT.connectEvents();
    eventStream.on("channel-update", (event) =>
      dispatchChannelState(["updateChannel", event.Channel]),
    );
    eventStream.on("channel-delete", (event) =>
      dispatchChannelState(["removeChannel", event.channel_id]),
    );

    return () => eventStream.close();
  }, []);

  return (
    <ChannelContext value={channelState}>
      <div className={styles.outer}>
        <SideBar />
      </div>
    </ChannelContext>
  );
}
