const ALLOWED_STREAM_HOSTS = new Set(['stream-xhd.com', 'www.stream-xhd.com']);

const AD_SCRIPT_HOST_RE =
  /doubleclick|googlesyndication|googleadservices|adservice\.google|adnxs|adform|taboola|outbrain|mgid|exoclick|popads|popcash|adsterra|clickadu|revcontent|pubmatic|openx|criteo|amazon-adsystem|propellerads|media\.net|infolinks|yieldmo|rubiconproject|3lift|casino|bet365|1xbet|stake\.com|chaturbate/i;

const AD_IFRAME_SRC_RE =
  /<iframe\b[^>]*\bsrc=["']https?:\/\/(?!(?:www\.)?stream-xhd\.com)[^"']+["'][^>]*>\s*<\/iframe>/gi;

const EXTERNAL_SCRIPT_RE = /<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>\s*<\/script>/gi;

const INLINE_SCRIPT_AD_RE =
  /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?(popunder|popads|exoclick|window\.open\s*\(|location\.(?:href|replace)\s*=)[\s\S]*?<\/script>/gi;

const AD_OVERLAY_CSS = `<style id="tobis-ad-strip">
[class*="ad-"],[class*="ads-"],[id*="ad-"],[id*="ads-"],
[class*="banner"],[id*="banner"],[class*="popup"],[id*="popup"],
ins.adsbygoogle,iframe[src*="doubleclick"],iframe[src*="googlesyndication"]{
  display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important}
</style>`;

export function isAllowedStreamTarget(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && ALLOWED_STREAM_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function shouldDropScriptSrc(src) {
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (ALLOWED_STREAM_HOSTS.has(host) || host.endsWith('.stream-xhd.com')) {
      return false;
    }
    return AD_SCRIPT_HOST_RE.test(host) || AD_SCRIPT_HOST_RE.test(src);
  } catch {
    return true;
  }
}

export function sanitizeStreamEmbedHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let out = html;

  out = out.replace(EXTERNAL_SCRIPT_RE, (match, src) => {
    return shouldDropScriptSrc(src) ? '' : match;
  });

  out = out.replace(INLINE_SCRIPT_AD_RE, '');
  out = out.replace(AD_IFRAME_SRC_RE, '');

  if (!out.includes('tobis-ad-strip')) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${AD_OVERLAY_CSS}`);
  }

  return out;
}

export async function fetchStreamEmbed(targetUrl) {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://mundialgad.web.app/',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Stream upstream ${response.status}`);
  }

  const html = await response.text();
  return sanitizeStreamEmbedHtml(html);
}
