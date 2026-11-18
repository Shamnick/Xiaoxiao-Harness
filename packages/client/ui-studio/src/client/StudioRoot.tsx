import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './StudioRoot.module.css'

/** The four working surfaces the rail switches between. */
export type StudioSurface = 'work' | 'code' | 'image' | 'video'

/** One directory entry as the Host reports it. */
export interface StudioEntry {
  name: string
  type: 'file' | 'directory' | 'other'
  /** Byte size, present only for a regular file whose backend reports it. */
  size?: number
}

/** File access the code surface performs against the active Session workspace. */
export interface StudioCodeApi {
  /** Display title of the Session whose workspace is being browsed. */
  sessionTitle: () => string | undefined
  /** List one workspace-relative directory. */
  list: (path: string, signal: AbortSignal) => Promise<{ entries: readonly StudioEntry[] }>
  /** Read one workspace-relative file. */
  read: (path: string, signal: AbortSignal) => Promise<{ text: string }>
}

/** Owner props of the studio main panel. */
export type StudioRootProps = PropsRuntime<'main'> & PropsLocale<'ui-studio'> & {
  /** Return to the conversation surface, which the layout owns as its default entry. */
  openConversation: () => void
  /** Workspace file access. */
  code: StudioCodeApi
}

/** Rail entries in display order. */
const SURFACES: readonly StudioSurface[] = ['work', 'code', 'image', 'video']

/** One symbol found in a source file. */
export interface StudioSymbol {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'method'
  line: number
}

/**
 * Extract a flat symbol outline from source text.
 *
 * A regex outline rather than a language server: it covers the declaration
 * forms a reader scans for and never blocks on an indexer being ready.
 * @param text - file contents.
 * @returns symbols in source order.
 */
export function outlineSymbols(text: string): StudioSymbol[] {
  const out: StudioSymbol[] = []
  const lines = text.split('\n')
  const patterns: readonly { re: RegExp; kind: StudioSymbol['kind'] }[] = [
    { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: 'function' },
    { re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
    { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: 'interface' },
    { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/, kind: 'type' },
    { re: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*[=:]/, kind: 'constant' },
    { re: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/, kind: 'function' },
    { re: /^\s*(?:\/\/|#)\s*([A-Z][\w ]{3,})/, kind: 'type' },
  ]
  lines.forEach((line, index) => {
    for (const { re, kind } of patterns) {
      const match = re.exec(line)
      if (match?.[1] !== undefined && match[1].length > 0) {
        out.push({ name: match[1], kind, line: index + 1 })
        return
      }
    }
  })
  return out
}

/**
 * Render the studio surface: a vertical activity rail plus the selected
 * work area.
 * @param props - locale seat plus workspace file access.
 * @returns the studio shell.
 */
export function StudioRoot({ t, openConversation, code }: StudioRootProps) {
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
          ? <CodeSurface t={t} code={code} />
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

/** Explorer state for one directory level. */
type Listing = { state: 'idle' | 'loading' | 'error'; entries: readonly StudioEntry[] }

/**
 * Code surface: workspace explorer, file view and the symbol outline.
 * Selecting a file reads it and derives the outline in one pass.
 */
function CodeSurface({ t, code }: { t: StudioRootProps['t']; code: StudioCodeApi }) {
  const [listing, setListing] = useState<Listing>({ state: 'loading', entries: [] })
  const [path, setPath] = useState<string>('')
  const [openFile, setOpenFile] = useState<{ path: string; text: string; loading: boolean } | undefined>()
  const title = useMemo(() => code.sessionTitle(), [code])

  useEffect(() => {
    const controller = new AbortController()
    setListing({ state: 'loading', entries: [] })
    void code.list(path, controller.signal)
      .then((entries) => { if (!controller.signal.aborted) setListing({ state: 'idle', entries: entries.entries }) })
      .catch(() => { if (!controller.signal.aborted) setListing({ state: 'error', entries: [] }) })
    return () => { controller.abort() }
  }, [code, path])

  const openEntry = useCallback((entry: StudioEntry) => {
    if (entry.type === 'directory') {
      setPath(current => current === '' ? entry.name : `${current}/${entry.name}`)
      return
    }
    const target = path === '' ? entry.name : `${path}/${entry.name}`
    setOpenFile({ path: target, text: '', loading: true })
    const controller = new AbortController()
    void code.read(target, controller.signal)
      .then((file) => { if (!controller.signal.aborted) setOpenFile({ path: target, text: file.text, loading: false }) })
      .catch(() => { if (!controller.signal.aborted) setOpenFile({ path: target, text: '', loading: false }) })
  }, [code, path])

  const symbols = useMemo(
    () => openFile === undefined || openFile.loading ? [] : outlineSymbols(openFile.text),
    [openFile],
  )
  const segments = path === '' ? [] : path.split('/')

  return (
    <div className={css.codeGrid}>
      <aside className={css.codeExplorer} aria-label={t('code.explorer')}>
        <p className={css.paneTitle}>{title ?? t('code.explorer')}</p>
        <nav className={css.crumbs} aria-label={t('code.path')}>
          <button type="button" className={css.crumb} onClick={() => { setPath('') }}>{t('code.root')}</button>
          {segments.map((segment, index) => (
            <button
              key={`${segment}-${String(index)}`}
              type="button"
              className={css.crumb}
              onClick={() => { setPath(segments.slice(0, index + 1).join('/')) }}
            >{segment}</button>
          ))}
        </nav>
        {listing.state === 'loading' && <p className={css.mapEmpty}>{t('code.loading')}</p>}
        {listing.state === 'error' && <p className={css.mapEmpty}>{t('code.listFailed')}</p>}
        {listing.state === 'idle' && listing.entries.length === 0 && <p className={css.mapEmpty}>{t('code.empty')}</p>}
        {listing.state === 'idle' && listing.entries.length > 0 && (
          <ul className={css.tree}>
            {listing.entries.map(entry => (
              <li key={entry.name}>
                <button
                  type="button"
                  className={css.treeItem}
                  data-kind={entry.type}
                  data-selected={openFile?.path === (path === '' ? entry.name : `${path}/${entry.name}`) || undefined}
                  onClick={() => { openEntry(entry) }}
                >
                  <span className={css.treeGlyph} aria-hidden="true">{entry.type === 'directory' ? '▸' : '·'}</span>
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <div className={css.codeEditor}>
        {openFile === undefined
          ? <p className={css.editorEmpty}>{t('code.pickFile')}</p>
          : openFile.loading
            ? <p className={css.editorEmpty}>{t('code.loading')}</p>
            : <pre className={css.source}>{openFile.text}</pre>}
      </div>
      <aside className={css.codeMap} aria-label={t('code.map')}>
        <p className={css.paneTitle}>{t('code.map')}</p>
        {symbols.length === 0
          ? <p className={css.mapEmpty}>{t('code.map.empty')}</p>
          : (
            <ul className={css.outline}>
              {symbols.map(symbol => (
                <li key={`${String(symbol.line)}-${symbol.name}`} className={css.outlineItem}>
                  <span className={css.outlineKind} data-kind={symbol.kind}>{symbol.kind.slice(0, 3)}</span>
                  <span className={css.outlineName}>{symbol.name}</span>
                  <span className={css.outlineLine}>{symbol.line}</span>
                </li>
              ))}
            </ul>
          )}
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
