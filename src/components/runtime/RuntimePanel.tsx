import { Play, TerminalSquare } from 'lucide-react'
import { createTranslator, type TranslationKey } from '../../lib/i18n'
import { canRunScript, formatExecutionStatus } from '../../lib/runtime'
import type { RunnableScript, SkillExecution } from '../../types'

export type TerminalEntry =
  | { kind: 'message'; key: TranslationKey; values?: Record<string, string | number> }
  | { kind: 'raw'; text: string }

export interface RuntimePanelProps {
  terminal: TerminalEntry[]
  lastExecution: SkillExecution | null
  runnableScripts: RunnableScript[]
  selectedScriptPath: string
  isRunning: boolean
  title: string
  t: ReturnType<typeof createTranslator>
  onSelectScript: (path: string) => void
  onRun: () => void
}

export function RuntimePanel({
  terminal,
  lastExecution,
  runnableScripts,
  selectedScriptPath,
  isRunning,
  title,
  t,
  onSelectScript,
  onRun
}: RuntimePanelProps) {
  const executionLines = lastExecution
    ? [
        `Status: ${formatExecutionStatus(lastExecution)}`,
        lastExecution.timedOut ? 'Process timed out after 10000ms. Check stdout, stderr, and logs below.' : null,
        !lastExecution.timedOut && lastExecution.status === 'failed' ? 'Run failed. Check stdout, stderr, and logs below.' : null,
        lastExecution.stdout?.trim() ? `Stdout:\n${lastExecution.stdout.trimEnd()}` : 'Stdout:\n(no stdout)',
        lastExecution.stderr?.trim() ? `Stderr:\n${lastExecution.stderr.trimEnd()}` : 'Stderr:\n(no stderr)',
        lastExecution.output.trim() ? `Output:\n${lastExecution.output.trimEnd()}` : null,
        lastExecution.logs.length > 0 ? `Logs:\n${lastExecution.logs.join('\n')}` : null
      ].filter((line): line is string => Boolean(line))
    : [formatExecutionStatus(null)]

  const terminalText = [
    ...executionLines,
    terminal
      .map((entry) => (entry.kind === 'message' ? t(entry.key, entry.values) : entry.text))
      .join('\n')
  ]
    .filter(Boolean)
    .join('\n\n')

  const hasRunnableScript = runnableScripts.length > 0
  const canRun = canRunScript(runnableScripts, isRunning)

  return (
    <section className="terminal">
      <div className="pane-header">
        <TerminalSquare size={16} />
        <span>{title}</span>
        <select
          aria-label="Runtime script"
          className="runtime-script-select"
          disabled={!canRun}
          value={selectedScriptPath}
          onChange={(event) => onSelectScript(event.target.value)}
        >
          {hasRunnableScript ? (
            runnableScripts.map((script) => (
              <option key={script.path} value={script.path}>
                {script.path}
              </option>
            ))
          ) : (
            <option value="">No runnable scripts</option>
          )}
        </select>
        <button className="runtime-run-button" disabled={!canRun} onClick={onRun}>
          <Play size={14} />
          {isRunning ? 'Running' : 'Run'}
        </button>
        {lastExecution && <span className={`execution-pill ${lastExecution.status}`}>{formatExecutionStatus(lastExecution)}</span>}
      </div>
      <pre>{terminalText}</pre>
    </section>
  )
}
