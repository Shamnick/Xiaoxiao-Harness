import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsLocale, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { studioStore } from './store.ts'
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
  /** Read one image as an object URL, or undefined when unavailable. */
  readImage: (path: string, signal: AbortSignal) => Promise<string | undefined>
}

/** One generation job, as the studio tracks it. */
export interface StudioGeneration {
  id: string
  prompt: string
  /** Free-form aspect or duration label the surface offered. */
  variant: string
  /** Requested count. */
  count: number
  requestedAt: number
}

/** Owner props of the studio main panel. */
/**
 * Only the seats this panel reads. The slot's remaining standard hooks are not
 * named here: a component that ignores them satisfies the registration by
 * structure, and naming them would force every test to stub hooks it never drives.
 */
export type StudioRootProps = PropsLocale<'ui-studio'>
  & PropsStore<typeof studioStore> & {
    /** Which surface this panel renders. */
    surface: StudioSurface
    /** Return to the conversation surface, which the layout owns as its default entry. */
    openConversation: () => void
    /** Workspace file access. */
    code: StudioCodeApi
    /** Hand the reader to the conversation, which owns submission. */
    submitPrompt: () => void
    /** Sessions the reader was last in, newest first. */
    recentSessions: () => readonly { id: string; title: string; running: boolean }[]
    /** Open an existing session and return to the conversation. */
    openSession: (id: string) => void
  }

/** Narrowest a resizable pane may become, in pixels. */
const MIN_PANE = 160
/** Widest a side pane may become, in pixels. */
const MAX_PANE = 560

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
  const patterns: readonly { re: RegExp; kind: StudioSymbol['kind'] }[] = [
    { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: 'function' },
    { re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
    { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: 'interface' },
    { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/, kind: 'type' },
    { re: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*[=:]/, kind: 'constant' },
    { re: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/, kind: 'function' },
  ]
  text.split('\n').forEach((line, index) => {
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
 * @param props - locale seat, panel widths, workspace file access and prompt dispatch.
 * @returns the studio shell.
 */
export function StudioRoot(props: StudioRootProps) {
  const { t, surface, openConversation, code, submitPrompt, useStore, actions } = props
  const state = useStore(snapshot => snapshot)
  return (
    <div className={css.root}>
      <section className={css.surface} data-surface={surface}>
        {surface === 'code' && <CodeSurface t={t} code={code} useStore={useStore} actions={actions} />}
        {surface === 'work' && (
          <WorkSurface t={t} openConversation={openConversation} recentSessions={props.recentSessions} openSession={props.openSession} />
        )}
        {surface === 'image' && (
          <ImageSurface
            t={t}
            code={code}
            submitPrompt={submitPrompt}
            history={state.images}
            onPush={actions.pushImage}
            onClear={actions.clearImages}
          />
        )}
        {surface === 'video' && (
          <GenerateSurface
            mode="video"
            t={t}
            submitPrompt={submitPrompt}
            history={state.videos}
            onPush={actions.pushVideo}
            onClear={actions.clearVideos}
          />
        )}
      </section>
    </div>
  )
}

/** Aspect or duration choices per generation mode. */
const VARIANTS: Record<'image' | 'video', readonly string[]> = {
  image: ['1:1', '16:9', '9:16', '4:3'],
  video: ['4s', '8s', '12s'],
}

/** Image extensions the workspace gallery lists. */
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg|avif)$/iu

/**
 * Image surface: the workspace gallery beside the prompt form.
 * The gallery lists real files the Host resolves, so what it shows exists;
 * generation itself still goes through the agent.
 */
/**
 * Work surface: the sessions the reader was last in, plus the way back to the
 * conversation. The list is read once at mount; live session subscription
 * belongs to the conversation, which owns that projection.
 */
function WorkSurface({ t, openConversation, recentSessions, openSession }: {
  t: StudioRootProps['t']
  openConversation: () => void
  recentSessions: StudioRootProps['recentSessions']
  openSession: StudioRootProps['openSession']
}) {
  const sessions = useMemo(() => recentSessions(), [recentSessions])
  return (
    <div className={css.work}>
      <header className={css.workHead}>
        <h2 className={css.workTitle}>{t('work.title')}</h2>
        <button type="button" className={css.primaryAction} onClick={openConversation}>{t('work.open')}</button>
      </header>
      <p className={css.workHint}>{t('work.recent')}</p>
      {sessions.length === 0
        ? <p className={css.mapEmpty}>{t('work.noSessions')}</p>
        : (
          <ul className={css.sessionList}>
            {sessions.map(session => (
              <li key={session.id}>
                <button type="button" className={css.sessionItem} onClick={() => { openSession(session.id) }}>
                  <span className={css.sessionTitle}>{session.title}</span>
                  {session.running && <span className={css.sessionBadge}>{t('work.running')}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

function ImageSurface({ t, code, submitPrompt, history, onPush, onClear }: {
  t: StudioRootProps['t']
  code: StudioCodeApi
  submitPrompt: () => void
  history: readonly StudioGeneration[]
  onPush: (entry: StudioGeneration) => void
  onClear: () => void
}) {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<readonly StudioEntry[]>([])
  const [active, setActive] = useState<{ path: string; url: string } | undefined>()

  useEffect(() => {
    const controller = new AbortController()
    void code.list(path, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setEntries(result.entries)
      })
      .catch(() => { if (!controller.signal.aborted) setEntries([]) })
    return () => { controller.abort() }
  }, [code, path])

  const images = useMemo(
    () => entries.filter(entry => entry.type === 'file' && IMAGE_EXT.test(entry.name)),
    [entries],
  )
  const folders = useMemo(
    () => entries.filter(entry => entry.type === 'directory'),
    [entries],
  )
  const segments = path === '' ? [] : path.split('/')

  const open = useCallback((path: string) => {
    const controller = new AbortController()
    void code.readImage(path, controller.signal).then((url) => {
      if (controller.signal.aborted || url === undefined) return
      setActive((current) => {
        if (current !== undefined) URL.revokeObjectURL(current.url)
        return { path, url }
      })
    })
  }, [code])

  useEffect(() => () => { if (active !== undefined) URL.revokeObjectURL(active.url) }, [active])

  return (
    <div className={css.generate}>
      <div className={css.generateForm}>
        <GenerateForm t={t} mode="image" submitPrompt={submitPrompt} onPush={onPush} />
        <div className={css.gallery}>
          <p className={css.paneTitle}>{t('image.gallery')}</p>
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
          {folders.length > 0 && (
            <ul className={css.galleryGrid}>
              {folders.map(folder => (
                <li key={folder.name}>
                  <button
                    type="button"
                    className={css.galleryItem}
                    data-kind="directory"
                    onClick={() => { setPath(path === '' ? folder.name : `${path}/${folder.name}`) }}
                  >▸ {folder.name}</button>
                </li>
              ))}
            </ul>
          )}
          {images.length === 0
            ? <p className={css.mapEmpty}>{t('image.galleryEmpty')}</p>
            : (
              <ul className={css.galleryGrid}>
                {images.map(entry => (
                  <li key={entry.name}>
                    <button
                      type="button"
                      className={css.galleryItem}
                      data-active={active?.path === (path === '' ? entry.name : `${path}/${entry.name}`) || undefined}
                      onClick={() => { open(path === '' ? entry.name : `${path}/${entry.name}`) }}
                    >{entry.name}</button>
                  </li>
                ))}
              </ul>
            )}
          {active !== undefined && (
            <figure className={css.preview}>
              <img src={active.url} alt={active.path} />
              <figcaption>{active.path}</figcaption>
            </figure>
          )}
        </div>
      </div>
      <HistoryPanel t={t} history={history} onClear={onClear} />
    </div>
  )
}

/**
 * Generation surface: prompt, variant, count and the request history.
 * The prompt reaches the agent, which owns whichever generation tool the
 * deployment mounts; this surface never invents a result.
 */
function GenerateForm({ mode, t, submitPrompt, onPush }: {
  mode: 'image' | 'video'
  t: StudioRootProps['t']
  submitPrompt: () => void
  onPush: (entry: StudioGeneration) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [variant, setVariant] = useState(VARIANTS[mode][0] as string)
  const [count, setCount] = useState(1)
  const idRef = useRef(0)

  useEffect(() => { setVariant(VARIANTS[mode][0] as string) }, [mode])

  const submit = useCallback(() => {
    const text = prompt.trim()
    if (text === '') return
    onPush({
      id: `${String(Date.now())}-${String(idRef.current++)}`,
      prompt: text,
      variant,
      count,
      requestedAt: Date.now(),
    })
    submitPrompt()
    setPrompt('')
  }, [count, onPush, prompt, submitPrompt, variant])

  return (
    <>
      <label className={css.field}>
        <span className={css.fieldLabel}>{t(`${mode}.prompt` as 'image.prompt')}</span>
        <textarea
          className={css.textarea}
          rows={4}
          value={prompt}
          placeholder={t(`${mode}.promptPlaceholder` as 'image.promptPlaceholder')}
          onChange={(event) => { setPrompt(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { submit(); event.preventDefault() }
          }}
        />
      </label>
      <div className={css.row}>
        <span className={css.fieldLabel}>{mode === 'image' ? t('image.aspect') : t('video.duration')}</span>
        <div className={css.chips}>
          {VARIANTS[mode].map(option => (
            <button
              key={option}
              type="button"
              className={css.chip}
              data-active={option === variant || undefined}
              onClick={() => { setVariant(option) }}
            >{option}</button>
          ))}
        </div>
      </div>
      <div className={css.row}>
        <span className={css.fieldLabel}>{t('image.count')}</span>
        <div className={css.chips}>
          {[1, 2, 4].map(option => (
            <button
              key={option}
              type="button"
              className={css.chip}
              data-active={option === count || undefined}
              onClick={() => { setCount(option) }}
            >{option}</button>
          ))}
        </div>
      </div>
      <button type="button" className={css.primaryAction} onClick={submit} disabled={prompt.trim() === ''}>
        {t(`${mode}.generate` as 'image.generate')}
      </button>
      <p className={css.hint}>{t('generate.hint')}</p>
    </>
  )
}

/**
 * Recorded requests beside a generation form, newest first.
 * Both surfaces show the same list; only the history they pass in differs.
 */
function HistoryPanel({ t, history, onClear }: {
  t: StudioRootProps['t']
  history: readonly StudioGeneration[]
  onClear: () => void
}) {
  return (
    <div className={css.generateHistory}>
      <div className={css.historyHead}>
        <p className={css.paneTitle}>{t('generate.history')}</p>
        {history.length > 0 && (
          <button type="button" className={css.retry} onClick={onClear}>{t('generate.clear')}</button>
        )}
      </div>
      {history.length === 0
        ? <p className={css.mapEmpty}>{t('generate.empty')}</p>
        : (
          <ul className={css.historyList}>
            {history.map(entry => (
              <li key={entry.id} className={css.historyItem}>
                <span className={css.historyPrompt}>{entry.prompt}</span>
                <span className={css.historyMeta}>{entry.variant} · ×{String(entry.count)}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

function GenerateSurface({ mode, t, submitPrompt, history, onPush, onClear }: {
  mode: 'video'
  t: StudioRootProps['t']
  submitPrompt: () => void
  history: readonly StudioGeneration[]
  onPush: (entry: StudioGeneration) => void
  onClear: () => void
}) {
  return (
    <div className={css.generate}>
      <div className={css.generateForm}>
        <GenerateForm mode={mode} t={t} submitPrompt={submitPrompt} onPush={onPush} />
      </div>
      <HistoryPanel t={t} history={history} onClear={onClear} />
    </div>
  )
}

/** Explorer state for one directory level. */
type Listing = { state: 'idle' | 'loading' | 'error'; entries: readonly StudioEntry[] }

/**
 * Code surface: workspace explorer, file view and the symbol outline.
 * Both side panes carry a drag handle and remember their width.
 */
function CodeSurface({ t, code, useStore, actions }: {
  t: StudioRootProps['t']
  code: StudioCodeApi
  useStore: StudioRootProps['useStore']
  actions: StudioRootProps['actions']
}) {
  const widths = useStore(state => state)
  const path = widths.openPath
  const setPath = actions.setOpenPath
  const tabs = widths.tabs
  const active = widths.activeTab
  const selected = active
  const [listing, setListing] = useState<Listing>({ state: 'loading', entries: [] })
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  // File contents stay in the component: the store holds paths only, so a
  // large file never lands in the persisted snapshot.
  const [fileCache, setFileCache] = useState<Record<string, string>>({})
  const [loadingPath, setLoadingPath] = useState<string | undefined>()
  const title = useMemo(() => code.sessionTitle(), [code])

  useEffect(() => {
    const controller = new AbortController()
    setListing({ state: 'loading', entries: [] })
    void code.list(path, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setListing({ state: 'idle', entries: result.entries }) })
      .catch(() => { if (!controller.signal.aborted) setListing({ state: 'error', entries: [] }) })
    return () => { controller.abort() }
  }, [code, path])

  const openEntry = useCallback((entry: StudioEntry) => {
    if (entry.type === 'directory') {
      setPath(path === '' ? entry.name : `${path}/${entry.name}`)
      return
    }
    const target = path === '' ? entry.name : `${path}/${entry.name}`
    actions.openTab(target)
  }, [actions, path])

  // Read a tab the first time it becomes active. Contents are re-read rather
  // than persisted, so a file edited elsewhere shows its current text.
  useEffect(() => {
    if (active === '' || fileCache[active] !== undefined) return undefined
    const controller = new AbortController()
    setLoadingPath(active)
    void code.read(active, controller.signal)
      .then((file) => {
        if (controller.signal.aborted) return
        setFileCache(cache => ({ ...cache, [active]: file.text }))
        setLoadingPath(undefined)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setFileCache(cache => ({ ...cache, [active]: '' }))
        setLoadingPath(undefined)
      })
    return () => { controller.abort() }
  }, [active, code, fileCache])

  const openFile = active === ''
    ? undefined
    : { path: active, text: fileCache[active] ?? '', loading: loadingPath === active || fileCache[active] === undefined }

  const symbols = useMemo(
    () => openFile === undefined || openFile.loading ? [] : outlineSymbols(openFile.text),
    [openFile],
  )
  // Symbols grouped by declaration kind, with per-group collapse.
  const groups = useMemo(() => {
    const order: StudioSymbol['kind'][] = ['class', 'interface', 'type', 'function', 'constant', 'method']
    const buckets = new Map<StudioSymbol['kind'], StudioSymbol[]>()
    for (const symbol of symbols) {
      const bucket = buckets.get(symbol.kind)
      if (bucket === undefined) buckets.set(symbol.kind, [symbol])
      else bucket.push(symbol)
    }
    return order
      .filter(kind => buckets.has(kind))
      .map(kind => ({ kind, items: buckets.get(kind) as StudioSymbol[] }))
  }, [symbols])
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const toggleGroup = useCallback((kind: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }, [])

  const editorRef = useRef<HTMLDivElement | null>(null)
  const jump = useCallback((line: number) => {
    const host = editorRef.current
    /* v8 ignore next -- the pane renders before any outline row can be clicked, so this ref is never null on a reachable path */
    if (host === null) return
    const rows = host.querySelectorAll('[data-line]')
    const target = rows[line - 1]
    /* v8 ignore next -- outline line numbers come from the same text that produced the rows, so the index is always in range */
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      target.dataset.flash = 'on'
      window.setTimeout(() => { delete target.dataset.flash }, 900)
    }
  }, [])
  const segments = path === '' ? [] : path.split('/')
  const needle = query.trim().toLowerCase()
  const matched = useMemo(
    () => needle === ''
      ? listing.entries
      : listing.entries.filter(entry => entry.name.toLowerCase().includes(needle)),
    [listing.entries, needle],
  )

  return (
    <div
      className={css.codeGrid}
      style={{ gridTemplateColumns: `${String(widths.explorer)}px 5px minmax(0, 1fr) 5px ${String(widths.map)}px` }}
    >
      <aside className={css.codeExplorer} aria-label={t('code.explorer')}>
        <p className={css.paneTitle}>{title ?? t('code.explorer')}</p>
        <input
          className={css.search}
          type="search"
          value={query}
          placeholder={t('code.searchPlaceholder')}
          aria-label={t('code.search')}
          onChange={(event) => { setQuery(event.target.value) }}
          onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); event.preventDefault() } }}
        />
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
        {listing.state === 'idle' && listing.entries.length > 0 && matched.length === 0 && (
          <p className={css.mapEmpty}>{t('code.noMatch')}</p>
        )}
        {listing.state === 'idle' && matched.length > 0 && (
          <ul
            className={css.tree}
            tabIndex={0}
            role="tree"
            aria-label={t('code.explorer')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                setCursor(index => Math.min(matched.length - 1, index + 1))
                event.preventDefault()
              } else if (event.key === 'ArrowUp') {
                setCursor(index => Math.max(0, index - 1))
                event.preventDefault()
              } else if (event.key === 'Enter') {
                const entry = matched[Math.min(cursor, matched.length - 1)]
                /* v8 ignore next -- the tree only renders when `matched` is non-empty, so the index always resolves */
                if (entry !== undefined) { openEntry(entry); event.preventDefault() }
              } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
                /* v8 ignore next -- both the root and nested cases are exercised; v8 splits the `||` operand union here */
                if (path !== '') { setPath(segments.slice(0, -1).join('/')); event.preventDefault() }
              }
            }}
          >
            {matched.map((entry, index) => (
              <li key={entry.name}>
                <button
                  type="button"
                  className={css.treeItem}
                  data-kind={entry.type}
                  data-selected={selected === (path === '' ? entry.name : `${path}/${entry.name}`) || undefined}
                  data-cursor={index === Math.min(cursor, matched.length - 1) || undefined}
                  tabIndex={-1}
                  onClick={() => { setCursor(index); openEntry(entry) }}
                >
                  <span className={css.treeGlyph} aria-hidden="true">{entry.type === 'directory' ? '▸' : '·'}</span>
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <PaneHandle label={t('code.resizeExplorer')} value={widths.explorer} onResize={actions.resizeExplorer} />
      <div className={css.codeEditor} ref={editorRef}>
        {tabs.length > 0 && (
          <div className={css.tabBar} role="tablist" aria-label={t('code.tabs')}>
            {tabs.map(tab => (
              <span key={tab} className={css.tab} data-active={tab === active || undefined}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === active}
                  className={css.tabName}
                  onClick={() => { actions.openTab(tab) }}
                >{
                  /* v8 ignore next -- the store drops empty tab paths, so a tab always has a basename */
                    tab.split('/').pop() ?? tab
                  }</button>
                <button
                  type="button"
                  className={css.tabClose}
                  aria-label={t('code.closeTab')}
                  onClick={() => { actions.closeTab(tab) }}
                >×</button>
              </span>
            ))}
          </div>
        )}
        {openFile === undefined
          ? <p className={css.editorEmpty}>{t('code.pickFile')}</p>
          : openFile.loading
            ? <p className={css.editorEmpty}>{t('code.loading')}</p>
            : (
              <div className={css.sourceRows}>
                {openFile.text.split('\n').map((line, index) => (
                  <div key={String(index)} className={css.sourceRow} data-line={String(index + 1)}>
                    <span className={css.lineNo} aria-hidden="true">{index + 1}</span>
                    <span className={css.lineText}>{line === '' ? '\u00a0' : line}</span>
                  </div>
                ))}
              </div>
            )}
      </div>
      <PaneHandle label={t('code.resizeMap')} value={widths.map} onResize={actions.resizeMap} inverted />
      <aside className={css.codeMap} aria-label={t('code.map')}>
        <p className={css.paneTitle}>{t('code.map')}</p>
        {symbols.length === 0
          ? <p className={css.mapEmpty}>{t('code.map.empty')}</p>
          : (
            <div className={css.outline}>
              {groups.map(group => (
                <section key={group.kind} className={css.outlineGroup}>
                  <button
                    type="button"
                    className={css.outlineGroupHead}
                    aria-expanded={!collapsed.has(group.kind)}
                    onClick={() => { toggleGroup(group.kind) }}
                  >
                    <span className={css.outlineCaret} data-open={!collapsed.has(group.kind) || undefined} aria-hidden="true">▸</span>
                    <span className={css.outlineKind} data-kind={group.kind}>{group.kind}</span>
                    <span className={css.outlineCount}>{group.items.length}</span>
                  </button>
                  {!collapsed.has(group.kind) && (
                    <ul className={css.outlineList}>
                      {group.items.map(symbol => (
                        <li key={`${String(symbol.line)}-${symbol.name}`}>
                          <button type="button" className={css.outlineItem} onClick={() => { jump(symbol.line) }}>
                            <span className={css.outlineName}>{symbol.name}</span>
                            <span className={css.outlineLine}>{symbol.line}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
      </aside>
    </div>
  )
}

/**
 * Drag handle between the editor and a side pane.
 * Uses pointer capture so the drag survives the pointer leaving the handle,
 * and supports arrow keys for keyboard resizing.
 */
function PaneHandle({ label, value, onResize, inverted = false }: {
  label: string
  value: number
  onResize: (next: number) => void
  inverted?: boolean
}) {
  const drag = useRef<{ startX: number; startValue: number } | undefined>(undefined)
  const clamp = (next: number) => Math.min(MAX_PANE, Math.max(MIN_PANE, next))
  return (
    <div
      className={css.paneHandle}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={MIN_PANE}
      aria-valuemax={MAX_PANE}
      tabIndex={0}
      onPointerDown={(event) => {
        drag.current = { startX: event.clientX, startValue: value }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (drag.current === undefined) return
        const delta = inverted ? -1 : 1
        onResize(clamp(drag.current.startValue + delta * (event.clientX - drag.current.startX)))
      }}
      onPointerUp={(event) => {
        drag.current = undefined
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 12
        if (event.key === 'ArrowLeft') { onResize(clamp(value + (inverted ? step : -step))); event.preventDefault() }
        if (event.key === 'ArrowRight') { onResize(clamp(value + (inverted ? -step : step))); event.preventDefault() }
      }}
    />
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
export function SurfaceIcon({ surface }: { surface: StudioSurface }) {
  return <span className={css.railIcon}><SurfaceGlyph surface={surface} /></span>
}

/** Kept for the docs reference; the rail lives in the sidebar. */
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
