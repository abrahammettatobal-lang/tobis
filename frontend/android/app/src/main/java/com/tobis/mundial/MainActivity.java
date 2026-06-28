package com.tobis.mundial;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private static boolean isHostAllowed(String host) {
        if (host == null) {
            return false;
        }

        host = host.toLowerCase();
        if ("localhost".equals(host)) {
            return true;
        }
        if ("stream-xhd.com".equals(host) || host.endsWith(".stream-xhd.com")) {
            return true;
        }
        if ("raw.githubusercontent.com".equals(host)) {
            return true;
        }
        return false;
    }

    private static boolean isUrlAllowed(Uri uri) {
        if (uri == null) {
            return false;
        }

        String scheme = uri.getScheme();
        if (scheme == null) {
            return false;
        }

        if ("file".equals(scheme) || "content".equals(scheme) || "capacitor".equals(scheme)) {
            return true;
        }

        if ("http".equals(scheme) || "https".equals(scheme)) {
            return isHostAllowed(uri.getHost());
        }

        return false;
    }

    private static WebResourceResponse blockedResponse() {
        return new WebResourceResponse(
            "text/plain",
            "utf-8",
            new ByteArrayInputStream("blocked".getBytes(StandardCharsets.UTF_8))
        );
    }

    private void installWebGuards() {
        if (bridge == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        String userAgent = webView.getSettings().getUserAgentString();
        if (userAgent != null && userAgent.contains("; wv")) {
            webView.getSettings().setUserAgentString(
                userAgent.replace("; wv", "").replace("Version/4.0 ", "")
            );
        }

        webView.setWebViewClient(
            new BridgeWebViewClient(bridge) {
                @Override
                public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
                ) {
                    String url = request.getUrl().toString();
                    if (AdBlockFilter.shouldBlockUrl(url)) {
                        return blockedResponse();
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (!isUrlAllowed(request.getUrl())) {
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            }
        );

        webView.setWebChromeClient(
            new BridgeWebChromeClient(bridge) {
                @Override
                public boolean onCreateWindow(
                    WebView view,
                    boolean isDialog,
                    boolean isUserGesture,
                    Message resultMsg
                ) {
                    return false;
                }
            }
        );
    }

    private void scheduleWebGuards() {
        new Handler(Looper.getMainLooper()).post(this::installWebGuards);
    }

    @Override
    public void onStart() {
        super.onStart();
        scheduleWebGuards();
    }

    @Override
    public void onResume() {
        super.onResume();
        scheduleWebGuards();
    }
}
