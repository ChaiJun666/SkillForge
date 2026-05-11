import JSZip from 'jszip'
import { sampleSkill } from './sampleSkill'
import { parseSkillDocument, validateSkillDocument } from './skill'
import {
  createSkill,
  exportSkill,
  isTauriRuntime,
  listSkills as listTauriSkills,
  openSkill,
  runSkillScript,
  saveSkillFile,
  validateSkill
} from './tauriCommands'
import type { SkillExecution, SkillFile, SkillSummary } from '../types'

const storageKey = 'skillforge.workspace.v1'

export interface WorkspaceSnapshot {
  files: SkillFile[]
  activePath: string
}

export interface LoadedWorkspace {
  root: string | null
  files: SkillFile[]
  activePath: string
}

export interface WorkspaceAdapter {
  listSkills(): Promise<SkillSummary[]>
  createSkill(name: string): Promise<LoadedWorkspace>
  openSkill(root: string): Promise<LoadedWorkspace>
  saveFile(root: string | null, path: string, content: string): Promise<void>
  validateWorkspace(root: string | null, files: SkillFile[]): Promise<unknown[]>
  runScript(root: string | null, scriptPath: string, skillId: string, scriptContent?: string): Promise<SkillExecution>
  exportWorkspace(root: string | null, files: SkillFile[]): Promise<string>
}

export function loadWorkspace(): WorkspaceSnapshot {
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    return JSON.parse(stored) as WorkspaceSnapshot
  }

  return {
    activePath: 'SKILL.md',
    files: [
      { path: 'SKILL.md', content: sampleSkill },
      {
        path: 'scripts/demo.js',
        content: "console.log('SkillForge demo runtime: generated draft ready')\n"
      },
      { path: 'references/brief.md', content: '# Audience\n\nFounders and content teams.\n' }
    ]
  }
}

export function saveWorkspace(snapshot: WorkspaceSnapshot): void {
  localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

export function createWorkspaceAdapter(): WorkspaceAdapter {
  return isTauriRuntime() ? createTauriWorkspaceAdapter() : createBrowserWorkspaceAdapter()
}

export function createSkillWorkspace(name: string): WorkspaceSnapshot {
  const safeName = name.trim() || 'new-skill'
  const content = `---
name: ${safeName}
description: Describe when this skill should be used.
version: 0.1.0
compatibility:
  - codex
tags:
  - draft
---

# ${safeName}

Use this skill when the user needs a focused, repeatable agent workflow.
`

  return { activePath: 'SKILL.md', files: [{ path: 'SKILL.md', content }] }
}

export async function exportWorkspace(files: SkillFile[]): Promise<string> {
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  if (!skillFile) throw new Error('SKILL.md is required before export.')

  const errors = validateSkillDocument(skillFile.content).filter((issue) => issue.severity === 'error')
  if (errors.length > 0) throw new Error(errors[0].message)

  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.path, file.content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const parsed = parseSkillDocument(skillFile.content)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${parsed.metadata.id || 'skill'}.skill.zip`
  link.click()
  URL.revokeObjectURL(url)
  return link.download
}

export function runDemoScript(skillId: string, scriptPath: string, scriptContent: string): Promise<SkillExecution> {
  const startedAt = now()
  const stdout = scriptContent.trim() || "console.log('No script content')"
  const stderr = ''
  const logs = [
    `$ ${scriptPath.endsWith('.py') ? 'python' : 'node'} ${scriptPath}`,
    stdout,
    'Runtime adapter: browser demo mode, Tauri execution pending.'
  ]

  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      resolve({
        id: randomId(),
        skillId,
        input: scriptPath,
        stdout,
        stderr,
        output: `${stdout}${stderr}`,
        logs,
        duration: Math.round(now() - startedAt),
        status: 'success',
        timedOut: false
      })
    }, 450)
  })
}

function createBrowserWorkspaceAdapter(): WorkspaceAdapter {
  return {
    async listSkills() {
      const skillFile = loadWorkspace().files.find((file) => file.path === 'SKILL.md')
      const parsed = parseSkillDocument(skillFile?.content ?? sampleSkill)

      return [{ ...parsed.metadata, root: 'browser-demo' }]
    },
    async createSkill(name) {
      const workspace = createSkillWorkspace(name)
      saveWorkspace(workspace)
      return { root: null, files: workspace.files, activePath: workspace.activePath }
    },
    async openSkill() {
      const workspace = loadWorkspace()
      return { root: null, files: workspace.files, activePath: workspace.activePath }
    },
    async saveFile(_root, path, content) {
      const current = loadWorkspace()
      const files = current.files.some((file) => file.path === path)
        ? current.files.map((file) => (file.path === path ? { ...file, content } : file))
        : [...current.files, { path, content }]

      saveWorkspace({ files, activePath: path || current.activePath })
    },
    async validateWorkspace(_root, files) {
      return validateDocumentFile(files)
    },
    async runScript(_root, scriptPath, skillId, scriptContent = '') {
      return runDemoScript(skillId, scriptPath, scriptContent)
    },
    async exportWorkspace(_root, files) {
      return exportWorkspace(files)
    }
  }
}

function createTauriWorkspaceAdapter(): WorkspaceAdapter {
  return {
    async listSkills() {
      const skills = await listTauriSkills()
      return skills.map((skill) => ({ ...skill, root: skill.path }))
    },
    async createSkill(name) {
      const workspace = await createSkill({ name })
      return { root: workspace.root, files: workspace.files, activePath: 'SKILL.md' }
    },
    async openSkill(root) {
      const files = await openSkill(root)
      return { root, files, activePath: 'SKILL.md' }
    },
    async saveFile(root, path, content) {
      if (!root) throw new Error('Cannot save to disk because the workspace root is unavailable.')
      await saveSkillFile({ root, path, content })
    },
    async validateWorkspace(root, files) {
      if (!root) return validateDocumentFile(files)
      return validateSkill(root)
    },
    async runScript(root, scriptPath, skillId) {
      if (!root) throw new Error('Cannot run scripts because the workspace root is unavailable.')
      return runSkillScript({ root, scriptPath, skillId })
    },
    async exportWorkspace(root, files) {
      if (!root) throw new Error('Cannot export because the workspace root is unavailable.')

      const skillFile = files.find((file) => file.path === 'SKILL.md')
      if (!skillFile) throw new Error('SKILL.md is required before export.')

      const parsed = parseSkillDocument(skillFile.content)
      const fileName = `${parsed.metadata.id || 'skill'}.skill.zip`
      const outputPath = joinPath(root, fileName)
      return exportSkill({ root, outputPath })
    }
  }
}

function validateDocumentFile(files: SkillFile[]): unknown[] {
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  return validateSkillDocument(skillFile?.content ?? '')
}

function joinPath(root: string, child: string): string {
  const separator = root.includes('\\') ? '\\' : '/'
  return `${root.replace(/[\\/]+$/, '')}${separator}${child}`
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
