package com.dmytropolizhai.stundio.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.dmytropolizhai.stundio.MainActivity;
import com.dmytropolizhai.stundio.R;

/**
 * The 4×2 "rest of today" tile (PLAN.md's fast-follow) — every timed lesson today in one
 * scrollable list. The rows themselves are drawn by {@link AllDayWidgetService}'s
 * `RemoteViewsFactory` ({@link AllDayRemoteViewsFactory}), which reads the same
 * {@link WidgetPayload} as the other two widgets; this class only owns the frame around it
 * (empty state, freshness, open-app taps) and tells the list adapter when to reload.
 */
public class AllDayWidget extends AppWidgetProvider {

    /** Re-renders every placed tile and its list from the cached payload. Safe when none is placed. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AllDayWidget.class));
        for (int id : ids) {
            manager.updateAppWidget(id, render(context, id));
        }
        if (ids.length > 0) manager.notifyAppWidgetViewDataChanged(ids, R.id.all_day_list);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, render(context, id));
        }
        manager.notifyAppWidgetViewDataChanged(ids, R.id.all_day_list);
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

    private static RemoteViews render(Context context, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_all_day);
        WidgetPayload payload = WidgetPayload.load(context);
        boolean fresh = payload != null && WidgetFreshness.isFresh(payload);

        // The adapter Intent must be unique per widget instance, or every instance shares one
        // RemoteViewsFactory — the standard AppWidgetManager.EXTRA_APPWIDGET_ID + data() dance.
        Intent serviceIntent = new Intent(context, AllDayWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.all_day_list, serviceIntent);
        views.setEmptyView(R.id.all_day_list, R.id.all_day_empty);
        views.setTextViewText(
            R.id.all_day_empty,
            context.getString(fresh ? R.string.widget_all_day_done : R.string.widget_empty_title)
        );

        PendingIntent openApp = openApp(context);
        views.setOnClickPendingIntent(R.id.all_day_root, openApp);
        // Rows can only carry a "fill-in" intent, not their own PendingIntent — this template
        // is what makes a tap on any row open the app, same as a tap on the frame around it.
        views.setPendingIntentTemplate(R.id.all_day_list, openApp);

        return views;
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
