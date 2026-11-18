/**
 * Studio surfaces, browser half.
 *
 * Registers one keyed `main` panel per working surface — Work, Code, Image
 * and Video — plus one sidebar launcher each. The rail lives in the sidebar
 * rather than inside a panel, so the four modes stay reachable from any view.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the renderer-owned slots service and the locale seat types.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the locale plugin's Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the `main` keyed slot declaration.
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the sidebar panel-list slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the ctx.sessions service merge.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the generated Client Remote face.
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import { studioStore } from './store.ts'
import type { StudioKey } from './locales.ts'
import type { StudioCodeApi, StudioSurface } from './StudioRoot.tsx'
import { SurfaceIcon, StudioRoot } from './StudioRoot.tsx'
import { zh, en, ja, es, fr, de, ru, pt } from './locales.ts'

/** Plugin name used by the client assembler. */
export const name = 'client-ui-studio'

/** Required services: slots, dictionaries, layout navigation, Sessions and file reads. */
export const inject = ['slots', 'locale', 'layout', 'sessions', 'remote', 'remote.workspaceFiles']

const NS = 'ui-studio'

/** Keyed main-panel id per surface. */
export const PANEL_IDS: Readonly<Record<StudioSurface, MainPanelId>> = {
  work: 'studio.work' as MainPanelId,
  code: 'studio.code' as MainPanelId,
  image: 'studio.image' as MainPanelId,
  video: 'studio.video' as MainPanelId,
}

/** Sidebar order: Work first, then the three tool surfaces. */
const ORDER: Readonly<Record<StudioSurface, number>> = { work: -10, code: -9, image: -8, video: -7 }
const SURFACES: readonly StudioSurface[] = ['work', 'code', 'image', 'video']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Studio surface labels and copy. */
    'ui-studio': StudioKey
  }
}

/**
 * Bind the code surface to the most recently updated Session's workspace.
 * The Remote resolves a Session id into its workspace root on the Host, so this
 * face needs no path of its own.
 * @param ctx - Client root context.
 * @returns the file access the code surface performs.
 */
function createCodeApi(ctx: ClientContext): StudioCodeApi {
  const face: Pick<ClientRemote['workspaceFiles'], 'list' | 'read'> = ctx.remote.workspaceFiles
  const activeSession = () => {
    const rows = Object.values(ctx.sessions.list.getSnapshot().byId)
      .filter(row => row.origin !== 'subagent' && row.cwd !== undefined)
    return rows.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }
  return {
    sessionTitle: () => activeSession()?.displayTitle,
    list: async (path, signal) => {
      const session = activeSession()
      if (session === undefined) return { entries: [] }
      const result = await face.list(session.id, path, signal)
      return result.ok ? { entries: result.value.entries } : { entries: [] }
    },
    read: async (path, signal) => {
      const session = activeSession()
      if (session === undefined) return { text: '' }
      const result = await face.read(session.id, path, {}, signal)
      if (!result.ok) return { text: '' }
      return { text: result.value.text }
    },
  }
}

/**
 * Register the studio surfaces.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }),
    'ui-studio: dictionaries',
  )
  const t = ctx.locale.bind(NS)
  const code = createCodeApi(ctx)
  for (const surface of SURFACES) {
    const panel = PANEL_IDS[surface]
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: panel,
      locale: NS,
      store: studioStore,
      inject: () => ({
        surface,
        code,
        // `conversation` is the layout's default entry rather than a keyed panel,
        // so returning to it means clearing the selected panel.
        openConversation: () => { ctx.layout.selectPanel(null) },
        // Generation surfaces record the request and hand the reader to the
        // conversation, which owns submission; the studio never fabricates a result.
        submitPrompt: () => { ctx.layout.selectPanel(null) },
      }),
    }, StudioRoot))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: panel,
      order: ORDER[surface],
      locale: NS,
      label: () => t(`rail.${surface}`),
    }, () => SurfaceIcon({ surface })))
  }
}
