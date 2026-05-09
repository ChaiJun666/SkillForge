use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    time::Instant,
};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;
use zip::{write::SimpleFileOptions, ZipWriter};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    id: String,
    name: String,
    description: String,
    version: String,
    compatibility: Vec<String>,
    tags: Vec<String>,
    path: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillFile {
    path: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillExecution {
    id: String,
    skill_id: String,
    input: String,
    output: String,
    logs: Vec<String>,
    duration: u128,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    severity: String,
    message: String,
    path: String,
    field: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSkillRequest {
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSkillFileRequest {
    root: String,
    path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSkillScriptRequest {
    root: String,
    script_path: String,
    skill_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSkillRequest {
    root: String,
    output_path: String,
}

#[tauri::command]
fn list_skills(app: AppHandle) -> Result<Vec<Skill>, String> {
    let workspace = workspace_root(&app)?;
    fs::create_dir_all(&workspace).map_err(to_message)?;

    let mut skills = Vec::new();
    for entry in fs::read_dir(workspace).map_err(to_message)? {
        let entry = entry.map_err(to_message)?;
        let path = entry.path();
        if path.join("SKILL.md").is_file() {
            let content = fs::read_to_string(path.join("SKILL.md")).map_err(to_message)?;
            skills.push(skill_from_document(&path, &content));
        }
    }

    Ok(skills)
}

#[tauri::command]
fn create_skill(app: AppHandle, request: CreateSkillRequest) -> Result<Vec<SkillFile>, String> {
    let safe_name = slugify(&request.name);
    let root = workspace_root(&app)?.join(&safe_name);
    fs::create_dir_all(&root).map_err(to_message)?;

    let content = format!(
        "---\nname: {}\ndescription: Describe when this skill should be used.\nversion: 0.1.0\ncompatibility:\n  - codex\ntags:\n  - draft\n---\n\n# {}\n\nUse this skill when the user needs a focused, repeatable agent workflow.\n",
        request.name.trim(),
        request.name.trim()
    );
    fs::write(root.join("SKILL.md"), content).map_err(to_message)?;
    read_skill_directory(root.to_string_lossy().to_string())
}

#[tauri::command]
fn open_skill(root: String) -> Result<Vec<SkillFile>, String> {
    read_skill_directory(root)
}

#[tauri::command]
fn read_skill_file(root: String, path: String) -> Result<String, String> {
    let full_path = safe_join(&root, &path)?;
    fs::read_to_string(full_path).map_err(to_message)
}

#[tauri::command]
fn save_skill_file(request: SaveSkillFileRequest) -> Result<(), String> {
    let full_path = safe_join(&request.root, &request.path)?;
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(to_message)?;
    }
    fs::write(full_path, request.content).map_err(to_message)
}

#[tauri::command]
fn validate_skill(root: String) -> Result<Vec<ValidationIssue>, String> {
    let skill_path = safe_join(&root, "SKILL.md")?;
    let content = fs::read_to_string(skill_path).map_err(to_message)?;
    Ok(validate_document(&content))
}

#[tauri::command]
fn run_skill_script(request: RunSkillScriptRequest) -> Result<SkillExecution, String> {
    let script_path = safe_join(&request.root, &request.script_path)?;
    let started = Instant::now();
    let output = command_for_script(&script_path)
        .output()
        .map_err(|error| format!("Failed to run script: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let mut logs = vec![format!("$ {}", request.script_path)];
    if !stdout.trim().is_empty() {
        logs.push(stdout.trim_end().to_string());
    }
    if !stderr.trim().is_empty() {
        logs.push(stderr.trim_end().to_string());
    }

    Ok(SkillExecution {
        id: format!("{}", started.elapsed().as_nanos()),
        skill_id: request.skill_id,
        input: request.script_path,
        output: format!("{stdout}{stderr}"),
        logs,
        duration: started.elapsed().as_millis(),
        status: if output.status.success() { "success" } else { "failed" }.to_string(),
    })
}

#[tauri::command]
fn export_skill(request: ExportSkillRequest) -> Result<String, String> {
    let root = PathBuf::from(&request.root);
    let output_path = PathBuf::from(&request.output_path);
    if !root.join("SKILL.md").is_file() {
        return Err("SKILL.md is required before export.".to_string());
    }

    let file = fs::File::create(&output_path).map_err(to_message)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default();

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            let relative = path.strip_prefix(&root).map_err(to_message)?;
            let name = relative.to_string_lossy().replace('\\', "/");
            zip.start_file(name, options).map_err(to_message)?;
            let mut source = fs::File::open(path).map_err(to_message)?;
            let mut buffer = Vec::new();
            source.read_to_end(&mut buffer).map_err(to_message)?;
            zip.write_all(&buffer).map_err(to_message)?;
        }
    }

    zip.finish().map_err(to_message)?;
    Ok(output_path.to_string_lossy().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_skills,
            create_skill,
            open_skill,
            read_skill_file,
            save_skill_file,
            validate_skill,
            run_skill_script,
            export_skill
        ])
        .run(tauri::generate_context!())
        .expect("error while running SkillForge");
}

fn workspace_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("skills"))
        .map_err(to_message)
}

fn read_skill_directory(root: String) -> Result<Vec<SkillFile>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.join("SKILL.md").is_file() {
        return Err("Selected directory does not contain SKILL.md.".to_string());
    }

    let mut files = Vec::new();
    for entry in WalkDir::new(&root_path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            let relative = path.strip_prefix(&root_path).map_err(to_message)?;
            let normalized = relative.to_string_lossy().replace('\\', "/");
            if is_standard_skill_file(&normalized) {
                files.push(SkillFile {
                    path: normalized,
                    content: fs::read_to_string(path).map_err(to_message)?,
                });
            }
        }
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(files)
}

fn safe_join(root: &str, relative: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root).canonicalize().map_err(to_message)?;
    let full_path = root.join(relative);
    let parent = full_path.parent().unwrap_or(&root);
    let canonical_parent = parent.canonicalize().unwrap_or_else(|_| parent.to_path_buf());

    if !canonical_parent.starts_with(&root) {
        return Err("Path escapes the Skill workspace.".to_string());
    }

    Ok(full_path)
}

fn command_for_script(path: &Path) -> Command {
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    let mut command = match extension {
        "py" => Command::new("python"),
        "js" => Command::new("node"),
        "ts" => {
            let mut cmd = Command::new("npx");
            cmd.arg("tsx");
            cmd
        }
        _ if cfg!(windows) => {
            let mut cmd = Command::new("cmd");
            cmd.arg("/C");
            cmd
        }
        _ => Command::new("sh"),
    };

    command.arg(path);
    command
}

fn validate_document(content: &str) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    if !content.trim_start().starts_with("---") {
        issues.push(issue("error", "SKILL.md must start with YAML frontmatter.", "frontmatter"));
    }
    if !content.contains("name:") {
        issues.push(issue("error", "Skill name is required.", "name"));
    }
    if !content.contains("description:") {
        issues.push(issue("warning", "Description helps users understand activation.", "description"));
    }
    if content.split("---").last().unwrap_or_default().trim().len() < 30 {
        issues.push(ValidationIssue {
            severity: "error".to_string(),
            message: "Prompt body is too short to guide an agent reliably.".to_string(),
            path: "SKILL.md".to_string(),
            field: None,
        });
    }
    issues
}

fn issue(severity: &str, message: &str, field: &str) -> ValidationIssue {
    ValidationIssue {
        severity: severity.to_string(),
        message: message.to_string(),
        path: "SKILL.md".to_string(),
        field: Some(field.to_string()),
    }
}

fn skill_from_document(path: &Path, content: &str) -> Skill {
    let name = frontmatter_value(content, "name").unwrap_or_else(|| "untitled-skill".to_string());
    let description = frontmatter_value(content, "description").unwrap_or_default();
    let version = frontmatter_value(content, "version").unwrap_or_default();

    Skill {
        id: slugify(&name),
        name,
        description,
        version,
        compatibility: Vec::new(),
        tags: Vec::new(),
        path: path.to_string_lossy().to_string(),
        created_at: String::new(),
        updated_at: String::new(),
    }
}

fn frontmatter_value(content: &str, key: &str) -> Option<String> {
    content.lines().find_map(|line| {
        let (found, value) = line.split_once(':')?;
        (found.trim() == key).then(|| value.trim().trim_matches('"').to_string())
    })
}

fn is_standard_skill_file(path: &str) -> bool {
    path == "SKILL.md"
        || path.starts_with("scripts/")
        || path.starts_with("references/")
        || path.starts_with("assets/")
        || path.starts_with("tests/")
}

fn slugify(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() { character } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn to_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}
