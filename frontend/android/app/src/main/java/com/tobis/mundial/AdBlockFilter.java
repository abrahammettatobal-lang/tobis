package com.tobis.mundial;

import android.net.Uri;

final class AdBlockFilter {

    private AdBlockFilter() {}

    private static final String[] BLOCKED_FRAGMENTS = {
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google",
        "adsafeprotected.com",
        "adnxs.com",
        "adform.net",
        "taboola.com",
        "outbrain.com",
        "mgid.com",
        "exoclick.com",
        "popads.net",
        "popcash.net",
        "adsterra.com",
        "clickadu.com",
        "revcontent.com",
        "pubmatic.com",
        "openx.net",
        "criteo.com",
        "amazon-adsystem.com",
        "propellerads.com",
        "media.net",
        "infolinks.com",
        "yieldmo.com",
        "rubiconproject.com",
        "3lift.com",
        "bet365",
        "1xbet",
        "stake.com",
        "chaturbate.com",
        "/ads?",
        "/ads/",
        "/adserver",
        "/advert",
        "popunder",
        "pop-up",
        "popup",
    };

    static boolean shouldBlockUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty()) {
            return false;
        }

        String url = rawUrl.toLowerCase();

        try {
            Uri uri = Uri.parse(rawUrl);
            String host = uri.getHost();
            if (host != null) {
                host = host.toLowerCase();
                if ("stream-xhd.com".equals(host) || host.endsWith(".stream-xhd.com")) {
                    return false;
                }
                if ("localhost".equals(host)) {
                    return false;
                }
                if ("raw.githubusercontent.com".equals(host)) {
                    return false;
                }
            }
        } catch (Exception ignored) {
            // fall through to fragment checks
        }

        for (String fragment : BLOCKED_FRAGMENTS) {
            if (url.contains(fragment)) {
                return true;
            }
        }

        return false;
    }
}
