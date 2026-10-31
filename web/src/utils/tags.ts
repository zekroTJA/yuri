import type { ChannelResponse, SoundResponse } from "../services/apiclient";

// Splits a comma separated list of tags and removes empty entries.
export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => !!t);
}

// Returns true when the sound has a tag which is contained in the tag
// blocklist of the channel. Tags are matched case-insensitively, same as on
// the server.
export function isSoundBlocked(
  sound: SoundResponse,
  channel: ChannelResponse | undefined,
): boolean {
  const blocklist = channel?.tag_blocklist?.map((t) => t.toLowerCase());
  if (!blocklist?.length) return false;
  return !!sound.tags?.some((t) => blocklist.includes(t.toLowerCase()));
}
