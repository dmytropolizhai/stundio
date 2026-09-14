package com.dmytropolizhai.stundio.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.content.ContextCompat;
import com.dmytropolizhai.stundio.MainActivity;
import com.dmytropolizhai.stundio.R;
import java.util.concurrent.TimeUnit;

/**
 * The 2×1 "next lesson" tile (PLAN.md parallel track).
 *
 * It never touches the network and never computes anything about the *timetable*: it draws
 * whatever JS last wrote through `StundioWidgetPlugin`. If that is nothing, it says so. The one
 * thing it does compute locally is whether that cached payload is still trustworthy to show —
 * see {@link WidgetFreshness#isFresh}: a countdown frozen mid-way through a passed lesson
 * boundary is a lie, and this widget would rather admit it is behind than keep repeating one.
 *
 * Three things update it — the plugin's poke right after a sync, `updatePeriodMillis` in
 * `res/xml/next_lesson_widget_info.xml` (Android's own floor, ~30 min, a last-resort net), and
 * {@link WidgetScheduler}'s WorkManager jobs, which call {@link #refresh(Context)} on the same
 * seam via {@link WidgetRefresher}. Re-arming those jobs is `WidgetRefresher`'s job, not this
 * class's, since the schedule depends on the one shared payload, not on any single widget kind.
 */
public class NextLessonWidget extends AppWidgetProvider {

    /**
     * Re-renders every placed tile from the cached payload. Safe to call when no tile is
     * placed (the id array is simply empty). Called by {@link WidgetRefresher#refreshAll} and,
     * directly, by this provider's own lifecycle callbacks below.
     */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, NextLessonWidget.class));
        for (int id : ids) {
            manager.updateAppWidget(id, render(context));
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, render(context));
        }
        WidgetScheduler.scheduleAll(context);
    }

    /** The first tile is placed: start the background refresh jobs. */
    @Override
    public void onEnabled(Context context) {
        WidgetScheduler.scheduleAll(context);
    }

    /** The last tile was removed: nothing left to redraw, so nothing should keep waking up. */
    @Override
    public void onDisabled(Context context) {
        WidgetScheduler.cancelAll(context);
    }

    private static RemoteViews render(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_next_lesson);
        WidgetPayload payload = WidgetPayload.load(context);

        if (payload == null) {
            // No publish has happened yet — a fresh install, or cleared app data.
            views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_empty_title));
            views.setViewVisibility(R.id.widget_label, View.GONE);
            views.setViewVisibility(R.id.widget_subtitle, View.GONE);
            views.setViewVisibility(R.id.widget_countdown, View.GONE);
        } else if (WidgetFreshness.isFresh(payload)) {
            views.setTextViewText(R.id.widget_title, payload.title);
            setOrHide(views, R.id.widget_label, payload.label);
            setOrHide(views, R.id.widget_subtitle, payload.subtitle);
            setOrHide(views, R.id.widget_countdown, payload.countdown);
        } else {
            // The cached payload is provably out of date (wrong school day, or its own
            // `minutesUntilChange` boundary has already passed) and this job cannot re-derive
            // the correct one — no network, no EduPage parsing. Say so honestly instead of
            // repeating a countdown or a lesson name that no longer holds.
            views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_empty_title));
            views.setViewVisibility(R.id.widget_label, View.GONE);
            views.setViewVisibility(R.id.widget_countdown, View.GONE);
            setOrHide(views, R.id.widget_subtitle, staleSubtitle(context, payload));
        }

        int accent = payload == null || !WidgetFreshness.isFresh(payload) || payload.accent == null
            ? ContextCompat.getColor(context, R.color.widget_accent)
            : payload.accent;
        views.setInt(R.id.widget_accent, "setColorFilter", accent);

        views.setOnClickPendingIntent(R.id.widget_root, openApp(context));
        return views;
    }

    /** "Atjaunināts pirms 5 min" — the real `updatedAt`, never a blank line or a stale claim. */
    private static String staleSubtitle(Context context, WidgetPayload payload) {
        if (payload.updatedAtMillis == null) return "";
        long minutes = Math.max(0, TimeUnit.MILLISECONDS.toMinutes(
            System.currentTimeMillis() - payload.updatedAtMillis
        ));
        String ago;
        if (minutes < 60) {
            ago = context.getString(R.string.widget_updated_minutes, minutes);
        } else if (minutes < TimeUnit.DAYS.toMinutes(1)) {
            ago = context.getString(R.string.widget_updated_hours, minutes / 60);
        } else {
            ago = context.getString(R.string.widget_updated_days, minutes / TimeUnit.DAYS.toMinutes(1));
        }
        return context.getString(R.string.widget_updated_prefix, ago);
    }

    /** An empty string means "this line has nothing to say", not "draw an empty row". */
    private static void setOrHide(RemoteViews views, int viewId, String text) {
        if (text == null || text.isEmpty()) {
            views.setViewVisibility(viewId, View.GONE);
        } else {
            views.setViewVisibility(viewId, View.VISIBLE);
            views.setTextViewText(viewId, text);
        }
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        // Immutable: the launcher must not be able to rewrite where this tap goes.
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
