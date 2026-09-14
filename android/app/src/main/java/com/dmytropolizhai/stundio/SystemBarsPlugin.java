package com.dmytropolizhai.stundio;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges the app's *setting* (system/light/dark — `src/ui/theme/useTheme.ts`) to the status
 * and navigation bar icon colour. Android only knows the system's own dark mode — `styles.xml`'s
 * `-night` split is just a best guess for the instant before this runs — and has no notion of
 * an explicit in-app override, so JS calls `setAppearance` once the theme resolves, and again
 * every time it changes (including a system flip while the setting is "system").
 *
 * Bar *colour* is left alone: `styles.xml` makes both bars transparent and edge-to-edge
 * (`MainActivity`'s `WindowCompat.setDecorFitsSystemWindows(false)`), so the WebView's own
 * themed background already shows through — only which icon tint reads legibly on it is
 * this plugin's job.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setAppearance(PluginCall call) {
        boolean isLight = "light".equals(call.getString("style", "light"));

        getActivity().runOnUiThread(() -> {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            controller.setAppearanceLightStatusBars(isLight);
            controller.setAppearanceLightNavigationBars(isLight);
        });

        call.resolve();
    }
}
