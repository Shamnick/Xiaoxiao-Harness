import { defineStore } from '@deepseek-ai/dsh-client-store'

/**
 * Panel widths the code surface remembers.
 *
 * Persisted by name so a reload restores the reader's layout; the store owns
 * the only mutable copy, and components write through its declared actions.
 */
export const studioStore = defineStore({
  init: () => ({ explorer: 240, map: 260 }),
  persist: 'ui-studio.panel-widths',
  actions: {
    resizeExplorer: (state, value: number) => { state.explorer = value },
    resizeMap: (state, value: number) => { state.map = value },
  },
})
