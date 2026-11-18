// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { StudioRoot, outlineSymbols } from '../src/client/StudioRoot.tsx'
import type { StudioCodeApi, StudioEntry, StudioGeneration, StudioRootProps } from '../src/client/StudioRoot.tsx'

/** Dictionary stand-in: every key resolves to itself, so assertions read the key. */
const t = ((key: string) => key) as unknown as StudioRootProps['t']

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
function mount(surface: StudioRootProps['surface'], store = makeStore(), code = makeCode()) {
  const openConversation = vi.fn()
  const submitPrompt = vi.fn()
  render(
    <StudioRoot
      t={t}
      surface={surface}
      openConversation={openConversation}
      submitPrompt={submitPrompt}
      code={code}
      useStore={store.useStore as StudioRootProps['useStore']}
      actions={store.actions as StudioRootProps['actions']}
    />,
  )
  return { store, code, openConversation, submitPrompt }
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
