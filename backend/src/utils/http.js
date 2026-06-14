const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

const DEFAULT_TIMEOUT_MS = 12_000;

function withTimeout(options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (options.signal) return options;
  return { ...options, signal: AbortSignal.timeout(timeoutMs) };
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...withTimeout(options),
    headers: { ...DEFAULT_HEADERS, ...options.headers },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al obtener ${url}`);
  }

  return response.text();
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...withTimeout(options),
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al obtener ${url}`);
  }

  return response.json();
}
