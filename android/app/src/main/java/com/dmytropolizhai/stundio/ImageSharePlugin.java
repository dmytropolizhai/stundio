package com.dmytropolizhai.stundio;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

/**
 * Backs `src/lib/share/native.ts` — puts a timetable image into Android's share sheet.
 *
 * A WebView has no `navigator.share`, and `ACTION_SEND` needs a real file behind a
 * `content://` URI, so the PNG crosses the bridge as base64 and is written into the app's
 * cache dir. The same `FileProvider` the update installer uses exposes it (`file_paths.xml`
 * already maps the cache dir), and `FLAG_GRANT_READ_URI_PERMISSION` is what lets the app the
 * user picks read it — no storage permission is involved, and nothing is uploaded anywhere.
 *
 * Old cards are deleted on every share: the share directory is a hand-off, not a gallery.
 */
@CapacitorPlugin(name = "ImageShare")
public class ImageSharePlugin extends Plugin {

    private static final String SHARE_DIR = "shared-images";

    @PluginMethod
    public void share(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null) {
            call.reject("base64 is required");
            return;
        }

        String fileName = call.getString("fileName", "stundio.png");
        String title = call.getString("title", "");
        String text = call.getString("text", "");

        try {
            File directory = new File(getContext().getCacheDir(), SHARE_DIR);
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Could not create the share directory");
                return;
            }
            clear(directory);

            File file = new File(directory, sanitize(fileName));
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            try (FileOutputStream output = new FileOutputStream(file)) {
                output.write(bytes);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/png");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            // Messengers send the image, mail clients keep the line with the download link.
            send.putExtra(Intent.EXTRA_TEXT, text);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);

            call.resolve();
        } catch (Exception e) {
            call.reject("Share failed: " + e.getMessage(), e);
        }
    }

    /** Keeps a caller-supplied name from escaping the share directory. */
    private String sanitize(String fileName) {
        String name = new File(fileName).getName();
        return name.isEmpty() ? "stundio.png" : name;
    }

    private void clear(File directory) {
        File[] files = directory.listFiles();
        if (files == null) return;
        for (File file : files) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
    }
}
