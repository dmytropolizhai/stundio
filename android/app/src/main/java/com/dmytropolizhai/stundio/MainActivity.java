package com.dmytropolizhai.stundio;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 15 (our targetSdk) enforces edge-to-edge whether or not the app opts in; doing
        // it ourselves keeps the look identical down to minSdk 23 and lets the WebView's own
        // `env(safe-area-inset-*)` (src/index.css) see the real bar insets the app's CSS already
        // prices in (TabBar, DayView's header, the DS bottom sheet).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(ImageSharePlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
