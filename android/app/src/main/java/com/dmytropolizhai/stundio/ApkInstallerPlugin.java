package com.dmytropolizhai.stundio;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Backs `src/lib/version/installer.ts` — downloads the release APK to the app's cache dir
 * and hands it to Android's package installer, so updating never leaves the app for a
 * browser or GitHub. `download` reports progress via a `downloadProgress` event since the
 * APK is a few MB and a silent wait reads as a hang; `install` is the one step that
 * necessarily leaves this app's process, because confirming an install is an OS-level gate
 * this plugin cannot and should not skip.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url is required");
            return;
        }
        new Thread(() -> downloadInBackground(call, url)).start();
    }

    private void downloadInBackground(PluginCall call, String url) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.connect();
            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                call.reject("Download failed: HTTP " + responseCode);
                return;
            }

            int total = connection.getContentLength();
            File file = new File(getContext().getCacheDir(), "update.apk");
            try (
                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(file)
            ) {
                byte[] buffer = new byte[8 * 1024];
                int downloaded = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                    downloaded += read;
                    if (total > 0) {
                        JSObject progress = new JSObject();
                        progress.put("percent", downloaded * 100 / total);
                        notifyListeners("downloadProgress", progress);
                    }
                }
            }

            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Download failed: " + e.getMessage(), e);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return;
        }

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !getContext().getPackageManager().canRequestPackageInstalls()
        ) {
            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
            settingsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(settingsIntent);
            call.reject("Enable \"install unknown apps\" for Stundio, then try again");
            return;
        }

        File file = new File(path);
        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            file
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(intent);
        call.resolve();
    }
}
