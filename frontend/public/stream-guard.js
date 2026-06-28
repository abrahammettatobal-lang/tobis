/**
 * Stream guard: anti-anuncios, anti-redirección, iframe limpio.
 */
(function initStreamGuard(global) {
  const ALLOWED_HOSTS = new Set(['stream-xhd.com', 'www.stream-xhd.com']);
  const LOCKED_ORIGIN = global.location.origin;
  const HOME_URL = `${global.location.pathname}${global.location.search}${global.location.hash}`;

  const STREAM_ALLOW =
    'autoplay; encrypted-media; fullscreen; picture-in-picture';

  const AD_BLOCK_HOST_RE =
    /doubleclick|googlesyndication|googleadservices|adnxs|taboola|outbrain|mgid|exoclick|popads|adsterra|clickadu|revcontent|pubmatic|openx|criteo|amazon-adsystem|propellerads|media\.net|bet365|1xbet|stake\.com|chaturbate/i;

  let clickShieldState = null;

  function isCapacitorNative() {
    return global.Capacitor?.isNativePlatform?.() === true;
  }

  function isAllowedStreamUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, global.location.href);
      if (url.protocol !== 'https:') return false;
      return ALLOWED_HOSTS.has(url.hostname);
    } catch {
      return false;
    }
  }

  function shouldUseStreamProxy() {
    const flag = document.querySelector('meta[name="tobis-stream-proxy"]')?.content?.trim();
    if (flag === 'off') return false;
    if (flag === 'on') return true;
    if (isCapacitorNative()) return false;
    return true;
  }

  function resolveStreamProxyBase() {
    const explicit = document
      .querySelector('meta[name="tobis-stream-proxy-base"]')
      ?.content?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    if (global.location.hostname === 'localhost') {
      return `${global.location.origin}/api`;
    }

    return `${global.location.origin}/api`;
  }

  function wrapStreamUrl(rawUrl) {
    if (!shouldUseStreamProxy()) return rawUrl;
    const base = resolveStreamProxyBase();
    return `${base}/stream/embed?target=${encodeURIComponent(rawUrl)}`;
  }

  function stripSandboxAttribute(iframe) {
    if (!iframe) return;
    iframe.removeAttribute('sandbox');
    iframe.removeAttribute('credentialless');
  }

  function cloakSandboxDetection(iframe) {
    if (!iframe || iframe.__tobisSandboxCloak) return;

    stripSandboxAttribute(iframe);

    const observer = new MutationObserver(() => {
      stripSandboxAttribute(iframe);
    });
    observer.observe(iframe, {
      attributes: true,
      attributeFilter: ['sandbox', 'credentialless'],
    });

    iframe.__tobisSandboxCloak = observer;
  }

  function installAdMasks(cage) {
    if (!cage || cage.querySelector('.stream-ad-mask-top')) return;

    const top = document.createElement('div');
    top.className = 'stream-ad-mask-top';
    top.setAttribute('aria-hidden', 'true');

    const bottom = document.createElement('div');
    bottom.className = 'stream-ad-mask-bottom';
    bottom.setAttribute('aria-hidden', 'true');

    cage.appendChild(top);
    cage.appendChild(bottom);
  }

  function prepareStreamIframe(iframe) {
    if (!iframe) return iframe;

    cloakSandboxDetection(iframe);
    iframe.setAttribute('allow', STREAM_ALLOW);
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('loading', 'eager');

    const cage = iframe.closest('.stream-cage');
    if (cage) installAdMasks(cage);

    return iframe;
  }

  function installStreamClickShield(cage, iframe) {
    if (!cage || !iframe) return null;

    let locked = false;
    let lockTimer = null;
    let autoLockTimer = null;

    let shield = cage.querySelector('.stream-click-shield');
    if (!shield) {
      shield = document.createElement('div');
      shield.className = 'stream-click-shield is-waiting';
      shield.setAttribute('role', 'button');
      shield.setAttribute('aria-label', 'Toca una vez para iniciar la transmisión');
      shield.innerHTML = '<span class="stream-click-shield__hint">Toca para iniciar</span>';
      cage.appendChild(shield);
    }

    function lock() {
      locked = true;
      shield.classList.remove('is-waiting');
      shield.classList.add('is-locked');
      shield.style.pointerEvents = 'auto';
      iframe.style.pointerEvents = 'none';
    }

    function reset() {
      locked = false;
      clearTimeout(lockTimer);
      clearTimeout(autoLockTimer);
      shield.classList.remove('is-locked');
      shield.classList.add('is-waiting');
      shield.style.pointerEvents = 'auto';
      iframe.style.pointerEvents = 'auto';
    }

    function passFirstTap() {
      if (locked) return;
      shield.style.pointerEvents = 'none';
      clearTimeout(lockTimer);
      lockTimer = setTimeout(lock, 500);
    }

    function scheduleAutoLock() {
      clearTimeout(autoLockTimer);
      autoLockTimer = setTimeout(() => {
        if (!locked) lock();
      }, 2800);
    }

    function blockLocked(e) {
      if (!locked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    iframe.addEventListener('load', scheduleAutoLock);

    shield.addEventListener(
      'touchstart',
      (e) => {
        if (locked) {
          e.preventDefault();
          return;
        }
        passFirstTap();
      },
      { passive: false }
    );

    shield.addEventListener('mousedown', (e) => {
      if (locked) {
        e.preventDefault();
        return;
      }
      if (e.button === 0) passFirstTap();
    });

    ['click', 'touchend', 'dblclick', 'contextmenu'].forEach((type) => {
      shield.addEventListener(type, blockLocked, true);
    });

    reset();
    clickShieldState = { reset, lock };
    return clickShieldState;
  }

  function ensureClickShield(iframe) {
    const cage = iframe?.closest?.('.stream-cage');
    if (!cage) return;
    if (!cage.querySelector('.stream-click-shield')) {
      installStreamClickShield(cage, iframe);
    }
  }

  function setStreamSrc(iframe, rawUrl) {
    if (!iframe || !isAllowedStreamUrl(rawUrl)) {
      console.warn('[tobis-stream-guard] URL de stream bloqueada:', rawUrl);
      return false;
    }

    prepareStreamIframe(iframe);
    ensureClickShield(iframe);

    const nextSrc = wrapStreamUrl(rawUrl);
    if (iframe.src !== nextSrc) {
      iframe.src = nextSrc;
    }

    clickShieldState?.reset();
    return true;
  }

  function restoreHome() {
    if (global.location.origin !== LOCKED_ORIGIN) {
      global.location.replace(HOME_URL);
    }
  }

  function blockPopups() {
    const nativeOpen = global.open?.bind(global);
    if (!nativeOpen) return;

    global.open = function blockWindowOpen(...args) {
      console.warn('[tobis-stream-guard] window.open bloqueado');
      const popup = nativeOpen(...args);
      if (popup) {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      }
      return null;
    };
  }

  function lockTopNavigation() {
    if ('navigation' in global) {
      global.navigation.addEventListener('navigate', (event) => {
        try {
          const dest = new URL(event.destination.url);
          if (dest.origin !== LOCKED_ORIGIN) {
            event.preventDefault();
            console.warn('[tobis-stream-guard] navegación externa bloqueada:', dest.href);
          }
        } catch {
          event.preventDefault();
        }
      });
    }

    global.addEventListener('pagehide', restoreHome, true);
    global.addEventListener('pageshow', restoreHome, true);
    global.setInterval(restoreHome, 120);
  }

  function trapParentClicks() {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const link = target.closest('a[href]');
        if (!link) return;
        if (link.closest('#live-player, #tobis-live-player, .stream-cage, .stream-click-shield, .stream-ad-mask-top, .stream-ad-mask-bottom')) {
          return;
        }

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('/')) return;

        try {
          const url = new URL(href, global.location.href);
          if (url.origin !== global.location.origin || AD_BLOCK_HOST_RE.test(url.href)) {
            event.preventDefault();
            event.stopPropagation();
            console.warn('[tobis-stream-guard] enlace externo bloqueado:', url.href);
          }
        } catch {
          event.preventDefault();
        }
      },
      true
    );
  }

  function installPageGuard() {
    if (global.opener !== null) {
      global.close();
      return;
    }

    blockPopups();
    lockTopNavigation();
    trapParentClicks();
  }

  function installStreamFrame(iframe) {
    prepareStreamIframe(iframe);
    ensureClickShield(iframe);
  }

  global.TobisStreamGuard = {
    ALLOWED_HOSTS,
    STREAM_ALLOW,
    isAllowedStreamUrl,
    prepareStreamIframe,
    installStreamClickShield,
    installStreamFrame,
    setStreamSrc,
    installPageGuard,
  };
})(window);
