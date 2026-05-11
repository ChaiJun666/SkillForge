import type { ValidationIssue } from '../types'

export type Locale = 'en' | 'zh-CN'

export const defaultLocale: Locale = 'en'
export const localeStorageKey = 'skillforge.locale.v1'

export const locales: Record<Locale, string> = {
  en: 'EN',
  'zh-CN': '中文'
}

const en = {
  appAria: 'SkillForge workspace',
  activityNav: 'Primary navigation',
  appEyebrow: 'SkillForge MVP',
  untitledSkill: 'Untitled Skill',
  navExplorer: 'Explorer',
  navRuntime: 'Runtime',
  toolbarNew: 'New',
  toolbarOpenFolder: 'Open Folder',
  toolbarRefresh: 'Refresh',
  toolbarSave: 'Save',
  toolbarValidate: 'Validate',
  toolbarRun: 'Run',
  toolbarExport: 'Export',
  openFolderPathLabel: 'Folder path',
  openFolderPathPlaceholder: 'Paste local folder path',
  openFolderPathRequired: 'Enter a folder path before opening.',
  confirmDiscardDirty: 'You have unsaved changes. Continue without saving?',
  toolbarLanguage: 'Switch language',
  toolbarThemeLight: 'Switch to light theme',
  toolbarThemeDark: 'Switch to dark theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  explorerTitle: 'Explorer',
  metadataTitle: 'Metadata',
  fieldName: 'Name',
  fieldDescription: 'Description',
  fieldVersion: 'Version',
  fieldCompatibility: 'Compatibility',
  fieldTags: 'Tags',
  validationErrors: 'errors',
  validationWarnings: 'warnings',
  validationInfo: 'info',
  noValidationIssues: 'No validation issues.',
  terminalTitle: 'Runtime Terminal',
  terminalReady: 'SkillForge workspace ready.',
  terminalCreated: 'Created new Skill workspace.',
  terminalOpenedFolder: 'Opened folder {path}.',
  terminalOpenFolderRequired: 'Enter a folder path before opening.',
  terminalRefreshed: 'Workspace refreshed.',
  terminalSaved: 'Saved {path}.',
  terminalSaveBlocked: 'Save blocked: {message}',
  terminalSaveBeforeRun: 'Save changes before running.',
  terminalSaveBeforeExport: 'Save changes before exporting.',
  terminalValidation: 'Validation complete: {errors} errors, {warnings} warnings, {info} info.',
  terminalExported: 'Exported .skill.zip package: {path}',
  terminalExportBlocked: 'Export blocked: {message}',
  issueSkillFileRequired: 'SKILL.md is required.',
  issueFrontmatter: 'SKILL.md must start with YAML frontmatter.',
  issueNameRequired: 'Skill name is required.',
  issueDescription: 'Description helps users understand when to activate the skill.',
  issueVersion: 'Version is missing.',
  issueCompatibility: 'Compatibility is empty; add target agent ecosystems when known.',
  issuePromptBody: 'Prompt body is too short to guide an agent reliably.'
} as const

export type TranslationKey = keyof typeof en
type TranslationDictionary = Record<TranslationKey, string>

const zh: TranslationDictionary = {
  appAria: 'SkillForge 工作区',
  activityNav: '主导航',
  appEyebrow: 'SkillForge MVP',
  untitledSkill: '未命名 Skill',
  navExplorer: '资源管理器',
  navRuntime: '运行时',
  toolbarNew: '新建',
  toolbarOpenFolder: '打开文件夹',
  toolbarRefresh: '刷新',
  toolbarSave: '保存',
  toolbarValidate: '校验',
  toolbarRun: '运行',
  toolbarExport: '导出',
  openFolderPathLabel: '文件夹路径',
  openFolderPathPlaceholder: '粘贴本地文件夹路径',
  openFolderPathRequired: '请先输入文件夹路径。',
  confirmDiscardDirty: '你有未保存的更改。要不保存并继续吗？',
  toolbarLanguage: '切换语言',
  toolbarThemeLight: '切换到亮色主题',
  toolbarThemeDark: '切换到暗色主题',
  themeLight: '亮色',
  themeDark: '暗色',
  explorerTitle: '资源管理器',
  metadataTitle: '元数据',
  fieldName: '名称',
  fieldDescription: '描述',
  fieldVersion: '版本',
  fieldCompatibility: '兼容平台',
  fieldTags: '标签',
  validationErrors: '错误',
  validationWarnings: '警告',
  validationInfo: '提示',
  noValidationIssues: '没有校验问题。',
  terminalTitle: '运行终端',
  terminalReady: 'SkillForge 工作区已就绪。',
  terminalCreated: '已创建新的 Skill 工作区。',
  terminalOpenedFolder: '已打开文件夹 {path}。',
  terminalOpenFolderRequired: '请先输入文件夹路径。',
  terminalRefreshed: '工作区已刷新。',
  terminalSaved: '已保存 {path}。',
  terminalSaveBlocked: '保存被阻止：{message}',
  terminalSaveBeforeRun: '请先保存更改再运行。',
  terminalSaveBeforeExport: '请先保存更改再导出。',
  terminalValidation: '校验完成：{errors} 个错误，{warnings} 个警告，{info} 条提示。',
  terminalExported: '已导出 .skill.zip 包：{path}',
  terminalExportBlocked: '导出被阻止：{message}',
  issueSkillFileRequired: '缺少 SKILL.md。',
  issueFrontmatter: 'SKILL.md 必须以 YAML frontmatter 开头。',
  issueNameRequired: 'Skill 名称为必填项。',
  issueDescription: '描述可以帮助用户理解何时激活该 Skill。',
  issueVersion: '缺少版本号。',
  issueCompatibility: '兼容平台为空；明确目标 Agent 生态后请补充。',
  issuePromptBody: 'Prompt 正文太短，无法可靠地指导 Agent。'
}

export const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  'zh-CN': zh
}

export function loadLocale(storage: Pick<Storage, 'getItem'> = localStorage): Locale {
  const stored = storage.getItem(localeStorageKey)
  return isLocale(stored) ? stored : defaultLocale
}

export function saveLocale(locale: Locale, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(localeStorageKey, locale)
}

export function nextLocale(locale: Locale): Locale {
  return locale === 'en' ? 'zh-CN' : 'en'
}

export function createTranslator(locale: Locale) {
  return (key: TranslationKey, values: Record<string, string | number> = {}) => {
    let text = dictionaries[locale][key]
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
    return text
  }
}

export function localizeIssue(issue: ValidationIssue, t: ReturnType<typeof createTranslator>): string {
  if (issue.path === 'SKILL.md' && issue.message === 'SKILL.md is required.') return t('issueSkillFileRequired')
  if (issue.field === 'frontmatter') return t('issueFrontmatter')
  if (issue.field === 'name') return t('issueNameRequired')
  if (issue.field === 'description') return t('issueDescription')
  if (issue.field === 'version') return t('issueVersion')
  if (issue.field === 'compatibility') return t('issueCompatibility')
  if (issue.message.includes('Prompt body')) return t('issuePromptBody')
  return issue.message
}

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh-CN'
}
