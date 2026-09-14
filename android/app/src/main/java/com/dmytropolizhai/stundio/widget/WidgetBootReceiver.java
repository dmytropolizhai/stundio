package com.dmytropolizhai.stundio.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * `BOOT_COMPLETED` clears every WorkManager job Android had scheduled (and battery-optimisation
 * resets can behave the same way on some OEM skins), so the widget's refresh jobs need to be
 * re-armed on boot rather than assumed to survive it.
 *
 * Also handles `MY_PACKAGE_REPLACED`: an app update reinstalls the package, which can drop
 * previously-scheduled work the same way a reboot does.
 *
 * {@link WidgetScheduler#scheduleAll(Context)} is itself a no-op when no tile is placed, so this
 * receiver does not need its own "is the widget actually on the home screen" check.
 */
public final class WidgetBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetScheduler.scheduleAll(context);
    }
}
