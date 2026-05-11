import type { SkillExecution, SkillFile, SkillSummary, SourcedValidationIssue, WorkspaceState } from '../types'

export type WorkspaceAction =
  | { type: 'setLoading'; isLoading: boolean }
  | { type: 'setSkills'; skills: SkillSummary[] }
  | { type: 'setWorkspace'; root: string | null; files: SkillFile[]; activePath?: string }
  | { type: 'selectFile'; path: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'markSaved'; path: string }
  | { type: 'setIssues'; issues: SourcedValidationIssue[] }
  | { type: 'setExecution'; execution: SkillExecution | null }
  | { type: 'setStatus'; message: string }

export const initialWorkspaceState: WorkspaceState = {
  skills: [],
  activeRoot: null,
  files: [],
  activePath: 'SKILL.md',
  dirtyPaths: [],
  issues: [],
  lastExecution: null,
  isLoading: false,
  statusMessage: 'SkillForge workspace ready.'
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'setLoading':
      return { ...state, isLoading: action.isLoading }
    case 'setSkills':
      return { ...state, skills: action.skills }
    case 'setWorkspace': {
      const activePath = action.activePath ?? action.files.find((file) => file.path === 'SKILL.md')?.path ?? action.files[0]?.path ?? 'SKILL.md'

      return {
        ...state,
        activeRoot: action.root,
        files: action.files,
        activePath,
        dirtyPaths: [],
        issues: [],
        lastExecution: null
      }
    }
    case 'selectFile':
      return { ...state, activePath: action.path }
    case 'updateFile':
      return {
        ...state,
        files: state.files.map((file) => (file.path === action.path ? { ...file, content: action.content } : file)),
        dirtyPaths: state.dirtyPaths.includes(action.path) ? state.dirtyPaths : [...state.dirtyPaths, action.path]
      }
    case 'markSaved':
      return { ...state, dirtyPaths: state.dirtyPaths.filter((path) => path !== action.path) }
    case 'setIssues':
      return { ...state, issues: action.issues }
    case 'setExecution':
      return { ...state, lastExecution: action.execution }
    case 'setStatus':
      return { ...state, statusMessage: action.message }
    default:
      return state
  }
}

export function getActiveFile(state: WorkspaceState): SkillFile | undefined {
  return state.files.find((file) => file.path === state.activePath) ?? state.files[0]
}

export function getSkillFile(state: WorkspaceState): SkillFile | undefined {
  return state.files.find((file) => file.path === 'SKILL.md')
}

export function hasDirtyFiles(state: WorkspaceState): boolean {
  return state.dirtyPaths.length > 0
}
