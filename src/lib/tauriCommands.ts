import type { Skill, SkillExecution, SkillFile, ValidationIssue } from '../types'

export interface CreateSkillRequest {
  name: string
}

export interface SaveSkillFileRequest {
  root: string
  path: string
  content: string
}

export interface RunSkillScriptRequest {
  root: string
  scriptPath: string
  skillId: string
}

export interface ExportSkillRequest {
  root: string
  outputPath: string
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function listSkills(): Promise<Skill[]> {
  return invokeCommand<Skill[]>('list_skills')
}

export async function createSkill(request: CreateSkillRequest): Promise<SkillFile[]> {
  return invokeCommand<SkillFile[]>('create_skill', { request })
}

export async function openSkill(root: string): Promise<SkillFile[]> {
  return invokeCommand<SkillFile[]>('open_skill', { root })
}

export async function readSkillFile(root: string, path: string): Promise<string> {
  return invokeCommand<string>('read_skill_file', { root, path })
}

export async function saveSkillFile(request: SaveSkillFileRequest): Promise<void> {
  return invokeCommand<void>('save_skill_file', { request })
}

export async function validateSkill(root: string): Promise<ValidationIssue[]> {
  return invokeCommand<ValidationIssue[]>('validate_skill', { root })
}

export async function runSkillScript(request: RunSkillScriptRequest): Promise<SkillExecution> {
  return invokeCommand<SkillExecution>('run_skill_script', { request })
}

export async function exportSkill(request: ExportSkillRequest): Promise<string> {
  return invokeCommand<string>('export_skill', { request })
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}
