package com.dmytropolizhai.stundio;

import com.dmytropolizhai.stundio.widget.WidgetPayload;
import com.dmytropolizhai.stundio.widget.WidgetRefresher;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Backs `src/lib/widget/native.ts` — the bridge between a finished sync and the home screen.
 *
 * This is a custom plugin rather than `@capacitor/preferences` because of the second line of
 * `publish`: storing the payload is only half the job, and a widget that waited for its next
 * 30-minute `updatePeriodMillis` tick to show a timetable the user just refreshed would miss
 * the point of the feature. Writing and poking `AppWidgetManager` has to be one call.
 */
@CapacitorPlugin(name = "StundioWidget")
public class StundioWidgetPlugin extends Plugin {

    @PluginMethod
    public void publish(PluginCall call) {
        String payload = call.getString("payload");
        if (payload == null) {
            call.reject("payload is required");
            return;
        }

        try {
            WidgetPayload.store(getContext(), payload);
            WidgetRefresher.refreshAll(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not publish the widget payload: " + e.getMessage(), e);
        }
    }

    /** True when this bridge was booted by the widget's refresh button, not by the launcher. */
    @PluginMethod
    public void isSyncRequest(PluginCall call) {
        JSObject result = new JSObject();
        result.put("requested", getActivity() instanceof WidgetSyncActivity);
        call.resolve(result);
    }

    /** Closes the invisible refresh window; a no-op in the real app. */
    @PluginMethod
    public void finishSync(PluginCall call) {
        if (getActivity() instanceof WidgetSyncActivity) {
            getActivity().finish();
        }
        call.resolve();
    }
}
