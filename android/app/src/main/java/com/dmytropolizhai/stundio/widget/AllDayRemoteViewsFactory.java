package com.dmytropolizhai.stundio.widget;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService.RemoteViewsFactory;
import androidx.core.content.ContextCompat;
import com.dmytropolizhai.stundio.R;
import java.util.ArrayList;
import java.util.List;

/**
 * Renders one row per {@link WidgetPayload.DayEntry} — the same already-rendered strings
 * {@link AllDayWidget} would otherwise have to draw itself, so no schedule logic lives here
 * either. The launcher calls {@link #onDataSetChanged()} before every redraw, which is where
 * the payload is (re)loaded, so a stale list held across syncs is not possible.
 */
final class AllDayRemoteViewsFactory implements RemoteViewsFactory {

    /** A lesson that has already ended is dimmed, not hidden — the whole point of "all day". */
    private static final float PAST_ALPHA = 0.45f;
    private static final float CURRENT_ALPHA = 1f;

    private final Context context;
    private List<WidgetPayload.DayEntry> entries = new ArrayList<>();

    AllDayRemoteViewsFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        WidgetPayload payload = WidgetPayload.load(context);
        entries = payload != null && WidgetFreshness.isFresh(payload) ? payload.today : new ArrayList<>();
    }

    @Override
    public void onDestroy() {
        entries = new ArrayList<>();
    }

    @Override
    public int getCount() {
        return entries.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_day_entry);
        WidgetPayload.DayEntry entry = entries.get(position);

        row.setTextViewText(R.id.day_entry_time, entry.time);
        row.setTextViewText(R.id.day_entry_title, entry.title);
        if (entry.subtitle == null || entry.subtitle.isEmpty()) {
            row.setViewVisibility(R.id.day_entry_subtitle, View.GONE);
        } else {
            row.setViewVisibility(R.id.day_entry_subtitle, View.VISIBLE);
            row.setTextViewText(R.id.day_entry_subtitle, entry.subtitle);
        }

        int accent = entry.accent != null
            ? entry.accent
            : ContextCompat.getColor(context, R.color.widget_accent);
        row.setInt(R.id.day_entry_rail, "setColorFilter", accent);
        row.setFloat(R.id.day_entry_root, "setAlpha", "done".equals(entry.state) ? PAST_ALPHA : CURRENT_ALPHA);

        // A row cannot carry its own PendingIntent — this fill-in combines with the ListView's
        // PendingIntentTemplate (AllDayWidget#render) so a tap on any row opens the app.
        row.setOnClickFillInIntent(R.id.day_entry_root, new Intent());
        return row;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
