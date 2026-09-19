package com.dmytropolizhai.stundio;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 15 (our targetSdk) enforces edge-to-edge whether or not the app opts in; doing
        // it ourselves keeps the look identical down to minSdk 23.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(ImageSharePlugin.class);
        registerPlugin(StundioWidgetPlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);

        // Clear launch splash window background so it never persists or bleeds through transparent bars
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

        // Android WebView does not automatically populate CSS env(safe-area-inset-*),
        // so we measure system window insets (status bar + display cutout) and inject CSS variables.
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;
            float topDp = insets.top / density;
            float bottomDp = insets.bottom / density;

            if (bridge != null && bridge.getWebView() != null) {
                String js = String.format(
                    Locale.US,
                    "document.documentElement.style.setProperty('--safe-area-inset-top', '%.2fpx');" +
                    "document.documentElement.style.setProperty('--safe-area-inset-bottom', '%.2fpx');",
                    topDp,
                    bottomDp
                );
                bridge.getWebView().evaluateJavascript(js, null);
            }
            return windowInsets;
        });
    }
}
