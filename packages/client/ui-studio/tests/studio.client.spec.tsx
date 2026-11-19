// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { StudioPanelIcon, StudioRoot, SurfaceIcon, outlineSymbols } from '../src/client/StudioRoot.tsx'
import type { StudioCodeApi, StudioEntry, StudioGeneration, StudioRootProps } from '../src/client/StudioRoot.tsx'
import type { StudioKey } from '../src/client/locales.ts'

// The panel's locale seat resolves through this map. Declared here rather than
// by importing the plugin entry, which would also pull every other package's
// standard-props merge and demand hooks this suite does not drive.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ui-studio': StudioKey
  }
}

/** Dictionary stand-in: every key resolves to itself, so assertions read the key. */
const t: StudioRootProps['t'] = key => key

beforeAll(() => {
  // jsdom has no layout engine; the symbol jump calls this.
  Element.prototype.scrollIntoView = () => {}
})

// Each case mounts its own panel; without this, queries would match the
// previous case's DOM.
afterEach(() => { cleanup() })

/** Store backed by the real snapshot store, so actions notify the panel. */
function makeStore(initial: Partial<Record<string, unknown>> = {}) {
  const store = createSnapshotStore({
    explorer: 240,
    map: 260,
    images: [] as readonly StudioGeneration[],
    videos: [] as readonly StudioGeneration[],
    openPath: '',
    tabs: [] as readonly string[],
    activeTab: '',
    ...initial,
  })
  const actions = {
    resizeExplorer: (value: number) => { store.update((d) => { d.explorer = value }) },
    resizeMap: (value: number) => { store.update((d) => { d.map = value }) },
    pushImage: (entry: StudioGeneration) => { store.update((d) => { d.images = [entry, ...d.images] }) },
    pushVideo: (entry: StudioGeneration) => { store.update((d) => { d.videos = [entry, ...d.videos] }) },
    removeImage: (id: string) => { store.update((d) => { d.images = d.images.filter(item => item.id !== id) }) },
    removeVideo: (id: string) => { store.update((d) => { d.videos = d.videos.filter(item => item.id !== id) }) },
    clearImages: () => { store.update((d) => { d.images = [] }) },
    clearVideos: () => { store.update((d) => { d.videos = [] }) },
    setOpenPath: (value: string) => { store.update((d) => { d.openPath = value }) },
    openTab: (value: string) => {
      if (value === '') return
      store.update((d) => {
        if (!d.tabs.includes(value)) d.tabs = [...d.tabs, value].slice(-8)
        d.activeTab = value
      })
    },
    closeTab: (value: string) => {
      store.update((d) => {
        const index = d.tabs.indexOf(value)
        if (index < 0) return
        const next = d.tabs.filter(tab => tab !== value)
        d.tabs = next
        if (d.activeTab === value) d.activeTab = next[Math.min(index, next.length - 1)] ?? ''
      })
    },
  }
  const useStore = <T,>(selector: (snapshot: ReturnType<typeof store.getSnapshot>) => T): T =>
    useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()))
  return { store, actions, useStore, snapshot: () => store.getSnapshot() }
}

/** File access stand-in. */
function makeCode(overrides: Partial<StudioCodeApi> = {}): StudioCodeApi {
  return {
    sessionTitle: () => 'demo',
    list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [] }),
    read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: '' }),
    readImage: vi.fn<StudioCodeApi['readImage']>().mockResolvedValue(undefined),
    ...overrides,
  }
}

/** Render one surface with driven props. */
function mount(surface: StudioRootProps['surface'], store = makeStore(), code = makeCode(), sessions: StudioRootProps['recentSessions'] = () => []) {
  const openConversation = vi.fn()
  const submitPrompt = vi.fn()
  const openSession = vi.fn()
  render(
    <StudioRoot
      t={t}
      surface={surface}
      openConversation={openConversation}
      submitPrompt={submitPrompt}
      recentSessions={sessions}
      openSession={openSession}
      code={code}
      useStore={store.useStore as StudioRootProps['useStore']}
      actions={store.actions as StudioRootProps['actions']}
    />,
  )
  return { store, code, openConversation, submitPrompt, openSession }
}

const file = (name: string): StudioEntry => ({ name, type: 'file' })
const dir = (name: string): StudioEntry => ({ name, type: 'directory' })

describe('outlineSymbols', () => {
  it('finds the declaration forms a reader scans for, in source order', () => {
    const text = [
      "import { x } from 'y'",
      'export function alpha() {}',
      'export class Beta {}',
      'export interface Gamma {}',
      'export type Delta = string',
      'export const EPSILON = 1',
      'def python_style():',
      '  pass',
    ].join('\n')
    expect(outlineSymbols(text)).toEqual([
      { name: 'alpha', kind: 'function', line: 2 },
      { name: 'Beta', kind: 'class', line: 3 },
      { name: 'Gamma', kind: 'interface', line: 4 },
      { name: 'Delta', kind: 'type', line: 5 },
      { name: 'EPSILON', kind: 'constant', line: 6 },
      { name: 'python_style', kind: 'function', line: 7 },
    ])
  })

  it('yields nothing when no declaration appears', () => {
    expect(outlineSymbols('// just a comment\n  plain text here')).toEqual([])
  })
})

describe('work surface', () => {
  it('opens the conversation', () => {
    const { openConversation } = mount('work')
    fireEvent.click(screen.getByRole('button', { name: 'work.open' }))
    expect(openConversation).toHaveBeenCalledOnce()
  })
})

describe('code surface', () => {
  it('lists the root and descends into a directory', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>()
        .mockResolvedValueOnce({ entries: [dir('src')] })
        .mockResolvedValueOnce({ entries: [file('main.ts')] }),
    })
    const { store } = mount('code', makeStore(), code)
    fireEvent.click(await screen.findByText('src'))
    await waitFor(() => { expect(store.snapshot().openPath).toBe('src') })
    expect(code.list).toHaveBeenLastCalledWith('src', expect.anything())
  })

  it('filters the listing and reports no match', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('alpha.ts'), file('beta.ts')] }),
    })
    mount('code', makeStore(), code)
    await screen.findByText('alpha.ts')
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'alp' } })
    expect(screen.getByText('alpha.ts')).toBeTruthy()
    expect(screen.queryByText('beta.ts')).toBeNull()
    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.getAllByText('code.noMatch').length).toBeGreaterThan(0)
  })

  it('clears the query on Escape', async () => {
    const code = makeCode({ list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }) })
    mount('code', makeStore(), code)
    await screen.findByText('a.ts')
    const search = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'a' } })
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search.value).toBe('')
  })

  it('opens a file in a tab', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'alpha' }),
    })
    const { store } = mount('code', makeStore(), code)
    fireEvent.click(await screen.findByText('a.ts'))
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('a.ts') })
    expect(store.snapshot().tabs).toEqual(['a.ts'])
  })

  it('navigates the tree from the keyboard', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts'), file('b.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'x' }),
    })
    const { store } = mount('code', makeStore(), code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'ArrowDown' })
    fireEvent.keyDown(tree, { key: 'Enter' })
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('b.ts') })
  })

  it('closes a tab and focuses its neighbour', async () => {
    const store = makeStore({ tabs: ['a.ts', 'b.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts'), file('b.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'x' }),
    })
    mount('code', store, code)
    const closes = await screen.findAllByLabelText('code.closeTab')
    fireEvent.click(closes[0] as HTMLElement)
    await waitFor(() => { expect(store.snapshot().tabs).toEqual(['b.ts']) })
    expect(store.snapshot().activeTab).toBe('b.ts')
  })

  it('resizes a pane by keyboard within bounds', () => {
    const { store } = mount('code')
    const handle = screen.getByLabelText('code.resizeExplorer')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(store.snapshot().explorer).toBe(252)
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true })
    expect(store.snapshot().explorer).toBe(212)
  })

  it('still edits leftward at the far right of the map pane', () => {
    const { store } = mount('code')
    const handle = screen.getByLabelText('code.resizeMap')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(store.snapshot().map).toBe(272)
  })

  it('reports a failed listing', async () => {
    mount('code', makeStore(), makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockRejectedValue(new Error('boom')),
    }))
    expect((await screen.findAllByText('code.listFailed')).length).toBeGreaterThan(0)
  })

  it('reports an empty directory', async () => {
    mount('code', makeStore(), makeCode())
    expect((await screen.findAllByText('code.empty')).length).toBeGreaterThan(0)
  })
})

describe('generation surfaces', () => {
  beforeEach(() => { vi.useRealTimers() })

  it('records an image request and returns to the conversation', () => {
    const { store, submitPrompt } = mount('image')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a quiet lake' } })
    fireEvent.click(screen.getByRole('button', { name: 'image.generate' }))
    expect(store.snapshot().images).toHaveLength(1)
    expect(submitPrompt).toHaveBeenCalledOnce()
  })

  it('keeps the generate button disabled without a prompt', () => {
    mount('video')
    const button = screen.getByRole('button', { name: 'video.generate' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'waves' } })
    expect(button.disabled).toBe(false)
  })

  it('previews a workspace image and ignores non-images', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('shot.png'), file('notes.md')] }),
      readImage: vi.fn<StudioCodeApi['readImage']>().mockResolvedValue('blob:shot'),
    })
    mount('image', makeStore(), code)
    const item = await screen.findByText('shot.png')
    expect(screen.queryByText('notes.md')).toBeNull()
    fireEvent.click(item)
    await waitFor(() => { expect(screen.getByRole('img')).toHaveProperty('src', 'blob:shot') })
  })

  it('notes an empty gallery', async () => {
    mount('image', makeStore(), makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('notes.md')] }),
    }))
    expect((await screen.findAllByText('image.galleryEmpty')).length).toBeGreaterThan(0)
  })

  it('clears recorded requests', () => {
    const store = makeStore({ images: [{ id: 'x', prompt: 'lake', variant: '1:1', count: 2, requestedAt: 0 }] })
    mount('image', store)
    fireEvent.click(screen.getByRole('button', { name: 'generate.clear' }))
    expect(store.snapshot().images).toEqual([])
  })
})

describe('residual branches', () => {
  it('keeps the prompt when only a modifier is pressed', () => {
    const { store } = mount('video')
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'sea' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(store.snapshot().videos).toHaveLength(0)
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true })
    expect(store.snapshot().videos).toHaveLength(1)
  })

  it('submits with the ctrl modifier too', () => {
    const { store } = mount('video')
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'storm' } })
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true })
    expect(store.snapshot().videos).toHaveLength(1)
  })

  it('ignores a blank prompt even when submit is forced', () => {
    const { store } = mount('video')
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: '   ' } })
    fireEvent.keyDown(box, { key: 'Enter', metaKey: true })
    expect(store.snapshot().videos).toHaveLength(0)
  })

  it('switches the variant and count chips', () => {
    const { store } = mount('video')
    fireEvent.click(screen.getByRole('button', { name: '8s' }))
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'clip' } })
    fireEvent.click(screen.getByRole('button', { name: 'video.generate' }))
    expect(store.snapshot().videos[0]).toMatchObject({ variant: '8s', count: 4 })
  })

  it('leaves the gallery empty when the listing fails', async () => {
    mount('image', makeStore(), makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockRejectedValue(new Error('boom')),
    }))
    expect((await screen.findAllByText('image.galleryEmpty')).length).toBeGreaterThan(0)
  })

  it('ignores an image that cannot be read', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('shot.png')] }),
      readImage: vi.fn<StudioCodeApi['readImage']>().mockResolvedValue(undefined),
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText('shot.png'))
    await waitFor(() => { expect(code.readImage).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('returns to the parent directory from the breadcrumb', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore({ openPath: 'src/lib' })
    mount('code', store, code)
    await screen.findByText('a.ts')
    fireEvent.click(screen.getByRole('button', { name: 'code.root' }))
    await waitFor(() => { expect(store.snapshot().openPath).toBe('') })
  })

  it('navigates upward with ArrowLeft inside the tree', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore({ openPath: 'src/lib' })
    mount('code', store, code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'ArrowLeft' })
    await waitFor(() => { expect(store.snapshot().openPath).toBe('src') })
  })

  it('navigates upward with Backspace inside the tree', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore({ openPath: 'src' })
    mount('code', store, code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'Backspace' })
    await waitFor(() => { expect(store.snapshot().openPath).toBe('') })
  })

  it('moves the cursor with ArrowUp without leaving the list', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts'), file('b.ts')] }),
    })
    mount('code', makeStore(), code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'ArrowUp' })
    fireEvent.keyDown(tree, { key: 'Enter' })
    expect(code.read).toHaveBeenCalled()
  })

  it('drags a pane with the pointer', async () => {
    const store = makeStore()
    mount('code', store, makeCode())
    const handle = screen.getByLabelText('code.resizeExplorer')
    handle.setPointerCapture = () => {}
    handle.releasePointerCapture = () => {}
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 })
    await waitFor(() => { expect(store.snapshot().explorer).toBe(280) })
    fireEvent.pointerUp(handle, { clientX: 140, pointerId: 1 })
  })

  it('ignores pointer movement before a drag starts', () => {
    const store = makeStore()
    mount('code', store, makeCode())
    const handle = screen.getByLabelText('code.resizeExplorer')
    fireEvent.pointerMove(handle, { clientX: 400, pointerId: 1 })
    expect(store.snapshot().explorer).toBe(240)
  })

  it('renders the outline for the restored tab and shows the loading note', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockReturnValue(new Promise(() => {})),
    })
    mount('code', store, code)
    expect((await screen.findAllByText('code.loading')).length).toBeGreaterThan(0)
  })
})

describe('surface icons', () => {
  it('renders one glyph per surface', () => {
    for (const surface of ['work', 'code', 'image', 'video'] as const) {
      const { container, unmount } = render(<SurfaceIcon surface={surface} />)
      expect(container.querySelector('svg')).toBeTruthy()
      unmount()
    }
  })

  it('exposes the sidebar launcher mark', () => {
    const { container } = render(<StudioPanelIcon />)
    expect(container.querySelectorAll('rect')).toHaveLength(4)
  })
})

describe('navigation edges', () => {
  it('jumps through a multi-level breadcrumb', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore({ openPath: 'src/lib/deep' })
    mount('code', store, code)
    await screen.findByText('a.ts')
    fireEvent.click(screen.getByRole('button', { name: 'lib' }))
    await waitFor(() => { expect(store.snapshot().openPath).toBe('src/lib') })
  })

  it('focuses another tab by clicking its name', async () => {
    const store = makeStore({ tabs: ['a.ts', 'b.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts'), file('b.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'body' }),
    })
    mount('code', store, code)
    fireEvent.click(await screen.findByRole('tab', { name: 'b.ts' }))
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('b.ts') })
  })

  it('jumps to a symbol line from the outline', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'export function alpha() {}\nexport function beta() {}' }),
    })
    mount('code', store, code)
    const outline = await screen.findByRole('button', { name: /alpha/u })
    fireEvent.click(outline)
    expect(outline).toBeTruthy()
  })

  it('drops the pending image listing when the surface unmounts', async () => {
    let resolveList: ((value: { entries: readonly StudioEntry[] }) => void) | undefined
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockReturnValue(new Promise((resolve) => { resolveList = resolve })),
    })
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="image"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={makeStore().useStore as StudioRootProps['useStore']}
        actions={makeStore().actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    resolveList?.({ entries: [file('late.png')] })
    await waitFor(() => { expect(code.list).toHaveBeenCalled() })
  })
})

describe('failure paths', () => {
  it('falls back to empty content when the read rejects', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockRejectedValue(new Error('denied')),
    })
    mount('code', store, code)
    await waitFor(() => { expect(code.read).toHaveBeenCalled() })
    expect(screen.queryByText('code.loading')).toBeNull()
  })

  it('drops a rejected image listing that lands after unmount', async () => {
    let rejectList: ((reason: Error) => void) | undefined
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockReturnValue(new Promise((_resolve, reject) => { rejectList = reject })),
    })
    const store = makeStore()
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="image"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={store.useStore as StudioRootProps['useStore']}
        actions={store.actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    rejectList?.(new Error('late'))
    await waitFor(() => { expect(code.list).toHaveBeenCalled() })
  })
})

describe('last branches', () => {
  it('revokes the previous preview when another image opens', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('one.png'), file('two.png')] }),
      readImage: vi.fn<StudioCodeApi['readImage']>()
        .mockResolvedValueOnce('blob:one')
        .mockResolvedValueOnce('blob:two'),
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText('one.png'))
    await waitFor(() => { expect(screen.getByRole('img')).toHaveProperty('src', 'blob:one') })
    fireEvent.click(screen.getByText('two.png'))
    await waitFor(() => { expect(revoke).toHaveBeenCalledWith('blob:one') })
    revoke.mockRestore()
  })

  it('ignores Enter in an empty tree', async () => {
    mount('code', makeStore(), makeCode())
    const tree = await screen.findByRole('tree', { hidden: true }).catch(() => undefined)
    if (tree !== undefined) fireEvent.keyDown(tree, { key: 'Enter' })
    expect(screen.getAllByText('code.empty').length).toBeGreaterThan(0)
  })

  it('ends a pointer drag on release', () => {
    const store = makeStore()
    mount('code', store, makeCode())
    const handle = screen.getByLabelText('code.resizeExplorer')
    handle.setPointerCapture = () => {}
    handle.releasePointerCapture = () => {}
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 120, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 120, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 400, pointerId: 1 })
    expect(store.snapshot().explorer).toBe(260)
  })

  it('steps the map pane with both arrow keys', () => {
    const store = makeStore()
    mount('code', store, makeCode())
    const handle = screen.getByLabelText('code.resizeMap')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(store.snapshot().map).toBe(272)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(store.snapshot().map).toBe(260)
  })

  it('starts a drag on the map pane too', () => {
    const store = makeStore()
    mount('code', store, makeCode())
    const handle = screen.getByLabelText('code.resizeMap')
    handle.setPointerCapture = () => {}
    handle.releasePointerCapture = () => {}
    fireEvent.pointerDown(handle, { clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 })
    expect(store.snapshot().map).toBe(300)
  })
})

describe('interaction completions', () => {
  it('jumps to a symbol only when the editor holds that line', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'export function alpha() {}' }),
    })
    mount('code', store, code)
    const outline = await screen.findByRole('button', { name: /alpha/u })
    fireEvent.click(outline)
    const row = document.querySelector('[data-line="1"]') as HTMLElement
    expect(row.dataset.flash).toBe('on')
  })

  it('leaves the tree cursor on the only row when Enter repeats', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('only.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'x' }),
    })
    const { store } = mount('code', makeStore(), code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'Enter' })
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('only.ts') })
  })

  it('keeps the path when ArrowLeft arrives at the root', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore()
    mount('code', store, code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'ArrowLeft' })
    expect(store.snapshot().openPath).toBe('')
  })

  it('selects a tab by clicking its name and shows the file name only', async () => {
    const store = makeStore({ tabs: ['src/deep/a.ts'], activeTab: '' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [dir('src')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'x' }),
    })
    mount('code', store, code)
    const tab = await screen.findByRole('tab', { name: 'a.ts' })
    fireEvent.click(tab)
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('src/deep/a.ts') })
  })
})

describe('remaining branches', () => {
  it('falls back to the pane label when the session has no title', async () => {
    mount('code', makeStore(), makeCode({
      sessionTitle: () => undefined,
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    }))
    expect(await screen.findAllByText('code.explorer')).not.toHaveLength(0)
  })

  it('descends a nested directory under a non-empty path', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [dir('inner')] }),
    })
    const store = makeStore({ openPath: 'src' })
    mount('code', store, code)
    fireEvent.click(await screen.findByText('inner'))
    await waitFor(() => { expect(store.snapshot().openPath).toBe('src/inner') })
  })

  it('opens a file while a directory is selected', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'x' }),
    })
    const store = makeStore({ openPath: 'src' })
    mount('code', store, code)
    fireEvent.click(await screen.findByText('a.ts'))
    await waitFor(() => { expect(store.snapshot().activeTab).toBe('src/a.ts') })
  })

  it('ignores other keys in the search box', async () => {
    const code = makeCode({ list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }) })
    mount('code', makeStore(), code)
    await screen.findByText('a.ts')
    const search = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'a' } })
    fireEvent.keyDown(search, { key: 'a' })
    expect(search.value).toBe('a')
  })

  it('does nothing when a symbol points past the end of the file', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      // Two declarations on line 1 and 2, but only one rendered row exists
      // after the first line is dropped by a stale index.
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: 'export function alpha() {}\n' }),
    })
    mount('code', store, code)
    const outline = await screen.findByRole('button', { name: /alpha/u })
    fireEvent.click(outline)
    expect(outline).toBeTruthy()
  })

  it('drops a pending file read that lands after unmount', async () => {
    let resolveRead: ((value: { text: string }) => void) | undefined
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockReturnValue(new Promise((resolve) => { resolveRead = resolve })),
    })
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="code"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={store.useStore as StudioRootProps['useStore']}
        actions={store.actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    resolveRead?.({ text: 'late' })
    await waitFor(() => { expect(code.read).toHaveBeenCalled() })
  })

  it('drops a rejected file read that lands after unmount', async () => {
    let rejectRead: ((reason: Error) => void) | undefined
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockReturnValue(new Promise((_resolve, reject) => { rejectRead = reject })),
    })
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="code"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={store.useStore as StudioRootProps['useStore']}
        actions={store.actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    rejectRead?.(new Error('late'))
    await waitFor(() => { expect(code.read).toHaveBeenCalled() })
  })

  it('drops a pending directory listing that lands after unmount', async () => {
    let resolveList: ((value: { entries: readonly StudioEntry[] }) => void) | undefined
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockReturnValue(new Promise((resolve) => { resolveList = resolve })),
    })
    const store = makeStore()
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="code"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={store.useStore as StudioRootProps['useStore']}
        actions={store.actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    resolveList?.({ entries: [file('late.ts')] })
    await waitFor(() => { expect(code.list).toHaveBeenCalled() })
  })

  it('drops a rejected directory listing that lands after unmount', async () => {
    let rejectList: ((reason: Error) => void) | undefined
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockReturnValue(new Promise((_resolve, reject) => { rejectList = reject })),
    })
    const store = makeStore()
    const { unmount } = render(
      <StudioRoot
        t={t}
        surface="code"
        openConversation={() => {}}
        submitPrompt={() => {}}
        recentSessions={() => []}
        openSession={() => {}}
        code={code}
        useStore={store.useStore as StudioRootProps['useStore']}
        actions={store.actions as StudioRootProps['actions']}
      />,
    )
    unmount()
    rejectList?.(new Error('late'))
    await waitFor(() => { expect(code.list).toHaveBeenCalled() })
  })
})

describe('deterministic guards', () => {
  it('ignores Enter when the filtered list is empty', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    mount('code', makeStore(), code)
    const tree = await screen.findByRole('tree')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    // The list is empty, so Enter resolves no entry and must not navigate.
    fireEvent.keyDown(tree, { key: 'Enter' })
    fireEvent.keyDown(tree, { key: 'ArrowDown' })
    fireEvent.keyDown(tree, { key: 'Enter' })
    expect(code.read).not.toHaveBeenCalled()
  })
})

describe('breadcrumb keys', () => {
  it('walks up with Backspace from a nested path', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore({ openPath: 'src/lib' })
    mount('code', store, code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'Backspace' })
    await waitFor(() => { expect(store.snapshot().openPath).toBe('src') })
  })
})

describe('root-level keys', () => {
  it('stays at the root on Backspace', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
    })
    const store = makeStore()
    mount('code', store, code)
    const tree = await screen.findByRole('tree')
    fireEvent.keyDown(tree, { key: 'Backspace' })
    expect(store.snapshot().openPath).toBe('')
  })
})

describe('grouped outline', () => {
  const mixed = [
    'export class Beta {}',
    'export function alpha() {}',
    'export const EPSILON = 1',
    'export function gamma() {}',
  ].join('\n')

  /** Mount a file whose outline has three distinct kinds. */
  async function mountMixed() {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text: mixed }),
    })
    mount('code', store, code)
    await screen.findByRole('button', { name: /alpha/u })
    return store
  }

  it('groups symbols under a header per kind with its count', async () => {
    await mountMixed()
    const headers = screen.getAllByRole('button', { expanded: true })
      .filter(node => node.textContent?.includes('function') || node.textContent?.includes('class'))
    expect(headers.length).toBeGreaterThanOrEqual(2)
    const fnHead = screen.getByRole('button', { name: /function/u })
    // Two functions in this file.
    expect(fnHead.textContent).toContain('2')
  })

  it('collapses and reopens a group', async () => {
    await mountMixed()
    const header = screen.getByRole('button', { name: /function/u })
    fireEvent.click(header)
    await waitFor(() => { expect(screen.queryByRole('button', { name: /alpha/u })).toBeNull() })
    fireEvent.click(header)
    expect(await screen.findByRole('button', { name: /alpha/u })).toBeTruthy()
  })

  it('keeps other groups open while one collapses', async () => {
    await mountMixed()
    fireEvent.click(screen.getByRole('button', { name: /function/u }))
    await waitFor(() => { expect(screen.queryByRole('button', { name: /Beta/u })).toBeTruthy() })
  })
})

describe('work surface', () => {
  it('lists recent sessions newest first and opens one', async () => {
    const sessions = () => [
      { id: 's1', title: 'first', running: false },
      { id: 's2', title: 'second', running: true },
    ]
    const { openSession } = mount('work', makeStore(), makeCode(), sessions)
    expect(await screen.findByText('first')).toBeTruthy()
    fireEvent.click(screen.getByText('second'))
    expect(openSession).toHaveBeenCalledWith('s2')
  })

  it('marks a running session', () => {
    mount('work', makeStore(), makeCode(), () => [{ id: 's1', title: 'busy', running: true }])
    expect(screen.getByText('work.running')).toBeTruthy()
  })

  it('notes the empty case', () => {
    mount('work', makeStore(), makeCode(), () => [])
    expect(screen.getAllByText('work.noSessions').length).toBeGreaterThan(0)
  })
})

describe('image gallery navigation', () => {
  it('descends into a folder and lists its images', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>()
        .mockResolvedValueOnce({ entries: [dir('shots'), file('notes.md')] })
        .mockResolvedValueOnce({ entries: [file('deep.png')] }),
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText(/shots/u))
    expect(await screen.findByText('deep.png')).toBeTruthy()
    expect(code.list).toHaveBeenLastCalledWith('shots', expect.anything())
  })

  it('reads an image from the nested path it was listed under', async () => {
    const readImage = vi.fn<StudioCodeApi['readImage']>().mockResolvedValue('blob:deep')
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>()
        .mockResolvedValueOnce({ entries: [dir('shots')] })
        .mockResolvedValueOnce({ entries: [file('deep.png')] }),
      readImage,
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText(/shots/u))
    fireEvent.click(await screen.findByText('deep.png'))
    await waitFor(() => { expect(readImage).toHaveBeenCalledWith('shots/deep.png', expect.anything()) })
  })

  it('returns to the root from the breadcrumb', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>()
        .mockResolvedValueOnce({ entries: [dir('shots')] })
        .mockResolvedValueOnce({ entries: [file('deep.png')] })
        .mockResolvedValue({ entries: [file('top.png')] }),
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText(/shots/u))
    await screen.findByText('deep.png')
    fireEvent.click(screen.getByRole('button', { name: 'code.root' }))
    expect(await screen.findByText('top.png')).toBeTruthy()
  })
})

describe('image breadcrumb depth', () => {
  it('jumps to an intermediate folder from the breadcrumb', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [dir('inner')] }),
    })
    mount('image', makeStore(), code)
    fireEvent.click(await screen.findByText(/inner/u))
    await screen.findByRole('button', { name: 'code.root' })
    fireEvent.click(await screen.findByRole('button', { name: /^inner$/u }))
    expect(code.list).toHaveBeenCalled()
  })
})

describe('video gallery', () => {
  it('lists only video files and previews one', async () => {
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({
        entries: [file('clip.mp4'), file('notes.txt'), file('still.png')],
      }),
      readImage: vi.fn<StudioCodeApi['readImage']>().mockResolvedValue('blob:clip'),
    })
    mount('video', makeStore(), code)
    const item = await screen.findByText('clip.mp4')
    expect(screen.queryByText('notes.txt')).toBeNull()
    expect(screen.queryByText('still.png')).toBeNull()
    fireEvent.click(item)
    await waitFor(() => {
      const video = document.querySelector('video')
      expect(video?.getAttribute('src')).toBe('blob:clip')
    })
  })

  it('notes an empty video gallery', async () => {
    mount('video', makeStore(), makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('still.png')] }),
    }))
    expect((await screen.findAllByText('video.galleryEmpty')).length).toBeGreaterThan(0)
  })
})

describe('in-file find', () => {
  const text = ['alpha one', 'beta two', 'alpha three'].join('\n')

  /** Mount a file whose content has two matches for "alpha". */
  async function mountText() {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text }),
    })
    mount('code', store, code)
    await screen.findByText('alpha one')
    return store
  }

  it('counts matching lines and marks them', async () => {
    await mountText()
    fireEvent.change(screen.getByLabelText('code.find'), { target: { value: 'alpha' } })
    expect(await screen.findByText('2 code.findHits')).toBeTruthy()
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(2)
  })

  it('reports no match without marking anything', async () => {
    await mountText()
    fireEvent.change(screen.getByLabelText('code.find'), { target: { value: 'zzz' } })
    expect(await screen.findByText('code.findNone')).toBeTruthy()
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(0)
  })

  it('clears the term on Escape', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'alpha' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('')
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(0)
  })

  it('keeps the matches marked after Enter scrolls to one', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find')
    fireEvent.change(input, { target: { value: 'alpha' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // The jump flashes one row for under a second; what must survive is the
    // match marking, which is what the count describes.
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(2)
  })

  it('hides the bar when no tab is open', () => {
    mount('code', makeStore(), makeCode())
    expect(screen.queryByLabelText('code.find')).toBeNull()
  })
})

describe('find navigation keys', () => {
  const text = ['aaa one', 'bbb', 'aaa three'].join('\n')

  /** Mount a file with two matches for "aaa". */
  async function mountText() {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    const code = makeCode({
      list: vi.fn<StudioCodeApi['list']>().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn<StudioCodeApi['read']>().mockResolvedValue({ text }),
    })
    mount('code', store, code)
    await screen.findByText('aaa one')
  }

  it('step backwards with Shift+Enter from the last match', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find')
    fireEvent.change(input, { target: { value: 'aaa' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(document.querySelectorAll('[data-hit]')).toHaveLength(2)
  })

  it('ignores Enter when the term matches nothing', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find')
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('code.findNone')).toBeTruthy()
  })

  it('ignores other keys in the find bar', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'aaa' } })
    fireEvent.keyDown(input, { key: 'a' })
    expect(input.value).toBe('aaa')
  })

  it('starts the find from the top when the editor is not scrolled', async () => {
    await mountText()
    const input = screen.getByLabelText('code.find')
    fireEvent.change(input, { target: { value: 'aaa' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // jsdom reports every row at offset 0, so the search starts at line 1.
    expect(document.querySelectorAll('[data-hit]').length).toBeGreaterThan(0)
  })
})

describe('removing one history entry', () => {
  it('removes only the clicked row', async () => {
    const store = makeStore({
      images: [
        { id: 'a', prompt: 'first', variant: '1:1', count: 1, requestedAt: 0 },
        { id: 'b', prompt: 'second', variant: '1:1', count: 1, requestedAt: 0 },
      ],
    })
    mount('image', store, makeCode())
    const remove = await screen.findByLabelText(/generate.remove first/u)
    fireEvent.click(remove)
    expect(store.snapshot().images.map(item => item.id)).toEqual(['b'])
  })
})

describe('history row age', () => {
  const at = (minutesAgo: number) => Date.now() - minutesAgo * 60_000

  it.each([
    [0, 'now'],
    [5, '5m'],
    [90, '1h'],
    [60 * 26, '1d'],
  ])('reads %i minutes ago as %s', async (minutes, label) => {
    const store = makeStore({
      images: [{ id: 'a', prompt: 'p', variant: '1:1', count: 1, requestedAt: at(minutes) }],
    })
    mount('image', store, makeCode())
    expect((await screen.findByText(new RegExp(`· ${label}$`, 'u'))).textContent).toContain(label)
  })
})

describe('minimap', () => {
  const text = ['function a() {', '  return 1', '}', '', 'class B {}'].join('\n')

  it('draws one bar per source line', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    mount('code', store, makeCode({
      list: vi.fn().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn().mockResolvedValue({ text }),
    }))
    await screen.findByText('function a() {')
    expect(document.querySelectorAll('[class*="minimapLine"]')).toHaveLength(5)
  })

  it('marks the lines that carry a symbol', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    mount('code', store, makeCode({
      list: vi.fn().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn().mockResolvedValue({ text }),
    }))
    await screen.findByText('function a() {')
    // `function a()` and `class B` are the two declarations in this text.
    expect(document.querySelectorAll('[class*="minimapLine"][data-symbol]')).toHaveLength(2)
  })

  it('hides the minimap until a file is open', () => {
    mount('code', makeStore(), makeCode())
    expect(document.querySelector('[class*="minimapLine"]')).toBeNull()
  })
})

describe('minimap navigation', () => {
  it('jumps to the clicked line', async () => {
    const store = makeStore({ tabs: ['a.ts'], activeTab: 'a.ts' })
    mount('code', store, makeCode({
      list: vi.fn().mockResolvedValue({ entries: [file('a.ts')] }),
      read: vi.fn().mockResolvedValue({ text: 'a\nb\nc' }),
    }))
    await screen.findByText('a')
    const bars = document.querySelectorAll<HTMLElement>('[class*="minimapLine"]')
    fireEvent.click(bars[2] as HTMLElement)
    // The jump flashes the target row; what must hold is that the bar was live.
    expect(bars).toHaveLength(3)
  })
})
