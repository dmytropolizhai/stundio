package com.dmytropolizhai.stundio.widget;

import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

/**
 * The one freshness rule every widget shares: a cached {@link WidgetPayload} is only safe to
 * draw as-is while it still describes today (Riga-local — the app's one timezone rule) and, if
 * it carries a `minutesUntilChange` boundary, that boundary has not passed yet. None of the
 * widgets can re-derive the correct answer themselves (no network, no EduPage parsing), so a
 * stale payload is drawn as an honest "open the app" state instead of a lie.
 */
final class WidgetFreshness {

    private WidgetFreshness() {}

    static boolean isFresh(WidgetPayload payload) {
        if (payload.updatedAtMillis == null || !todayInRiga().equals(payload.date)) return false;
        if (payload.minutesUntilChange == null) return true;
        long boundaryMillis = payload.updatedAtMillis + TimeUnit.MINUTES.toMillis(payload.minutesUntilChange);
        return System.currentTimeMillis() < boundaryMillis;
    }

    private static String todayInRiga() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("Europe/Riga"));
        return format.format(new java.util.Date());
    }
}
