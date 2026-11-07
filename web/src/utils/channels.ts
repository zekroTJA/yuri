import type { ChannelResponse } from "../services/apiclient";

// Returns the channels ordered by the position of their IDs in channelIds.
// Channels which are not contained in channelIds are appended in their
// current order and IDs of unknown channels are ignored.
export function orderChannels(
  channels: ChannelResponse[],
  channelIds: number[],
): ChannelResponse[] {
  const positions = new Map(channelIds.map((id, i) => [id, i]));
  const position = (channel: ChannelResponse) =>
    positions.get(channel.id) ?? channelIds.length;
  return channels.toSorted((a, b) => position(a) - position(b));
}

// Returns where movedId is placed when it is dropped on the half of the
// channel targetId given by placeAfter. Drop positions are expressed as
// "after the previous channel" when possible, so that every position has
// exactly one representation. Undefined is returned when dropping would not
// change the order.
export function channelDropTarget(
  channelIds: number[],
  movedId: number,
  targetId: number,
  placeAfter: boolean,
): { channelId: number; placeAfter: boolean } | undefined {
  const targetIndex = channelIds.indexOf(targetId);
  if (targetIndex < 0) return undefined;

  let dropTarget = { channelId: targetId, placeAfter };
  if (!placeAfter && targetIndex > 0) {
    dropTarget = { channelId: channelIds[targetIndex - 1], placeAfter: true };
  }

  const moved = moveChannelId(
    channelIds,
    movedId,
    dropTarget.channelId,
    dropTarget.placeAfter,
  );
  const isChanged = moved.some((id, i) => id != channelIds[i]);
  return isChanged ? dropTarget : undefined;
}

// Returns channelIds with movedId moved before or after targetId.
export function moveChannelId(
  channelIds: number[],
  movedId: number,
  targetId: number,
  placeAfter: boolean,
): number[] {
  const result = channelIds.filter((id) => id != movedId);
  const targetIndex = result.indexOf(targetId);
  if (targetIndex < 0) return channelIds;
  result.splice(targetIndex + (placeAfter ? 1 : 0), 0, movedId);
  return result;
}
