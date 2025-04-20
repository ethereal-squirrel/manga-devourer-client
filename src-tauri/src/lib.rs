use serde_json;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use tauri_plugin_http::reqwest::Client;
use tauri_plugin_sql::{Migration, MigrationKind};
use zip::ZipArchive;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn download_file(
    url: &str,
    path: &str,
    token: Option<String>,
    mode: Option<String>,
    target: Option<String>,
) -> Result<(), String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let request = if mode.as_deref() == Some("dropbox") {
        let dropbox_arg = serde_json::json!({ "path": target.unwrap_or_default() }).to_string();
        let auth_token = token.unwrap_or_default();

        client
            .post(url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .header("Dropbox-API-Arg", dropbox_arg)
    } else {
        let mut request = client.get(url);
        if let Some(token_value) = token {
            request = request.header("Authorization", format!("Bearer {}", token_value));
        }
        request
    };

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Could not read error response".to_string());
        return Err(format!(
            "Failed to download file: HTTP {} - Response: {}",
            status, error_body
        ));
    }

    let mut file = File::create(path).map_err(|e| format!("File creation error: {}", e))?;
    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Reading response error: {}", e))?;
    file.write_all(&content)
        .map_err(|e| format!("File write error: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn unzip_file(path: &str, destination: &str) -> Result<(), String> {
    let mut archive =
        ZipArchive::new(File::open(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = Path::new(destination).join(file.name());

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = out_path.parent() {
                std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn zip_summary(
    file_name: &str,
    path: &str,
    unzip_path: &str,
) -> Result<(i32, Option<String>), String> {
    println!("file_name: {}", file_name);
    println!("path: {}", path);
    println!("unzip_path: {}", unzip_path);

    let mut archive =
        ZipArchive::new(File::open(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;

    let mut image_count = 0;
    let mut first_image: Option<String> = None;

    let mut image_names: Vec<String> = Vec::new();

    for i in 0..archive.len() {
        let file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_lowercase();

        if name.ends_with(".jpg")
            || name.ends_with(".jpeg")
            || name.ends_with(".png")
            || name.ends_with(".webp")
            || name.ends_with(".bmp")
        {
            image_count += 1;
            image_names.push(file.name().to_string());
        }
    }

    image_names.sort();

    if let Some(first_image_name) = image_names.first() {
        let mut file = archive
            .by_name(first_image_name)
            .map_err(|e| e.to_string())?;

        let extension = Path::new(first_image_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .ok_or_else(|| "Invalid file extension".to_string())?;

        let new_file_name = format!("{}.{}", file_name, extension);
        let out_path = Path::new(unzip_path).join(&new_file_name);

        if let Some(p) = out_path.parent() {
            std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
        }

        let mut outfile = File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

        first_image = Some(new_file_name);
    }

    Ok((image_count, first_image))
}

#[tauri::command]
async fn create_folder(path: &str) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn remove_folder(path: &str) -> Result<(), String> {
    std::fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE,
                    value TEXT
                );

                CREATE TABLE series (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    titleSafe TEXT,
                    path TEXT UNIQUE,
                    mangaData TEXT,
                    metadata TEXT
                );

                CREATE TABLE file (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT UNIQUE,
                    fileName TEXT,
                    fileFormat TEXT,
                    volume INTEGER,
                    chapter INTEGER,
                    totalPages INTEGER,
                    currentPage INTEGER,
                    isRead BOOLEAN,
                    seriesId INTEGER,
                    metadata TEXT,
                    FOREIGN KEY(seriesId) REFERENCES series(id)
                );"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_cover_image_to_file",
            sql: r#"
            ALTER TABLE file
            ADD COLUMN coverImage TEXT DEFAULT NULL;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_cover_image_to_series",
            sql: r#"
            ALTER TABLE series
            ADD COLUMN coverImage TEXT DEFAULT NULL;
        "#,
            kind: MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:library.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            download_file,
            unzip_file,
            create_folder,
            remove_folder,
            zip_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
