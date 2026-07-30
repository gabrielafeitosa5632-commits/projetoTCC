package com.phytopathometric.app;

import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "PhytoPathometric";

    @Override
    protected void load() {
        super.load();
        if (bridge == null) {
            return;
        }

        bridge.addWebViewListener(
            new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                    Log.e(TAG, "Android WebView renderer exited; recreating the app screen. didCrash=" + detail.didCrash());
                    runOnUiThread(
                        () -> {
                            if (!isFinishing() && !isDestroyed()) {
                                recreate();
                            }
                        }
                    );
                    return true;
                }
            }
        );
    }
}
