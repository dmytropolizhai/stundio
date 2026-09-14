package com.dmytropolizhai.stundio.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/**
 * Owns the two WorkManager jobs that keep {@link NextLessonWidget} redrawn without a network
 * call: a 15-minute periodic job (WorkManager's own floor, and Android's Doze/App Standby will
 * still slip it further — it is a coarse safety net, not a clock) and a precise one-shot timed
 * to the payload's own `minutesUntilChange`, so a lesson boundary does not sit wrong for up to
 * 15 minutes waiting on the periodic tick.
 *
 * Neither job ever fetches or parses — both call {@link NextLessonWidget#refresh(Context)},
 * which only re-renders `WidgetPayload.load(context)`.
 *
 * Scheduling is a no-op, and any existing schedule is cancelled, whenever no tile is placed:
 * there is nothing to redraw, so nothing should be waking the device for this feature.
 */
final class WidgetScheduler {

    private static final String PERIODIC_WORK_NAME = "stundio-widget-periodic-refresh";
    private static final String BOUNDARY_WORK_NAME = "stundio-widget-boundary-refresh";

    /** Small cushion so the one-shot lands just after the bell, never a moment before it. */
    private static final long BOUNDARY_BUFFER_MILLIS = 30_000L;

    private WidgetScheduler() {}

    /**
     * Call after anything that could change what should be scheduled: a fresh publish, a
     * worker tick, boot, or a widget being placed. Cheap and idempotent — safe to call often.
     */
    static void scheduleAll(Context context) {
        if (!hasPlacedWidgets(context)) {
            cancelAll(context);
            return;
        }
        schedulePeriodic(context);
        scheduleBoundary(context);
    }

    static void cancelAll(Context context) {
        WorkManager manager = WorkManager.getInstance(context);
        manager.cancelUniqueWork(PERIODIC_WORK_NAME);
        manager.cancelUniqueWork(BOUNDARY_WORK_NAME);
    }

    private static boolean hasPlacedWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, NextLessonWidget.class)).length > 0
            || manager.getAppWidgetIds(new ComponentName(context, CountdownWidget.class)).length > 0
            || manager.getAppWidgetIds(new ComponentName(context, AllDayWidget.class)).length > 0;
    }

    private static void schedulePeriodic(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            WidgetRefreshWorker.class,
            PeriodicWorkRequest.MIN_PERIODIC_INTERVAL_MILLIS,
            TimeUnit.MILLISECONDS
        ).build();
        // KEEP: a periodic job already running should not be reset back to a fresh 15-minute
        // window every time scheduleAll runs (sync finishes far more often than that).
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(PERIODIC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /**
     * The exact moment the cached payload stops being true is `updatedAt + minutesUntilChange`,
     * not "minutesUntilChange from whenever this happens to run" — this method is called again
     * on every periodic tick and every JS publish, and re-deriving the delay from "now" each
     * time would keep pushing the target further into the future instead of converging on it.
     */
    private static void scheduleBoundary(Context context) {
        WorkManager manager = WorkManager.getInstance(context);
        WidgetPayload payload = WidgetPayload.load(context);
        if (payload == null || payload.minutesUntilChange == null || payload.updatedAtMillis == null) {
            manager.cancelUniqueWork(BOUNDARY_WORK_NAME);
            return;
        }

        long boundaryMillis = payload.updatedAtMillis + payload.minutesUntilChange * 60_000L;
        long delayMillis = boundaryMillis - System.currentTimeMillis() + BOUNDARY_BUFFER_MILLIS;
        if (delayMillis <= 0) {
            // The boundary already passed without a fresh JS publish — nothing to aim at until
            // one arrives. render() already stops asserting the stale countdown as true.
            manager.cancelUniqueWork(BOUNDARY_WORK_NAME);
            return;
        }

        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(WidgetRefreshWorker.class)
            .setInitialDelay(delayMillis, TimeUnit.MILLISECONDS)
            .build();
        manager.enqueueUniqueWork(BOUNDARY_WORK_NAME, ExistingWorkPolicy.REPLACE, request);
    }
}
