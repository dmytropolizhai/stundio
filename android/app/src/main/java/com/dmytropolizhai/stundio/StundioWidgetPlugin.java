package com.dmytropolizhai.stundio;

import com.dmytropolizhai.stundio.widget.NextLessonWidget;
import com.dmytropolizhai.stundio.widget.WidgetPayload;
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
            NextLessonWidget.refresh(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not publish the widget payload: " + e.getMessage(), e);
        }
    }
}
