//! The Linux shell embeds the existing offline app and supplies narrowly scoped OS ports.
//! Remote pages always open in the browser and never inherit the application's IPC access.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{webview::NewWindowResponse, Manager, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Use the notification portal so Flatpak needs no direct notification-service permission.
#[tauri::command]
async fn notify_desktop(
    window: tauri::WebviewWindow,
    title: String,
    body: String,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("notifications are only available to the main window".into());
    }
    use ashpd::desktop::notification::{Notification, NotificationProxy};
    let proxy = NotificationProxy::new()
        .await
        .map_err(|error| error.to_string())?;
    proxy
        .add_notification("schedule", Notification::new(&title).body(body.as_str()))
        .await
        .map_err(|error| error.to_string())
}

fn main() {
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
