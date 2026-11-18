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
    clearImages: (state) => { state.images = [] },
    clearVideos: (state) => { state.videos = [] },
  },
})
