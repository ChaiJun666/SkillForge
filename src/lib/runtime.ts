import type { RunnableScript, SkillExecution, SkillFile } from '../types'

export function getRunnableScripts(files: SkillFile[]): RunnableScript[] {
  return files
    .filter((file) => file.path.startsWith('scripts/'))
    .filter((file) => file.path.endsWith('.js') || file.path.endsWith('.py'))
    .map((file) => ({
      path: file.path,
      language: file.path.endsWith('.py') ? 'python' : 'javascript'
    }))
}

export function formatExecutionStatus(execution: SkillExecution | null): string {
  if (!execution) return 'No script has run yet.'
  if (execution.timedOut) return `timed out in ${execution.duration}ms`
  return `${execution.status} in ${execution.duration}ms`
}

export function canRunScript(runnableScripts: RunnableScript[], isRunning: boolean): boolean {
  return runnableScripts.length > 0 && !isRunning
}
