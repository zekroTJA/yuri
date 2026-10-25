// Types mirroring the JSON shapes produced by pkg/api and pkg/api/models.

export type Scope = "read" | "write" | "delete";

export type SoundFilter = "normalize" | "overdrive";

// -- Auth --------------------------------------------------------------

export interface AuthRequest {
  handle: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  handle: string;
}

// -- API keys ------------------------------------------------------------

export interface APIKeyCreateRequest {
  name: string;
  scopes: Scope[];
}

export interface APIKeyUpdateRequest {
  name: string;
}

export interface APIKeyResponse {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  scopes: Scope[];
  owner_id: number;
}

export interface APIKeyCreateResponse extends APIKeyResponse {
  key: string;
}

// -- Sounds --------------------------------------------------------------

export interface SoundUserResponse {
  id: number;
  handle: string;
}

export interface SoundResponse {
  id: number;
  created_at: string;
  updated_at: string;
  handle: string;
  tags: string[];
  creator: SoundUserResponse;
}

export interface SoundUpdateRequest {
  handle: string;
  tags?: string[];
}

// Range of the sound to keep in seconds.
export interface SoundTrimRequest {
  start: number;
  end: number;
}

export interface UploadSoundRequest {
  handle: string;
  // Either file or url must be set. When url is set, the media behind the
  // URL is downloaded by the server and its audio is extracted.
  file?: File | Blob;
  url?: string;
  tags?: string[];
  filters?: SoundFilter[];
}

export interface SoundImportSkipped {
  name: string;
  reason: string;
}

export interface SoundImportResponse {
  imported: SoundResponse[];
  skipped: SoundImportSkipped[];
}

// -- Channels --------------------------------------------------------------

export interface ChannelRequest {
  name: string;
}

export interface ChannelUserResponse {
  id: number;
  handle: string;
}

export interface ChannelResponse {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  owner: ChannelUserResponse;
  member_count: number;
  members: ChannelUserResponse[];
  is_owner: boolean;
  connected_users: ChannelUserResponse[];
}

export interface ChannelConnectionResponse extends ChannelResponse {
  disconnected_channel_id?: number;
}

// -- Channel invites -------------------------------------------------------

export interface ChannelInviteCreateRequest {
  max_activations?: number;
  expires_at?: string;
}

export interface ChannelInviteResponse {
  id: number;
  created_at: string;
  code: string;
  activations: number;
  max_activations: number;
  expires_at?: string;
  channel_id: number;
  creator_id: number;
}

// -- SSE events --------------------------------------------------------------

export const EventType = {
  Play: "play",
  ChannelUpdate: "channel-update",
  ChannelDelete: "channel-delete",
  SoundCreate: "sound-create",
  SoundUpdate: "sound-update",
  SoundDelete: "sound-delete",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export interface PlayEventData {
  sound: number;
}

// The backend does not set a json tag on this field, so it is
// serialized using the exported Go field name "Channel".
export interface ChannelUpdateEventData {
  Channel: ChannelResponse;
}

export interface ChannelDeleteEventData {
  channel_id: number;
}

// The backend does not set a json tag on this field, so it is
// serialized using the exported Go field name "Sound".
export interface SoundCreateEventData {
  Sound: SoundResponse;
}

export interface SoundUpdateEventData {
  Sound: SoundResponse;
}

export interface SoundDeleteEventData {
  sound_id: number;
}

export interface EventPayloadMap {
  [EventType.Play]: PlayEventData;
  [EventType.ChannelUpdate]: ChannelUpdateEventData;
  [EventType.ChannelDelete]: ChannelDeleteEventData;
  [EventType.SoundCreate]: SoundCreateEventData;
  [EventType.SoundUpdate]: SoundUpdateEventData;
  [EventType.SoundDelete]: SoundDeleteEventData;
}
