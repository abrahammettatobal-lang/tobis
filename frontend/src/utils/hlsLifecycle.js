import Hls from 'hls.js';

export function safePlay(video) {
  if (!video) return Promise.resolve();
  return video.play().catch((err) => {
    const message = err?.message || '';
    if (
      err?.name === 'AbortError' ||
      err?.name === 'NotAllowedError' ||
      message.includes('aborted') ||
      message.includes('interrupted')
    ) {
      return;
    }
    throw err;
  });
}

export function teardownHls(hls, video) {
  if (!hls) {
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    return Promise.resolve();
  }

  video?.pause();

  try {
    hls.stopLoad();
  } catch {
    // ignore — instance may already be torn down
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        hls.destroy();
      } catch {
        // ignore
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      resolve();
    };

    if (hls.media) {
      const onDetached = () => {
        hls.off(Hls.Events.MEDIA_DETACHED, onDetached);
        finish();
      };
      hls.on(Hls.Events.MEDIA_DETACHED, onDetached);
      try {
        hls.detachMedia();
      } catch {
        finish();
        return;
      }
      setTimeout(finish, 200);
    } else {
      finish();
    }
  });
}
