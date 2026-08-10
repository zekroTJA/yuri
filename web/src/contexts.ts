import { createContext } from "react";
import type { ChannelResponse } from "./services/apiclient";

export type ChannelState = {
  channels: ChannelResponse[];
  connected: number | undefined;
};

export const ChannelContext = createContext<ChannelState>({
  channels: [],
  connected: undefined,
});
