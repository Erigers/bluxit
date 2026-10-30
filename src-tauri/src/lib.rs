use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const POINTER_FILE: &str = "wallet-path.txt";

fn pointer_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(POINTER_FILE))
}

fn read_pointer(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    let pointer = pointer_path(app)?;
    if !pointer.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&pointer).map_err(|e| e.to_string())?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        Ok(None)
    } else {
        Ok(Some(PathBuf::from(trimmed)))
    }
}

fn write_pointer(app: &AppHandle, path: &Path) -> Result<(), String> {
    let pointer = pointer_path(app)?;
    if let Some(parent) = pointer.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(pointer, path.to_string_lossy().as_bytes()).map_err(|e| e.to_string())
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn default_wallet_path(app: AppHandle) -> Result<String, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("bluxit").join("bluxit.json").to_string_lossy().into_owned())
}

#[tauri::command]
fn get_wallet_path(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_pointer(&app)?.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn set_wallet_path(app: AppHandle, path: String) -> Result<(), String> {
    let dest = PathBuf::from(path.trim());
    if dest.as_os_str().is_empty() {
        return Err("Choose a file location.".into());
    }
    ensure_parent(&dest)?;
    if !dest.exists() {
        fs::write(&dest, "{}").map_err(|e| e.to_string())?;
    }
    write_pointer(&app, &dest)
}

#[tauri::command]
fn read_wallet(app: AppHandle) -> Result<Option<String>, String> {
    let Some(path) = read_pointer(&app)? else {
        return Ok(None);
    };
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_wallet(app: AppHandle, contents: String) -> Result<(), String> {
    let Some(path) = read_pointer(&app)? else {
        return Err("No wallet location chosen.".into());
    };
    ensure_parent(&path)?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, contents).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn move_wallet(app: AppHandle, next_path: String) -> Result<(), String> {
    let dest = PathBuf::from(next_path.trim());
    if dest.as_os_str().is_empty() {
        return Err("Choose a file location.".into());
    }
    ensure_parent(&dest)?;
    if let Some(current) = read_pointer(&app)? {
        if current != dest && current.exists() {
            fs::copy(&current, &dest).map_err(|e| e.to_string())?;
        }
    } else if !dest.exists() {
        fs::write(&dest, "{}").map_err(|e| e.to_string())?;
    }
    write_pointer(&app, &dest)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            default_wallet_path,
            get_wallet_path,
            set_wallet_path,
            read_wallet,
            write_wallet,
            move_wallet
        ])
        .run(tauri::generate_context!())
        .expect("error while running bluxit");
}
