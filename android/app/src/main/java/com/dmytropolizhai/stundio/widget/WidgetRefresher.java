package com.dmytropolizhai.stundio.widget;

import android.content.Context;

/**
 * Re-renders every placed widget of every kind from the cached payload and re-arms the
 * background refresh jobs — the one entry point the plugin and both WorkManager jobs call, so
 * neither has to know which widget kinds exist. Each provider's own `refresh(Context)` stays
 * individually callable for its own lifecycle callbacks (`onUpdate`), which only ever touch
 * that provider's own tiles.
 */
public final class WidgetRefresher {

    private WidgetRefresher() {}

    public static void refreshAll(Context context) {
        NextLessonWidget.refresh(context);
        CountdownWidget.refresh(context);
        AllDayWidget.refresh(context);
        WidgetScheduler.scheduleAll(context);
    }
}
