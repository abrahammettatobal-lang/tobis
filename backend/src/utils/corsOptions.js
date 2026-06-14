const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const LOCAL_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

const HOSTED_ORIGIN =
  /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.(vercel\.app|up\.railway\.app|fly\.dev|onrender\.com)$/i;

export function buildCorsOptions() {
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowlist = new Set([...LOCAL_ORIGINS, ...configured]);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowlist.has(origin) || LOCAL_ORIGIN.test(origin) || HOSTED_ORIGIN.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
}
