import JSZip from 'jszip'
import { sampleSkill } from './sampleSkill'
import { parseSkillDocument, validateSkillDocument } from './skill'
import type { SkillExecution, SkillFile } from '../types'

const storageKey = 'skillforge.workspace.v1'

export interface WorkspaceSnapshot {
  files: SkillFile[]
  activePath: string
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

export async function exportWorkspace(files: SkillFile[]): Promise<void> {
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
}

export function runDemoScript(skillId: string, scriptContent: string): Promise<SkillExecution> {
  const startedAt = performance.now()
  const logs = [
    '$ node scripts/demo.js',
    scriptContent.trim() || "console.log('No script content')",
    'Runtime adapter: browser demo mode, Tauri execution pending.'
  ]

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        id: crypto.randomUUID(),
        skillId,
        input: 'scripts/demo.js',
        output: logs.join('\n'),
        logs,
        duration: Math.round(performance.now() - startedAt),
        status: 'success'
      })
    }, 450)
  })
}
