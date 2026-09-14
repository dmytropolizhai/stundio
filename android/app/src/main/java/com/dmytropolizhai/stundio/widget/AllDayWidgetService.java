package com.dmytropolizhai.stundio.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

/**
 * Hands {@link AllDayWidget}'s list to {@link AllDayRemoteViewsFactory} — required boilerplate
 * for any `ListView`-backed RemoteViews widget; the factory does all the actual work. Bound by
 * the system, never launched directly, hence `BIND_REMOTEVIEWS` in the manifest rather than the
 * `exported="true"` the `AppWidgetProvider` receivers need.
 */
public final class AllDayWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new AllDayRemoteViewsFactory(getApplicationContext());
    }
}
