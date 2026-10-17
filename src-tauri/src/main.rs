//! The Linux shell embeds the existing offline app and supplies narrowly scoped OS ports.
//! Remote pages always open in the browser and never inherit the application's IPC access.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicU64, Ordering};

use tauri::{webview::NewWindowResponse, Manager, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// The portal replaces a notification that reuses an id, so every one gets its own
/// (the process id keeps a relaunch from reusing the last run's).
static NEXT_NOTIFICATION_ID: AtomicU64 = AtomicU64::new(0);

/// The live map the Transit tab embeds (the CSP's `frame-src`). WebKitGTK runs the
/// navigation handler for subframes too, so it has to be let through here as well.
const EMBEDDED_ORIGIN: &str = "https://saraksti.lv";

const APP_ID: &str = "io.github.dmytropolizhai.stundio";

/// The notification portal, so Flatpak needs no notification-service permission. Not every
/// desktop's portal backend implements it (Hyprland's and wlroots' do not), so a failure
/// falls back to the notification daemon itself.
#[tauri::command]
async fn notify_desktop(
    window: tauri::WebviewWindow,
    title: String,
    body: String,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("notifications are only available to the main window".into());
    }
    let id = format!(
        "schedule-{}-{}",
        std::process::id(),
        NEXT_NOTIFICATION_ID.fetch_add(1, Ordering::Relaxed)
    );
    match notify_portal(&id, &title, &body).await {
        Ok(()) => Ok(()),
        Err(portal) => notify_daemon(&title, &body)
            .await
            .map_err(|daemon| format!("portal: {portal}; daemon: {daemon}")),
    }
}

async fn notify_portal(id: &str, title: &str, body: &str) -> Result<(), String> {
    use ashpd::desktop::notification::{Notification, NotificationProxy};
    let proxy = NotificationProxy::new()
        .await
        .map_err(|error| error.to_string())?;
    proxy
        .add_notification(id, Notification::new(title).body(body))
        .await
        .map_err(|error| error.to_string())
}

/// `org.freedesktop.Notifications.Notify` — mako, dunst, swaync and every desktop's own daemon.
async fn notify_daemon(title: &str, body: &str) -> Result<(), String> {
    use ashpd::{zbus, zvariant};
    let connection = zbus::Connection::session()
        .await
        .map_err(|error| error.to_string())?;
    let actions: &[&str] = &[];
    let hints = std::collections::HashMap::<&str, zvariant::Value>::new();
    connection
        .call_method(
            Some("org.freedesktop.Notifications"),
            "/org/freedesktop/Notifications",
            Some("org.freedesktop.Notifications"),
            "Notify",
            &(APP_ID, 0u32, APP_ID, title, body, actions, hints, -1i32),
        )
        .await
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// WebKitGTK's DMA-BUF renderer draws a blank or flickering window on NVIDIA under Wayland
/// (Hyprland, Sway, GNOME and KDE alike). Opt out there unless the user chose otherwise.
fn work_around_nvidia_wayland() {
    let wayland = std::env::var_os("WAYLAND_DISPLAY").is_some();
    let nvidia = std::path::Path::new("/proc/driver/nvidia/version").exists();
    if wayland && nvidia && std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // Still single-threaded: nothing else can be reading the environment yet.
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

fn main() {
    work_around_nvidia_wayland();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![notify_desktop])
        .setup(|app| {
            let navigation_app = app.handle().clone();
            let popup_app = app.handle().clone();
            WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                .on_navigation(move |url| {
                    if url.scheme() == "tauri"
                        || url.host_str() == Some("tauri.localhost")
                        || url.origin().ascii_serialization() == EMBEDDED_ORIGIN
                        || (cfg!(debug_assertions)
                            && url.origin().ascii_serialization() == "http://localhost:5173")
                    {
                        return true;
                    }
                    if matches!(url.scheme(), "https" | "http" | "mailto") {
                        let _ = navigation_app.opener().open_url(url.as_str(), None::<&str>);
                    }
                    false
                })
                .on_new_window(move |url, _| {
                    if matches!(url.scheme(), "https" | "http" | "mailto") {
                        let _ = popup_app.opener().open_url(url.as_str(), None::<&str>);
                    }
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("could not start Stundio");
}
