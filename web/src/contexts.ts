import { createContext } from "react";
import type { ChannelResponse, SoundResponse } from "./services/apiclient";

export type ChannelState = {
  channels: ChannelResponse[];
  connected: number | undefined;
};

export const ChannelContext = createContext<ChannelState>({
  channels: [],
  connected: undefined,
});

export type ChannelActions = {
  connect: (channelId: number) => Promise<void>;
  disconnect: () => Promise<void>;
  addChannel: (channel: ChannelResponse) => void;
};

export const ChannelActionsContext = createContext<ChannelActions>({
  connect: async () => {},
  disconnect: async () => {},
  addChannel: () => {},
});

export type SoundState = {
  sounds: SoundResponse[];
  // Number of currently running playbacks keyed by sound ID.
  playing: Record<number, number>;
};

export const SoundContext = createContext<SoundState>({
  sounds: [],
  playing: {},
});
