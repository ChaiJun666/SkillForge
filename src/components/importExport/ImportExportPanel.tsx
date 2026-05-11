import { Download, FolderOpen, RefreshCw } from 'lucide-react'
import { createTranslator } from '../../lib/i18n'

export interface ImportExportPanelProps {
  t: ReturnType<typeof createTranslator>
  openFolderPath: string
  onOpenFolderPathChange: (path: string) => void
  onOpenFolder: () => void
  onRefresh: () => void
  onExport: () => void
}

export function ImportExportPanel({
  t,
  openFolderPath,
  onOpenFolderPathChange,
  onOpenFolder,
  onRefresh,
  onExport
}: ImportExportPanelProps) {
  return (
    <>
      <form
        className="open-folder-control"
        onSubmit={(event) => {
          event.preventDefault()
          onOpenFolder()
        }}
      >
        <input
          aria-label={t('openFolderPathLabel')}
          placeholder={t('openFolderPathPlaceholder')}
          value={openFolderPath}
          onChange={(event) => onOpenFolderPathChange(event.target.value)}
        />
        <button type="submit">
          <FolderOpen size={16} /> {t('toolbarOpenFolder')}
        </button>
      </form>
      <button onClick={onRefresh}>
        <RefreshCw size={16} /> {t('toolbarRefresh')}
      </button>
      <button className="primary" onClick={onExport}>
        <Download size={16} /> {t('toolbarExport')}
      </button>
    </>
  )
}
