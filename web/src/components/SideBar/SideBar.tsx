import { useContext } from "react";
import styles from "./SideBar.module.css";
import { ChannelContext } from "../../contexts";
import type { ChannelResponse } from "../../services/apiclient";

export default function SideBar() {
  const channels = useContext(ChannelContext);

  return (
    <div className={styles.container}>
      {channels.channels.map((c) => (
        <Channel channel={c} />
      ))}
    </div>
  );
}

function Channel({ channel }: { channel: ChannelResponse }) {
  return (
    <div className={styles.channel}>
      <span>{channel.name}</span>
      <ul>
        {channel.connected_users.map((u) => (
          <li>{u.handle}</li>
        ))}
      </ul>
    </div>
  );
}
