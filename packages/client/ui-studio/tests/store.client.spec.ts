import { describe, expect, it } from 'vitest'
import { studioStore } from '../src/client/store.ts'
import type { StudioGeneration } from '../src/client/StudioRoot.tsx'

const entry = (id: string): StudioGeneration => ({
  id,
  prompt: id,
  variant: '1:1',
  count: 1,
  requestedAt: 0,
})

describe('studioStore', () => {
  it('starts with the defaults the panels assume', () => {
    const instance = studioStore.create()
    expect(instance.getSnapshot()).toEqual({
      explorer: 240,
      map: 260,
      images: [],
      videos: [],
      openPath: '',
      tabs: [],
      activeTab: '',
    })
  })

  it('writes the pane widths', () => {
    const instance = studioStore.create()
    instance.actions.resizeExplorer(300)
    instance.actions.resizeMap(180)
    expect(instance.getSnapshot()).toMatchObject({ explorer: 300, map: 180 })
  })

  it('pushes history newest-first and caps it', () => {
    const instance = studioStore.create()
    for (let index = 0; index < 45; index += 1) instance.actions.pushImage(entry(`i${String(index)}`))
    const images = instance.getSnapshot().images
    expect(images).toHaveLength(40)
    expect(images[0]?.id).toBe('i44')
  })

  it('keeps image and video history apart', () => {
    const instance = studioStore.create()
    instance.actions.pushImage(entry('img'))
    instance.actions.pushVideo(entry('vid'))
    expect(instance.getSnapshot().images.map(item => item.id)).toEqual(['img'])
    expect(instance.getSnapshot().videos.map(item => item.id)).toEqual(['vid'])
  })

  it('clears each history independently', () => {
    const instance = studioStore.create()
    instance.actions.pushImage(entry('img'))
    instance.actions.pushVideo(entry('vid'))
    instance.actions.clearImages()
    expect(instance.getSnapshot().images).toEqual([])
    expect(instance.getSnapshot().videos).toHaveLength(1)
    instance.actions.clearVideos()
    expect(instance.getSnapshot().videos).toEqual([])
  })

  it('ignores an empty tab path', () => {
    const instance = studioStore.create()
    instance.actions.openTab('')
    expect(instance.getSnapshot().tabs).toEqual([])
  })

  it('focuses an already-open tab instead of duplicating it', () => {
    const instance = studioStore.create()
    instance.actions.openTab('a.ts')
    instance.actions.openTab('b.ts')
    instance.actions.openTab('a.ts')
    expect(instance.getSnapshot().tabs).toEqual(['a.ts', 'b.ts'])
    expect(instance.getSnapshot().activeTab).toBe('a.ts')
  })

  it('drops the oldest tab past the cap', () => {
    const instance = studioStore.create()
    for (let index = 0; index < 10; index += 1) instance.actions.openTab(`f${String(index)}.ts`)
    const tabs = instance.getSnapshot().tabs
    expect(tabs).toHaveLength(8)
    expect(tabs[0]).toBe('f2.ts')
  })

  it('closes an inactive tab without moving the selection', () => {
    const instance = studioStore.create()
    instance.actions.openTab('a.ts')
    instance.actions.openTab('b.ts')
    instance.actions.closeTab('a.ts')
    expect(instance.getSnapshot().tabs).toEqual(['b.ts'])
    expect(instance.getSnapshot().activeTab).toBe('b.ts')
  })

  it('closes the active tab and falls back to its neighbour', () => {
    const instance = studioStore.create()
    instance.actions.openTab('a.ts')
    instance.actions.openTab('b.ts')
    instance.actions.closeTab('b.ts')
    expect(instance.getSnapshot().activeTab).toBe('a.ts')
  })

  it('leaves the selection empty when the last tab closes', () => {
    const instance = studioStore.create()
    instance.actions.openTab('a.ts')
    instance.actions.closeTab('a.ts')
    expect(instance.getSnapshot().activeTab).toBe('')
  })

  it('ignores closing a tab that is not open', () => {
    const instance = studioStore.create()
    instance.actions.openTab('a.ts')
    instance.actions.closeTab('ghost.ts')
    expect(instance.getSnapshot().tabs).toEqual(['a.ts'])
  })

  it('records the explorer path', () => {
    const instance = studioStore.create()
    instance.actions.setOpenPath('src/lib')
    expect(instance.getSnapshot().openPath).toBe('src/lib')
  })
})

describe('removing one generation', () => {
  it('drops only the addressed image', () => {
    const instance = studioStore.create()
    instance.actions.pushImage(entry('a'))
    instance.actions.pushImage(entry('b'))
    instance.actions.removeImage('a')
    expect(instance.getSnapshot().images.map(item => item.id)).toEqual(['b'])
  })

  it('leaves the list alone when the id is absent', () => {
    const instance = studioStore.create()
    instance.actions.pushVideo(entry('a'))
    instance.actions.removeVideo('missing')
    expect(instance.getSnapshot().videos).toHaveLength(1)
  })
})
