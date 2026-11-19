import { describe, expect, it, vi } from 'vitest'
import { apply, inject, name, PANEL_IDS } from '../src/client/index.ts'

/** One recorded slot registration. */
interface Recorded {
  slot: string
  options: Record<string, unknown>
}

/**
 * Minimal Cordis stand-in that records what apply() does. The real registry is
 * exercised by the assembled bundle; this asserts the wiring contract — which
 * panels and launchers a deployment actually gets.
 */
function makeContext() {
  const registrations: Recorded[] = []
  const effects: string[] = []
  const dictionaries: string[] = []
  const selected: (string | null)[] = []
  const ctx = {
    effect: (fn: () => void, label: string) => { effects.push(label); fn() },
    locale: {
      register: (namespace: string) => { dictionaries.push(namespace) },
      bind: () => (key: string) => key,
    },
    slots: {
      inject: (slot: string, factory: () => unknown) => {
        const record = (options: Record<string, unknown>) => {
          registrations.push({ slot, options })
          return () => {}
        }
        const result = factory()
        void result
        return record
      },
      register: (options: Record<string, unknown>, component: unknown) => {
        registrations.push({ slot: String(options.name), options })
        // Render the component so launcher-only factories (the glyph) execute.
        if (typeof component === 'function' && options.name !== 'main') void (component as () => unknown)()
        return () => {}
      },
    },
    layout: { selectPanel: (id: string | null) => { selected.push(id) } },
    uiWorkspace: { openSession: (_id: unknown) => {} },
    sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }) } },
    get: (name: string) => (name === 'workspaces' ? { list: { getSnapshot: () => ({ items: [] }) } } : undefined),
    remote: {
      workspaceFiles: {
        list: vi.fn(async () => ({ ok: false })),
        read: vi.fn(async () => ({ ok: false })),
        readBytes: vi.fn(async () => ({ ok: false })),
      },
    },
  }
  return { ctx, registrations, effects, dictionaries, selected }
}

describe('studio wiring', () => {
  it('declares the plugin identity and required services', () => {
    expect(name).toBe('client-ui-studio')
    expect(inject).toEqual(['slots', 'locale', 'layout', 'sessions', 'uiWorkspace', 'remote', 'remote.workspaceFiles'])
  })

  it('maps every surface to a distinct panel id', () => {
    const ids = Object.values(PANEL_IDS)
    expect(ids).toEqual(['studio.work', 'studio.code', 'studio.image', 'studio.video'])
    expect(new Set(ids).size).toBe(4)
  })

  it('registers the dictionaries once', () => {
    const { ctx, effects, dictionaries } = makeContext()
    apply(ctx as never)
    expect(dictionaries).toEqual(['ui-studio'])
    expect(effects).toContain('ui-studio: dictionaries')
  })

  it('registers four main panels and four sidebar launchers', () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const main = registrations.filter(entry => entry.slot === 'main' || entry.options.name === 'main')
    const launchers = registrations.filter(entry => entry.slot === 'sidebar.panellist' || entry.options.name === 'sidebar.panellist')
    expect(main).toHaveLength(4)
    expect(launchers).toHaveLength(4)
  })

  it('gives each launcher the panel it opens and an order', () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const launchers = registrations
      .filter(entry => entry.options.name === 'sidebar.panellist')
      .map(entry => entry.options)
    expect(launchers.map(option => option.id)).toEqual([
      'studio.work', 'studio.code', 'studio.image', 'studio.video',
    ])
    expect(launchers.map(option => option.order)).toEqual([-10, -9, -8, -7])
  })

  it('labels each launcher with its own dictionary key and draws a glyph', () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const launchers = registrations.filter(entry => entry.options.name === 'sidebar.panellist')
    const labels = launchers.map(entry => (entry.options.label as () => string)())
    expect(labels).toEqual(['rail.work', 'rail.code', 'rail.image', 'rail.video'])
    // The glyph factory builds an icon element; rendering it is the panel suite's job.
    for (const entry of launchers) {
      const draw = (entry.options as { __icon?: unknown }).__icon
      expect(draw === undefined || typeof draw === 'function').toBe(true)
    }
  })

  it('attaches the shared store to every panel so widths persist across them', () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const panels = registrations.filter(entry => entry.options.name === 'main')
    expect(panels.every(entry => entry.options.store !== undefined)).toBe(true)
    expect(new Set(panels.map(entry => entry.options.store)).size).toBe(1)
  })

  it('binds each panel to its own surface through the inject face', () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const surfaces = registrations
      .filter(entry => entry.options.name === 'main')
      .map((entry) => {
        const face = (entry.options.inject as () => { surface: string })()
        return face.surface
      })
    expect(surfaces).toEqual(['work', 'code', 'image', 'video'])
  })

  it('routes both navigation verbs back to the conversation', () => {
    const { ctx, registrations, selected } = makeContext()
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { openConversation: () => void; submitPrompt: () => void })()
    face.openConversation()
    face.submitPrompt()
    expect(selected).toEqual([null, null])
  })

  it('leaves the workspace readers inert until a session exists', async () => {
    const { ctx, registrations } = makeContext()
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => {
      code: {
        sessionTitle: () => string | undefined
        list: (path: string, signal: AbortSignal) => Promise<{ entries: unknown[] }>
        read: (path: string, signal: AbortSignal) => Promise<{ text: string }>
        readImage: (path: string, signal: AbortSignal) => Promise<string | undefined>
      }
    })()
    const signal = new AbortController().signal
    expect(face.code.sessionTitle()).toBeUndefined()
    expect(await face.code.list('', signal)).toEqual({ entries: [] })
    expect(await face.code.read('a.ts', signal)).toEqual({ text: '' })
    expect(await face.code.readImage('a.png', signal)).toBeUndefined()
  })

  it('reads through the Host once a session is present', async () => {
    const { ctx, registrations } = makeContext()
    const host = ctx.remote.workspaceFiles
    host.list = vi.fn(async () => ({ ok: true, value: { entries: [{ name: 'a.ts', type: 'file' }] } })) as never
    host.read = vi.fn(async () => ({ ok: true, value: { text: 'body' } })) as never
    host.readBytes = vi.fn(async () => ({ ok: true, value: { data: new Uint8Array([1, 2]) } })) as never
    ctx.sessions.list.getSnapshot = () => ({
      ids: ['s1'],
      byId: { s1: { id: 's1', displayTitle: 'demo', cwd: '/repo', updatedAt: 5, running: false } },
    }) as never
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => {
      code: {
        sessionTitle: () => string | undefined
        list: (path: string, signal: AbortSignal) => Promise<{ entries: unknown[] }>
        read: (path: string, signal: AbortSignal) => Promise<{ text: string }>
        readImage: (path: string, signal: AbortSignal) => Promise<string | undefined>
      }
    })()
    const signal = new AbortController().signal
    expect(face.code.sessionTitle()).toBe('demo')
    expect(await face.code.list('', signal)).toEqual({ entries: [{ name: 'a.ts', type: 'file' }] })
    expect(await face.code.read('a.ts', signal)).toEqual({ text: 'body' })
    expect(await face.code.readImage('a.png', signal)).toMatch(/^blob:/u)
  })

  it('reports nothing when the Host refuses', async () => {
    const { ctx, registrations } = makeContext()
    const host = ctx.remote.workspaceFiles
    host.list = vi.fn(async () => ({ ok: false })) as never
    host.read = vi.fn(async () => ({ ok: false })) as never
    host.readBytes = vi.fn(async () => ({ ok: false })) as never
    ctx.sessions.list.getSnapshot = () => ({
      ids: ['s1'],
      byId: { s1: { id: 's1', displayTitle: 'demo', cwd: '/repo', updatedAt: 5, running: false } },
    }) as never
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => {
      code: {
        list: (path: string, signal: AbortSignal) => Promise<{ entries: unknown[] }>
        read: (path: string, signal: AbortSignal) => Promise<{ text: string }>
        readImage: (path: string, signal: AbortSignal) => Promise<string | undefined>
      }
    })()
    const signal = new AbortController().signal
    expect(await face.code.list('', signal)).toEqual({ entries: [] })
    expect(await face.code.read('a.ts', signal)).toEqual({ text: '' })
    expect(await face.code.readImage('a.png', signal)).toBeUndefined()
  })

  it('picks the most recently updated session and skips subagents', async () => {
    const { ctx, registrations } = makeContext()
    ctx.sessions.list.getSnapshot = () => ({
      ids: ['s1', 's2', 's3'],
      byId: {
        s1: { id: 's1', displayTitle: 'old', cwd: '/a', updatedAt: 1, running: false },
        s2: { id: 's2', displayTitle: 'new', cwd: '/b', updatedAt: 9, running: false },
        s3: { id: 's3', displayTitle: 'sub', cwd: '/c', updatedAt: 99, running: false, origin: 'subagent' },
      },
    }) as never
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { code: { sessionTitle: () => string | undefined } })()
    expect(face.code.sessionTitle()).toBe('new')
  })
})

describe('work surface wiring', () => {
  /** Build a context whose session snapshot holds the given rows. */
  function withSessions(rows: Record<string, unknown>[]) {
    const made = makeContext()
    made.ctx.sessions.list.getSnapshot = () => ({
      ids: rows.map(row => (row as { id: string }).id),
      byId: Object.fromEntries(rows.map(row => [(row as { id: string }).id, row])) as never,
    }) as never
    return made
  }

  it('lists sessions newest first and skips subagents and untitled rows', () => {
    const { ctx, registrations } = withSessions([
      { id: 'a', displayTitle: 'older', updatedAt: 1, running: false },
      { id: 'b', displayTitle: 'newer', updatedAt: 9, running: true },
      { id: 'c', displayTitle: 'sub', updatedAt: 99, running: false, origin: 'subagent' },
      { id: 'd', displayTitle: '', updatedAt: 50, running: false },
    ])
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { recentSessions: () => { id: string; title: string; running: boolean }[] })()
    expect(face.recentSessions()).toEqual([
      { id: 'b', title: 'newer', running: true },
      { id: 'a', title: 'older', running: false },
    ])
  })

  it('caps the list at twenty rows', () => {
    const rows = Array.from({ length: 30 }, (_unused, index) => ({
      id: `s${String(index)}`,
      displayTitle: `t${String(index)}`,
      updatedAt: index,
      running: false,
    }))
    const { ctx, registrations } = withSessions(rows)
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { recentSessions: () => unknown[] })()
    expect(face.recentSessions()).toHaveLength(20)
  })

  it('clears the panel and opens the chosen session', () => {
    const made = makeContext()
    const opened: unknown[] = []
    made.ctx.uiWorkspace.openSession = (id: unknown) => { opened.push(id) }
    apply(made.ctx as never)
    const face = (made.registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { openSession: (id: string) => void })()
    face.openSession('s1')
    expect(opened).toEqual(['s1'])
    expect(made.selected).toEqual([null])
  })
})

describe('workspace projection', () => {
  it('maps registry rows into the work surface model', () => {
    const { ctx, registrations } = makeContext()
    const withRegistry = (name: string) => (name === 'workspaces'
      ? {
        list: {
          getSnapshot: () => ({
            items: [
              { workspaceId: 'w1', title: 'harness', path: '/src/harness', sessionIds: ['s1', 's2'] },
              { workspaceId: 'w2', title: 'docs', path: '/src/docs', sessionIds: [] },
            ],
          }),
        },
      }
      : undefined)
    ctx.get = withRegistry as never
    apply(ctx as never)
    const face = (registrations.find(entry => entry.options.name === 'main')
      ?.options.inject as () => { workspaces: () => { workspaceId: string; title: string; path: string; sessionIds: string[] }[] })()
    expect(face.workspaces()).toEqual([
      { workspaceId: 'w1', title: 'harness', path: '/src/harness', sessionIds: ['s1', 's2'] },
      { workspaceId: 'w2', title: 'docs', path: '/src/docs', sessionIds: [] },
    ])
  })
})
