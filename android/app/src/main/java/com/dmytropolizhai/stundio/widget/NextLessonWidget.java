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

/**
 * The 2×1 "next lesson" tile (PLAN.md parallel track).
 *
 * It never touches the network and never computes anything about the timetable: it draws
 * whatever JS last wrote through `StundioWidgetPlugin`. If that is nothing, it says so.
 *
 * Two things update it — the plugin's poke right after a sync, and `updatePeriodMillis` in
 * `res/xml/next_lesson_widget_info.xml`. A background scheduler (WorkManager/AlarmManager) is
 * deliberately NOT wired here; when one arrives it should call {@link #refresh(Context)} and
 * nothing else.
 */
public class NextLessonWidget extends AppWidgetProvider {

    /**
     * Re-renders every placed tile from the cached payload. The single entry point for anything
     * outside this class — the plugin after a sync, and whatever background scheduler is added
     * later. Safe to call when no widget is placed (the id array is simply empty).
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
        } else {
            views.setTextViewText(R.id.widget_title, payload.title);
            setOrHide(views, R.id.widget_label, payload.label);
            setOrHide(views, R.id.widget_subtitle, payload.subtitle);
            setOrHide(views, R.id.widget_countdown, payload.countdown);
        }

        int accent = payload == null || payload.accent == null
            ? ContextCompat.getColor(context, R.color.widget_accent)
            : payload.accent;
        views.setInt(R.id.widget_accent, "setColorFilter", accent);

        views.setOnClickPendingIntent(R.id.widget_root, openApp(context));
        return views;
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
