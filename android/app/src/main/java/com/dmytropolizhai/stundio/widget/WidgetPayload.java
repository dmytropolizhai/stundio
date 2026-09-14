package com.dmytropolizhai.stundio.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The JS → widget payload, stored and read back.
 *
 * Deliberately anaemic: it holds already-rendered strings and does no schedule maths. Which
 * lesson is "current", how many minutes are left, how that reads in Latvian — all of it is
 * decided once, in `src/lib/schedule/` + `src/lib/widget/payload.ts`, and arrives here as
 * finished text. Anything computed on this side would be a second, drifting implementation.
 *
 * `date` and `updatedAtMillis` are the one exception: {@link NextLessonWidget} needs them to
 * decide whether a cached payload is still trustworthy to show (WorkManager can only re-render
 * what is here, never re-fetch or re-derive it), and comparing two timestamps is calendar
 * arithmetic, not schedule logic — it never touches EduPage's data shape.
 *
 * `SharedPreferences` rather than a file because the widget process may read this long after
 * the WebView is gone, and the blob is a few hundred bytes.
 */
public final class WidgetPayload {

    private static final String PREFS = "stundio.widget";
    private static final String KEY_PAYLOAD = "payload";

    /** Written by JS on the very first publish; older shapes are ignored rather than guessed at. */
    private static final int SUPPORTED_VERSION = 1;

    public final String label;
    public final String title;
    public final String subtitle;
    public final String countdown;
    /** Parsed `#RRGGBB`, or null to use the widget's own accent. */
    public final Integer accent;
    /** The Riga-local `YYYY-MM-DD` this payload describes, verbatim from `WidgetPayload.date`. */
    public final String date;
    /** `updatedAt` parsed to epoch millis, or null if the ISO string could not be parsed. */
    public final Long updatedAtMillis;
    /** Whole minutes from `updatedAt` until this payload stops being true, or null. */
    public final Integer minutesUntilChange;
    /** 0–100 through the live lesson, for the countdown widget's progress bar. Null otherwise. */
    public final Integer progressPercent;
    /** Every timed lesson today, in schedule order. Never null — empty when there is none. */
    public final List<DayEntry> today;

    /** One row of {@link #today} — see `src/lib/widget/types.ts`'s `WidgetDayEntry`. */
    public static final class DayEntry {
        public final String time;
        public final String title;
        public final String subtitle;
        public final Integer accent;
        /** "done" | "live" | "upcoming". */
        public final String state;

        private DayEntry(String time, String title, String subtitle, Integer accent, String state) {
            this.time = time;
            this.title = title;
            this.subtitle = subtitle;
            this.accent = accent;
            this.state = state;
        }
    }

    private WidgetPayload(
        String label,
        String title,
        String subtitle,
        String countdown,
        Integer accent,
        String date,
        Long updatedAtMillis,
        Integer minutesUntilChange,
        Integer progressPercent,
        List<DayEntry> today
    ) {
        this.label = label;
        this.title = title;
        this.subtitle = subtitle;
        this.countdown = countdown;
        this.accent = accent;
        this.date = date;
        this.updatedAtMillis = updatedAtMillis;
        this.minutesUntilChange = minutesUntilChange;
        this.progressPercent = progressPercent;
        this.today = today;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void store(Context context, String json) {
        prefs(context).edit().putString(KEY_PAYLOAD, json).apply();
    }

    /**
     * The last payload JS wrote, or null when there is none yet or it cannot be read. A null
     * here is a real state the widget renders ("open Stundio"), not an error to swallow.
     */
    public static WidgetPayload load(Context context) {
        String json = prefs(context).getString(KEY_PAYLOAD, null);
        if (json == null) return null;
        try {
            JSONObject object = new JSONObject(json);
            if (object.optInt("version", 0) != SUPPORTED_VERSION) return null;
            return new WidgetPayload(
                object.optString("label", ""),
                object.optString("title", ""),
                object.optString("subtitle", ""),
                object.optString("countdown", ""),
                parseColor(object.optString("accent", "")),
                object.optString("date", ""),
                parseIsoInstant(object.optString("updatedAt", "")),
                object.isNull("minutesUntilChange") ? null : optIntOrNull(object, "minutesUntilChange"),
                object.isNull("progressPercent") ? null : optIntOrNull(object, "progressPercent"),
                parseToday(object.optJSONArray("today"))
            );
        } catch (Exception e) {
            // A half-written or future-shaped blob must not crash the launcher's host process.
            return null;
        }
    }

    private static Integer optIntOrNull(JSONObject object, String key) {
        return object.has(key) ? object.optInt(key) : null;
    }

    /** Missing or malformed rows are dropped rather than crashing the whole payload. */
    private static List<DayEntry> parseToday(JSONArray array) {
        List<DayEntry> entries = new ArrayList<>();
        if (array == null) return entries;
        for (int i = 0; i < array.length(); i += 1) {
            JSONObject row = array.optJSONObject(i);
            if (row == null) continue;
            entries.add(new DayEntry(
                row.optString("time", ""),
                row.optString("title", ""),
                row.optString("subtitle", ""),
                parseColor(row.optString("accent", "")),
                row.optString("state", "upcoming")
            ));
        }
        return entries;
    }

    private static Integer parseColor(String hex) {
        if (hex == null || hex.length() != 7 || hex.charAt(0) != '#') return null;
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * `updatedAt` is always `Date#toISOString()` output — fixed millisecond precision, "Z"
     * suffix — so a single strict pattern is enough; no need for `java.time` (unavailable
     * below API 26 without desugaring, and `minSdkVersion` here is 23).
     */
    private static Long parseIsoInstant(String iso) {
        if (iso == null || iso.isEmpty()) return null;
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        format.setLenient(false);
        try {
            return format.parse(iso).getTime();
        } catch (ParseException e) {
            return null;
        }
    }
}
