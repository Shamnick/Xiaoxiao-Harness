import { defineStore } from '@deepseek-ai/dsh-client-store'
import type { StudioGeneration } from './StudioRoot.tsx'

/** History kept per generation mode; older requests drop off the end. */
const HISTORY_LIMIT = 40

/**
 * Studio state the panels remember.
 *
 * `explorer` and `map` are the code surface's pane widths; the two histories
 * record what the reader asked for. Persisted by name so a reload restores
 * the layout, and components write through the declared actions only.
 */
export const studioStore = defineStore({
  init: () => ({
    explorer: 240,
    map: 260,
    images: [] as readonly StudioGeneration[],
    videos: [] as readonly StudioGeneration[],
    /** Server-relative directory the code explorer is showing. */
    openPath: '',
    /** Open file tabs, in the order the reader opened them. */
    tabs: [] as readonly string[],
    /** Which tab the editor is showing. */
    activeTab: '',
  }),
  persist: 'ui-studio.state',
  actions: {
    resizeExplorer: (state, value: number) => { state.explorer = value },
    resizeMap: (state, value: number) => { state.map = value },
    pushImage: (state, entry: StudioGeneration) => {
      state.images = [entry, ...state.images].slice(0, HISTORY_LIMIT)
    },
    pushVideo: (state, entry: StudioGeneration) => {
      state.videos = [entry, ...state.videos].slice(0, HISTORY_LIMIT)
    },
    removeImage: (state, id: string) => { state.images = state.images.filter(entry => entry.id !== id) },
    removeVideo: (state, id: string) => { state.videos = state.videos.filter(entry => entry.id !== id) },
    clearImages: (state) => { state.images = [] },
    clearVideos: (state) => { state.videos = [] },
    setOpenPath: (state, value: string) => { state.openPath = value },
    /** Open a file in a tab, or focus its existing tab. */
    openTab: (state, value: string) => {
      if (value === '') return
      if (!state.tabs.includes(value)) state.tabs = [...state.tabs, value].slice(-8)
      state.activeTab = value
    },
    closeTab: (state, value: string) => {
      const index = state.tabs.indexOf(value)
      if (index < 0) return
      const next = state.tabs.filter(tab => tab !== value)
      state.tabs = next
      if (state.activeTab === value) {
        state.activeTab = next[Math.min(index, next.length - 1)] ?? ''
      }
    },
  },
})
