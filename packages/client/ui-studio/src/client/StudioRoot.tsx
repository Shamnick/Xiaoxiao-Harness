import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './StudioRoot.module.css'

/** The four working surfaces the rail switches between. */
export type StudioSurface = 'work' | 'code' | 'image' | 'video'

/** One directory entry as the client sees it. */
export interface StudioEntry {
  name: string
  path: string
  hidden: boolean
}

/** Owner props of the studio main panel. */
export type StudioRootProps = PropsRuntime<'main'> & PropsLocale<'ui-studio'> & {
  /** Return to the conversation surface, which the layout owns as its default entry. */
  openConversation: () => void
  /** List one directory of the active Workspace. */
  listDirectory: (path?: string, signal?: AbortSignal) => Promise<{ entries: readonly StudioEntry[] }>
  /** Canonical path of the active Workspace, when one is open. */
  workspacePath?: string | undefined
}

/** Rail entries in display order. */
const SURFACES: readonly StudioSurface[] = ['work', 'code', 'image', 'video']

/**
 * Render the studio surface: a vertical activity rail plus the selected
 * work area.
 * @param props - locale seat plus the Workspace directory reader.
 * @returns the studio shell.
 */
export function StudioRoot({ t, openConversation, listDirectory, workspacePath }: StudioRootProps) {
  const [surface, setSurface] = useState<StudioSurface>('work')
  return (
    <div className={css.root}>
      <nav className={css.rail} aria-label={t('rail.aria')}>
        {SURFACES.map(id => (
          <button
            key={id}
            type="button"
            className={css.railButton}
            data-active={surface === id || undefined}
            aria-current={surface === id ? 'page' : undefined}
            onClick={() => { setSurface(id) }}
          >
            <SurfaceGlyph surface={id} />
            <span className={css.railLabel}>{t(`rail.${id}` as 'rail.work')}</span>
          </button>
        ))}
      </nav>
      <section className={css.surface} data-surface={surface}>
        {surface === 'code'
          ? <CodeSurface t={t} listDirectory={listDirectory} workspacePath={workspacePath} />
          : <SurfacePlaceholder id={surface} t={t} openConversation={openConversation} />}
      </section>
    </div>
  )
}

/** Surface placeholder for areas whose tools are not mounted yet. */
function SurfacePlaceholder({ id, t, openConversation }: {
  id: StudioSurface
  t: StudioRootProps['t']
  openConversation: () => void
}) {
  const title = t(`${id}.title` as 'work.title')
  const description = t(`${id}.description` as 'work.description')
  return (
    <div className={css.placeholder}>
      <SurfaceGlyph surface={id} large />
      <h2 className={css.placeholderTitle}>{title}</h2>
      <p className={css.placeholderText}>{description}</p>
      {id === 'work'
        ? <button type="button" className={css.primaryAction} onClick={openConversation}>{t('work.open')}</button>
        : <span className={css.badge}>{t('common.soon')}</span>}
    </div>
  )
}

/**
 * Code surface: Workspace explorer, editor area and the structure map.
 * The explorer lists the Workspace root; nested expansion arrives with the
 * file-open path that gives the editor something to show.
 */
function CodeSurface({ t, listDirectory, workspacePath }: {
  t: StudioRootProps['t']
  listDirectory: StudioRootProps['listDirectory']
  workspacePath?: string | undefined
}) {
  const [entries, setEntries] = useState<readonly StudioEntry[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (workspacePath === undefined) {
      setEntries([])
      setState('idle')
      return undefined
    }
    const controller = new AbortController()
    setState('loading')
    void listDirectory(workspacePath, controller.signal)
      .then((listing) => {
        if (controller.signal.aborted) return
        setEntries(listing.entries)
        setState('idle')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setEntries([])
        setState('error')
      })
    return () => { controller.abort() }
  }, [listDirectory, workspacePath])

  const visible = useMemo(() => entries.filter(entry => !entry.hidden), [entries])

  const retry = useCallback(() => {
    if (workspacePath === undefined) return
    setState('loading')
    void listDirectory(workspacePath)
      .then((listing) => { setEntries(listing.entries); setState('idle') })
      .catch(() => { setState('error') })
  }, [listDirectory, workspacePath])

  return (
    <div className={css.codeGrid}>
      <aside className={css.codeExplorer} aria-label={t('code.explorer')}>
        <p className={css.paneTitle}>{t('code.explorer')}</p>
        {workspacePath === undefined && <p className={css.mapEmpty}>{t('code.noWorkspace')}</p>}
        {state === 'error' && <p className={css.mapEmpty}>{t('code.listFailed')}</p>}
        {state === 'loading' && <p className={css.mapEmpty}>{t('code.loading')}</p>}
        {state === 'idle' && visible.length > 0 && (
          <ul className={css.tree}>
            {visible.map(entry => (
              <li key={entry.path} className={css.treeItem}>{entry.name}</li>
            ))}
          </ul>
        )}
        {state === 'idle' && workspacePath !== undefined && visible.length === 0 && (
          <p className={css.mapEmpty}>{t('code.empty')}</p>
        )}
        {state === 'error' && (
          <button type="button" className={css.retry} onClick={retry}>{t('code.retry')}</button>
        )}
      </aside>
      <div className={css.codeEditor} />
      <aside className={css.codeMap} aria-label={t('code.map')}>
        <p className={css.paneTitle}>{t('code.map')}</p>
        <p className={css.mapEmpty}>{t('code.map.empty')}</p>
      </aside>
    </div>
  )
}

/** Rail glyph per surface, drawn inline so the rail needs no asset pipeline. */
function SurfaceGlyph({ surface, large = false }: { surface: StudioSurface; large?: boolean }) {
  const size = large ? 40 : 18
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (surface === 'work') {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2.5" {...stroke} /><path d="M3 9h18" {...stroke} /></svg>
  }
  if (surface === 'code') {
    return <svg {...common}><path d="M9 7 4 12l5 5M15 7l5 5-5 5" {...stroke} /></svg>
  }
  if (surface === 'image') {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2.5" {...stroke} /><circle cx="9" cy="10" r="1.6" {...stroke} /><path d="m4 17 5-4 4 3 3-2 4 3" {...stroke} /></svg>
  }
  return <svg {...common}><rect x="3" y="5" width="14" height="14" rx="2.5" {...stroke} /><path d="m17 9 4-2v10l-4-2" {...stroke} /></svg>
}

/**
 * Sidebar launcher glyph for the studio panel.
 * @returns a 16px grid mark.
 */
export function StudioPanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
