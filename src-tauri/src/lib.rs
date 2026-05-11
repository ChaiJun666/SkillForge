use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    process::{Child, ChildStderr, ChildStdout, Command, Stdio},
    thread,
    thread::JoinHandle,
    time::{Duration, Instant},
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
    stdout: String,
    stderr: String,
    output: String,
    logs: Vec<String>,
    duration: u128,
    status: String,
    timed_out: bool,
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedSkillWorkspace {
    root: String,
    files: Vec<SkillFile>,
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
fn create_skill(app: AppHandle, request: CreateSkillRequest) -> Result<CreatedSkillWorkspace, String> {
    let safe_name = slugify(&request.name);
    let root = workspace_root(&app)?.join(&safe_name);
    fs::create_dir_all(&root).map_err(to_message)?;
    let root = root.to_string_lossy().to_string();

    let content = format!(
        "---\nname: {}\ndescription: Describe when this skill should be used.\nversion: 0.1.0\ncompatibility:\n  - codex\ntags:\n  - draft\n---\n\n# {}\n\nUse this skill when the user needs a focused, repeatable agent workflow.\n",
        request.name.trim(),
        request.name.trim()
    );
    fs::write(PathBuf::from(&root).join("SKILL.md"), content).map_err(to_message)?;
    let files = read_skill_directory(root.clone())?;

    Ok(CreatedSkillWorkspace { root, files })
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
    let root_path = PathBuf::from(&root).canonicalize().map_err(to_message)?;
    let skill_path = safe_join(&root, "SKILL.md")?;
    let mut issues = if skill_path.is_file() {
        let content = fs::read_to_string(skill_path).map_err(to_message)?;
        validate_document(&content)
    } else {
        vec![issue("error", "SKILL.md is required.", "SKILL.md", Some("file"))]
    };

    for entry in WalkDir::new(&root_path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let relative = path.strip_prefix(&root_path).map_err(to_message)?;
        let normalized = relative.to_string_lossy().replace('\\', "/");
        if normalized.starts_with("scripts/") && !has_allowed_script_extension(&normalized) {
            issues.push(issue(
                "error",
                "Scripts must use .js or .py extensions.",
                &normalized,
                Some("extension"),
            ));
        }

        if !is_standard_skill_file(&normalized) {
            issues.push(issue(
                "info",
                "File is outside managed Skill paths and will not be loaded for editing.",
                &normalized,
                Some("file"),
            ));
        }
    }

    Ok(issues)
}

#[tauri::command]
fn run_skill_script(request: RunSkillScriptRequest) -> Result<SkillExecution, String> {
    let root = PathBuf::from(&request.root).canonicalize().map_err(to_message)?;
    let script_path = safe_join(&request.root, &request.script_path)?;
    if !is_allowed_script(&script_path, &root) {
        return Err("Scripts can only run from scripts/ with .js or .py extension.".to_string());
    }

    let started = Instant::now();
    let mut command = command_for_script(&script_path);
    command.current_dir(&root);
    let output = run_command_with_timeout(command, Duration::from_millis(10_000))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let mut logs = vec![format!("$ {}", request.script_path)];
    if output.timed_out {
        logs.push("Process timed out after 10000ms.".to_string());
    }
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
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        output: format!("{stdout}{stderr}"),
        logs,
        duration: started.elapsed().as_millis(),
        status: if !output.timed_out && output.success { "success" } else { "failed" }.to_string(),
        timed_out: output.timed_out,
    })
}

#[tauri::command]
fn export_skill(request: ExportSkillRequest) -> Result<String, String> {
    let validation_issues = validate_skill(request.root.clone())?;
    if let Some(issue) = validation_issues.iter().find(|issue| issue.severity == "error") {
        return Err(issue.message.clone());
    }

    let root = PathBuf::from(&request.root).canonicalize().map_err(to_message)?;
    let output_path = PathBuf::from(&request.output_path);

    let file = fs::File::create(&output_path).map_err(to_message)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default();
    let output_path_for_skip = output_path.canonicalize().unwrap_or_else(|_| output_path.clone());

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }

        let candidate = path.canonicalize().map_err(to_message)?;
        if !candidate.starts_with(&root) {
            continue;
        }

        if should_skip_export_file(&candidate, &root, &output_path_for_skip)? {
            continue;
        }

        let relative = candidate.strip_prefix(&root).map_err(to_message)?;
        let name = relative.to_string_lossy().replace('\\', "/");
        zip.start_file(name, options).map_err(to_message)?;
        let mut source = fs::File::open(candidate).map_err(to_message)?;
        let mut buffer = Vec::new();
        source.read_to_end(&mut buffer).map_err(to_message)?;
        zip.write_all(&buffer).map_err(to_message)?;
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
    let root_path = PathBuf::from(&root).canonicalize().map_err(to_message)?;
    let mut files = Vec::new();
    for entry in WalkDir::new(&root_path).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }

        let candidate = path.canonicalize().map_err(to_message)?;
        if !candidate.starts_with(&root_path) {
            continue;
        }

        let relative = candidate.strip_prefix(&root_path).map_err(to_message)?;
        let normalized = relative.to_string_lossy().replace('\\', "/");
        if is_standard_skill_file(&normalized) {
            files.push(SkillFile {
                path: normalized,
                content: fs::read_to_string(candidate).map_err(to_message)?,
            });
        }
    }
    if !files.iter().any(|file| file.path == "SKILL.md") {
        files.push(SkillFile {
            path: "SKILL.md".to_string(),
            content: String::new(),
        });
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(files)
}

fn safe_join(root: &str, relative: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root).canonicalize().map_err(to_message)?;
    let relative_path = Path::new(relative);
    if relative_path.is_absolute()
        || relative_path
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_) | Component::RootDir))
    {
        return Err("Path escapes the Skill workspace.".to_string());
    }

    let full_path = root.join(relative_path);
    let parent = full_path.parent().unwrap_or(&root);
    let canonical_parent = canonicalize_existing_parent(parent)?;

    if !canonical_parent.starts_with(&root) {
        return Err("Path escapes the Skill workspace.".to_string());
    }

    Ok(full_path)
}

fn canonicalize_existing_parent(path: &Path) -> Result<PathBuf, String> {
    let mut candidate = path;
    loop {
        if candidate.exists() {
            return candidate.canonicalize().map_err(to_message);
        }

        candidate = candidate
            .parent()
            .ok_or_else(|| "Path escapes the Skill workspace.".to_string())?;
    }
}

fn command_for_script(path: &Path) -> Command {
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    let mut command = match extension {
        "py" => Command::new("python"),
        "js" => Command::new("node"),
        _ => Command::new(""),
    };

    command.arg(path);
    command
}

struct ProcessOutput {
    stdout: Vec<u8>,
    stderr: Vec<u8>,
    success: bool,
    timed_out: bool,
}

fn run_command_with_timeout(mut command: Command, timeout: Duration) -> Result<ProcessOutput, String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to run script: {error}"))?;
    let stdout_reader = read_stdout(child.stdout.take());
    let stderr_reader = read_stderr(child.stderr.take());
    let started = Instant::now();
    let success;
    let mut timed_out = false;

    loop {
        if let Some(status) = child.try_wait().map_err(to_message)? {
            success = status.success();
            break;
        }

        if started.elapsed() >= timeout {
            timed_out = true;
            kill_process_tree(&mut child);
            let status = child.wait().map_err(to_message)?;
            success = status.success();
            break;
        }

        thread::sleep(Duration::from_millis(25));
    }

    Ok(ProcessOutput {
        stdout: join_reader(stdout_reader)?,
        stderr: join_reader(stderr_reader)?,
        success,
        timed_out,
    })
}

fn read_stdout(stdout: Option<ChildStdout>) -> JoinHandle<Result<Vec<u8>, String>> {
    thread::spawn(move || read_pipe(stdout))
}

fn read_stderr(stderr: Option<ChildStderr>) -> JoinHandle<Result<Vec<u8>, String>> {
    thread::spawn(move || read_pipe(stderr))
}

fn read_pipe<R>(reader: Option<R>) -> Result<Vec<u8>, String>
where
    R: Read,
{
    let Some(mut reader) = reader else {
        return Ok(Vec::new());
    };

    let mut output = Vec::new();
    reader.read_to_end(&mut output).map_err(to_message)?;
    Ok(output)
}

fn join_reader(reader: JoinHandle<Result<Vec<u8>, String>>) -> Result<Vec<u8>, String> {
    reader
        .join()
        .map_err(|_| "Failed to join process output reader.".to_string())?
}

fn kill_process_tree(child: &mut Child) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        let _ = child.kill();
    }

    #[cfg(not(windows))]
    {
        let _ = child.kill();
    }
}

fn validate_document(content: &str) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    let Some((frontmatter, body)) = split_frontmatter(content) else {
        issues.push(issue(
            "error",
            "SKILL.md must start with YAML frontmatter.",
            "SKILL.md",
            Some("frontmatter"),
        ));
        if content.trim().len() < 30 {
            issues.push(issue(
                "error",
                "Prompt body is too short to guide an agent reliably.",
                "SKILL.md",
                None,
            ));
        }
        return issues;
    };

    if frontmatter_value(&frontmatter, "name").is_none_or(|value| value.trim().is_empty()) {
        issues.push(issue("error", "Skill name is required.", "SKILL.md", Some("name")));
    }
    if frontmatter_value(&frontmatter, "description").is_none_or(|value| value.trim().is_empty()) {
        issues.push(issue(
            "warning",
            "Description helps users understand when to activate the skill.",
            "SKILL.md",
            Some("description"),
        ));
    }
    if body.trim().len() < 30 {
        issues.push(issue(
            "error",
            "Prompt body is too short to guide an agent reliably.",
            "SKILL.md",
            None,
        ));
    }
    issues
}

fn issue(severity: &str, message: &str, path: &str, field: Option<&str>) -> ValidationIssue {
    ValidationIssue {
        severity: severity.to_string(),
        message: message.to_string(),
        path: path.to_string(),
        field: field.map(str::to_string),
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

fn split_frontmatter(content: &str) -> Option<(String, String)> {
    let normalized = content.trim_start();
    let mut lines = normalized.lines();
    if lines.next()? != "---" {
        return None;
    }

    let mut frontmatter = Vec::new();
    let mut body = Vec::new();
    let mut in_body = false;
    for line in lines {
        if !in_body && line == "---" {
            in_body = true;
            continue;
        }

        if in_body {
            body.push(line);
        } else {
            frontmatter.push(line);
        }
    }

    in_body.then(|| (frontmatter.join("\n"), body.join("\n")))
}

fn is_standard_skill_file(path: &str) -> bool {
    path == "SKILL.md"
        || path.starts_with("scripts/")
        || path.starts_with("references/")
        || path.starts_with("assets/")
        || path.starts_with("tests/")
}

fn has_allowed_script_extension(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| matches!(extension, "js" | "py"))
}

fn is_allowed_script(path: &Path, root: &Path) -> bool {
    let Ok(candidate) = path.canonicalize() else {
        return false;
    };
    if !candidate.starts_with(root) {
        return false;
    }

    let Ok(relative) = candidate.strip_prefix(root) else {
        return false;
    };
    let mut components = relative.components();
    let is_scripts_child = components
        .next()
        .is_some_and(|component| component.as_os_str() == "scripts")
        && components.next().is_some();

    is_scripts_child
        && candidate
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| matches!(extension, "js" | "py"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowed_script_accepts_js_and_python_under_scripts() {
        let root = temp_root("allow");
        let scripts = root.join("scripts");
        fs::create_dir_all(&scripts).unwrap();
        let js = scripts.join("demo.js");
        let py = scripts.join("check.py");
        fs::write(&js, "console.log('demo')").unwrap();
        fs::write(&py, "print('demo')").unwrap();
        let canonical_root = root.canonicalize().unwrap();

        assert!(is_allowed_script(&js, &canonical_root));
        assert!(is_allowed_script(&py, &canonical_root));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn allowed_script_rejects_non_script_paths_and_extensions() {
        let root = temp_root("reject");
        let references = root.join("references");
        let scripts = root.join("scripts");
        fs::create_dir_all(&references).unwrap();
        fs::create_dir_all(&scripts).unwrap();
        let reference = references.join("tool.py");
        let unsupported = scripts.join("tool.sh");
        fs::write(&reference, "print('demo')").unwrap();
        fs::write(&unsupported, "echo demo").unwrap();
        let canonical_root = root.canonicalize().unwrap();

        assert!(!is_allowed_script(&reference, &canonical_root));
        assert!(!is_allowed_script(&unsupported, &canonical_root));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn safe_join_rejects_absolute_paths() {
        let root = temp_root("absolute");
        fs::create_dir_all(&root).unwrap();
        let absolute = std::env::temp_dir().join("outside-skillforge.md");
        let result = safe_join(&root.to_string_lossy(), &absolute.to_string_lossy());

        assert!(result.is_err());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn safe_join_rejects_traversal_through_non_existing_parent() {
        let root = temp_root("traversal");
        fs::create_dir_all(&root).unwrap();
        let result = safe_join(&root.to_string_lossy(), "missing/../../outside.md");

        assert!(result.is_err());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn safe_join_allows_new_standard_file_under_root() {
        let root = temp_root("new-file");
        fs::create_dir_all(&root).unwrap();
        let result = safe_join(&root.to_string_lossy(), "scripts/new.js").unwrap();

        assert!(result.starts_with(root.canonicalize().unwrap()));
        assert!(result.ends_with(Path::new("scripts/new.js")));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn read_skill_directory_adds_placeholder_when_skill_file_is_missing() {
        let root = temp_root("missing-skill");
        fs::create_dir_all(root.join("references")).unwrap();
        fs::write(root.join("references").join("brief.md"), "# Brief").unwrap();

        let files = read_skill_directory(root.to_string_lossy().to_string()).unwrap();

        assert!(files.iter().any(|file| file.path == "SKILL.md" && file.content.is_empty()));
        assert!(files.iter().any(|file| file.path == "references/brief.md"));

        let _ = fs::remove_dir_all(root);
    }

    fn temp_root(name: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("skillforge-runtime-{name}-{}-{nanos}", std::process::id()))
    }
}

fn should_skip_export_file(path: &Path, root: &Path, output_path: &Path) -> Result<bool, String> {
    let candidate = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    if candidate == output_path {
        return Ok(true);
    }

    let relative = path.strip_prefix(root).map_err(to_message)?;
    let is_root_file = relative.parent().is_none_or(|parent| parent.as_os_str().is_empty());
    let is_generated_skill_zip = relative
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|name| name.ends_with(".skill.zip"));

    Ok(is_root_file && is_generated_skill_zip)
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
