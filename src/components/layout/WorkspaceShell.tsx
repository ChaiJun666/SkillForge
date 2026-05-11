import {
  Boxes,
  CheckCircle2,
  FolderOpen,
  Languages,
  Moon,
  Play,
  Plus,
  Save,
  Sun,
  TerminalSquare
} from 'lucide-react'
import type { ReactNode } from 'react'
import { createTranslator, locales, type Locale } from '../../lib/i18n'
import { ImportExportPanel } from '../importExport/ImportExportPanel'

export interface WorkspaceShellProps {
  title: string
  theme: 'dark' | 'light'
  locale: Locale
  t: ReturnType<typeof createTranslator>
  openFolderPath: string
  onCreateSkill: () => void
  onOpenFolderPathChange: (path: string) => void
  onOpenFolder: () => void
  onRefresh: () => void
  onSave: () => void
  onValidate: () => void
  onRun: () => void
  onToggleTheme: () => void
  onToggleLocale: () => void
  onExport: () => void
  children: ReactNode
}

export function WorkspaceShell({
  title,
  theme,
  locale,
  t,
  openFolderPath,
  onCreateSkill,
  onOpenFolderPathChange,
  onOpenFolder,
  onRefresh,
  onSave,
  onValidate,
  onRun,
  onToggleTheme,
  onToggleLocale,
  onExport,
  children
}: WorkspaceShellProps) {
  return (
    <main className="app-shell" data-theme={theme} aria-label={t('appAria')}>
      <aside className="activity-rail" aria-label={t('activityNav')}>
        <Boxes className="brand-mark" size={28} />
        <button title={t('navExplorer')} className="rail-button active">
          <FolderOpen size={19} />
        </button>
        <button title={t('navRuntime')} className="rail-button">
          <TerminalSquare size={19} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t('appEyebrow')}</p>
            <h1>{title || t('untitledSkill')}</h1>
          </div>
          <div className="toolbar">
            <button onClick={onCreateSkill}>
              <Plus size={16} /> {t('toolbarNew')}
            </button>
            <ImportExportPanel
              t={t}
              openFolderPath={openFolderPath}
              onOpenFolderPathChange={onOpenFolderPathChange}
              onOpenFolder={onOpenFolder}
              onRefresh={onRefresh}
              onExport={onExport}
            />
            <button onClick={onSave}>
              <Save size={16} /> {t('toolbarSave')}
            </button>
            <button onClick={onValidate}>
              <CheckCircle2 size={16} /> {t('toolbarValidate')}
            </button>
            <button onClick={onRun}>
              <Play size={16} /> {t('toolbarRun')}
            </button>
            <button title={theme === 'dark' ? t('toolbarThemeLight') : t('toolbarThemeDark')} onClick={onToggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? t('themeLight') : t('themeDark')}
            </button>
            <button title={t('toolbarLanguage')} onClick={onToggleLocale}>
              <Languages size={16} /> {locales[locale]}
            </button>
          </div>
        </header>

        <div className="ide-grid">{children}</div>
      </section>
    </main>
  )
}
