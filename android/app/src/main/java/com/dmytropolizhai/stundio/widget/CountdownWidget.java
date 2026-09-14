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
 * The standalone "time left" tile: one big countdown line and a progress bar, for a home
 * screen that already knows the subject from {@link NextLessonWidget} and just wants the
 * clock. Draws the same `payload.countdown`/`payload.label` strings JS already rendered — see
 * `src/lib/widget/payload.ts` — at a larger size, plus `payload.progressPercent` as a bar.
 * Shares {@link WidgetPayload} and {@link WidgetFreshness#isFresh} with the other widgets;
 * only the layout differs.
 */
public class CountdownWidget extends AppWidgetProvider {

    /** Re-renders every placed tile from the cached payload. Safe when none is placed. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, CountdownWidget.class));
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

    @Override
    public void onEnabled(Context context) {
        WidgetScheduler.scheduleAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetScheduler.cancelAll(context);
    }

    private static RemoteViews render(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_countdown);
        WidgetPayload payload = WidgetPayload.load(context);
        boolean fresh = payload != null && WidgetFreshness.isFresh(payload);

        if (!fresh) {
            views.setTextViewText(R.id.countdown_value, context.getString(R.string.widget_empty_title));
            views.setViewVisibility(R.id.countdown_label, View.GONE);
            views.setViewVisibility(R.id.countdown_title, View.GONE);
            views.setViewVisibility(R.id.countdown_progress, View.GONE);
        } else {
            // No countdown applies in "done" (nothing left today) — fall back to the title.
            String big = payload.countdown.isEmpty() ? payload.title : payload.countdown;
            views.setTextViewText(R.id.countdown_value, big);
            setOrHide(views, R.id.countdown_label, payload.label);
            setOrHide(views, R.id.countdown_title, payload.title);
            if (payload.progressPercent == null) {
                views.setViewVisibility(R.id.countdown_progress, View.GONE);
            } else {
                views.setViewVisibility(R.id.countdown_progress, View.VISIBLE);
                views.setProgressBar(R.id.countdown_progress, 100, payload.progressPercent, false);
            }
        }

        int accent = !fresh || payload.accent == null
            ? ContextCompat.getColor(context, R.color.widget_accent)
            : payload.accent;
        views.setInt(R.id.countdown_rail, "setColorFilter", accent);

        views.setOnClickPendingIntent(R.id.countdown_root, openApp(context));
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
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
