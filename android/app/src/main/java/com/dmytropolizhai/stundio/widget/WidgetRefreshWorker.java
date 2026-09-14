package com.dmytropolizhai.stundio.widget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * The WorkManager job body, for both the periodic safety net and the boundary one-shot
 * ({@link WidgetScheduler}). Deliberately thin: it only re-renders the tile from whatever is
 * already cached and reschedules the next boundary from that same payload. No network, no
 * EduPage parsing — see {@link NextLessonWidget#refresh(Context)}.
 */
public final class WidgetRefreshWorker extends Worker {

    public WidgetRefreshWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        WidgetRefresher.refreshAll(getApplicationContext());
        return Result.success();
    }
}
