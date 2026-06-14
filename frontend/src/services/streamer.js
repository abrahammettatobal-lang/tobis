const STREAMER_BASE = import.meta.env.VITE_STREAMER_API || 'http://localhost:8091';
const STREAMER_TIMEOUT_MS = 90_000;
const LIVE_SEARCH_TIMEOUT_MS = 90_000;
const HEALTH_TIMEOUT_MS = 5_000;

async function request(path, options = {}) {
  const { signal, headers, ...rest } = options;
  const response = await fetch(`${STREAMER_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: signal ?? AbortSignal.timeout(STREAMER_TIMEOUT_MS),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'streamer_error');
  }
  return payload;
}

export function buildP2PSearchParams(match, mode = 'replay') {
  const params = new URLSearchParams({ mode });
  const query = buildReplayQuery(match);

  if (query) params.set('q', query);
  if (match?.teamA?.nameEn) params.set('home', match.teamA.nameEn);
  if (match?.teamB?.nameEn) params.set('away', match.teamB.nameEn);
  if (match?.teamA?.abbr) params.set('abbrHome', match.teamA.abbr);
  if (match?.teamB?.abbr) params.set('abbrAway', match.teamB.abbr);
  if (match?.group) params.set('group', match.group);

  return params;
}

export async function searchReplaySources(query, mode = 'replay', match = null) {
  const params = match
    ? buildP2PSearchParams(match, mode)
    : new URLSearchParams({ q: query, mode });

  if (!match && query) params.set('q', query);

  const timeoutMs = mode === 'live' ? LIVE_SEARCH_TIMEOUT_MS : STREAMER_TIMEOUT_MS;
  return request(`/api/search?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
}

export async function startReplayStream(torrentRef) {
  const body =
    typeof torrentRef === 'object' && torrentRef !== null
      ? { meta: torrentRef }
      : { id: String(torrentRef) };

  if (!body.id && !body.meta) {
    throw new Error('Fuente invalida. Busca de nuevo.');
  }

  return request('/api/play', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getReplayStatus() {
  return request('/api/status');
}

export async function stopReplayStream() {
  return request('/api/stop', { method: 'POST' });
}

export async function checkStreamerHealth() {
  try {
    const response = await fetch(`${STREAMER_BASE}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function getStreamerBaseUrl() {
  return STREAMER_BASE;
}

export function buildReplayQuery(match) {
  if (!match) return '';
  const home = match.teamA?.nameEn || match.teamA?.name || '';
  const away = match.teamB?.nameEn || match.teamB?.name || '';
  return `${home} ${away}`.trim();
}

export function getVideoStreamUrl(apiStreamUrl) {
  if (!apiStreamUrl) return null;
  if (apiStreamUrl.startsWith('http')) return apiStreamUrl;
  return `${STREAMER_BASE}${apiStreamUrl}`;
}
