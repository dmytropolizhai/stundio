package com.dmytropolizhai.stundio.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import org.json.JSONObject;

/**
 * The JS → widget payload, stored and read back.
 *
 * Deliberately anaemic: it holds already-rendered strings and does no schedule maths. Which
 * lesson is "current", how many minutes are left, how that reads in Latvian — all of it is
 * decided once, in `src/lib/schedule/` + `src/lib/widget/payload.ts`, and arrives here as
 * finished text. Anything computed on this side would be a second, drifting implementation.
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

    private WidgetPayload(String label, String title, String subtitle, String countdown, Integer accent) {
        this.label = label;
        this.title = title;
        this.subtitle = subtitle;
        this.countdown = countdown;
        this.accent = accent;
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
                parseColor(object.optString("accent", ""))
            );
        } catch (Exception e) {
            // A half-written or future-shaped blob must not crash the launcher's host process.
            return null;
        }
    }

    private static Integer parseColor(String hex) {
        if (hex == null || hex.length() != 7 || hex.charAt(0) != '#') return null;
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
