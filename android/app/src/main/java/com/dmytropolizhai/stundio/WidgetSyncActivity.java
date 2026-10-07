package com.dmytropolizhai.stundio;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.dmytropolizhai.stundio.widget.WidgetRefresher;
import com.getcapacitor.BridgeActivity;

/**
 * The widget's refresh button lands here: a translucent, invisible host for the same
 * Capacitor bridge `MainActivity` runs.
 *
 * EduPage is only reachable through the JS sync engine (CapacitorHttp → `lib/edupage` parsing →
 * the resolved day), and the widget deliberately re-implements none of that natively. Booting
 * the real app in a window nobody sees is the cheapest way to reuse all of it: `bootApp` runs
 * its usual refresh, `StundioWidgetPlugin.isSyncRequest` tells JS this launch is a widget tap,
 * and JS calls `finishSync` once the fresh payload has been published.
 *
 * {@link #TIMEOUT_MS} is the backstop for a JS side that never answers (no network stack up,
 * a crash on boot): the window must not linger, and the tile is re-rendered from whatever is
 * cached either way.
 */
public class WidgetSyncActivity extends BridgeActivity {

    private static final long TIMEOUT_MS = 30_000;

    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(ImageSharePlugin.class);
        registerPlugin(StundioWidgetPlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
        handler.postDelayed(this::finish, TIMEOUT_MS);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Belt and braces on top of the translucent theme: the WebView paints its own
        // background, which would otherwise flash over the home screen.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setAlpha(0f);
        }
    }

    @Override
    public void finish() {
        handler.removeCallbacksAndMessages(null);
        super.finish();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
        WidgetRefresher.refreshAll(getApplicationContext());
    }
}
