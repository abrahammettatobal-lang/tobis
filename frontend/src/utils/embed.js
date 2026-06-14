export function buildPlayerSrc(channel) {
  if (!channel) return null;
  return channel.embedUrl || null;
}

export function channelBadge(channel) {
  if (channel?.hd) return 'HD';
  return 'SD';
}
