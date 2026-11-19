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
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the sidebar panel-list slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the ctx.uiWorkspace navigation capability.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
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
export const inject = ['slots', 'locale', 'layout', 'sessions', 'uiWorkspace', 'remote', 'remote.workspaceFiles']

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

/**
 * Agent preset each surface opens its sessions with. A working mode is a
 * different set of instructions, not just a different colour: coding needs the
 * file tools, image work needs the generator, and neither should inherit the
 * other's prompt. `work` keeps the composition default by leaving it undefined.
 */
const PRESETS: Readonly<Record<StudioSurface, string | undefined>> = {
  work: undefined,
  code: 'coding',
  image: 'image',
  video: 'video',
}
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
  const face: Pick<ClientRemote['workspaceFiles'], 'list' | 'read' | 'readBytes'> = ctx.remote.workspaceFiles
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
    readImage: async (path, signal) => {
      const session = activeSession()
      if (session === undefined) return undefined
      const result = await face.readBytes(session.id, path, {}, signal)
      if (!result.ok) return undefined
      // The Host hands back raw bytes; the surface owns the object URL lifetime.
      const blob = new Blob([result.value.data])
      return URL.createObjectURL(blob)
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
        // The work surface lists what this mode was last in, newest first.
        // The mode owns its list: sessions opened under another preset belong
        // to that other working area, not this one.
        //
        // `agentPreset` arrives through the projection summary, so no extra
        // round trip is needed; `work` carries the default composition and
        // therefore matches sessions with no recorded preset.
        recentSessions: () => Object.values(ctx.sessions.list.getSnapshot().byId)
          .filter(row => row.origin !== 'subagent' && row.displayTitle !== '')
          .filter(row => (row.projectionValues?.agentPreset ?? undefined) === PRESETS[surface])
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20)
          .map(row => ({ id: String(row.id), title: row.displayTitle, running: row.running })),
        openSession: (id: string) => { ctx.layout.selectPanel(null); ctx.uiWorkspace.openSession(id as SessionId) },
        // Open a fresh session under this surface's preset, then hand the
        // reader to the conversation — the working mode is what the preset
        // carries, and the conversation is where the work happens.
        newSession: () => {
          const preset = PRESETS[surface]
          // The model this area last ran: read from its most recent session's
          // projection rather than a private copy, so a change made in the
          // composer carries over without the studio watching it separately.
          const remembered = Object.values(ctx.sessions.list.getSnapshot().byId)
            .filter(row => row.origin !== 'subagent'
              && (row.projectionValues?.agentPreset ?? undefined) === PRESETS[surface])
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(row => row.projectionValues?.modelSelection?.lastUsed)
            .find(selection => selection !== null && selection !== undefined)
          void ctx.sessions.create(preset === undefined ? {} : { agentPreset: preset })
            .then(async (id) => {
              // The model this working area last used follows it into the new
              // session: a palette of models is only useful if the choice
              // survives the session it was made in.
              if (remembered !== undefined) {
                const directories = ctx.get('modelDirectories')
                await directories?.directoryFor(id).select(remembered).catch(() => undefined)
              }
              ctx.layout.selectPanel(null)
              ctx.uiWorkspace.openSession(id as SessionId)
            })
            .catch(() => undefined)
        },
        // Workspace rows give the work surface something to switch between;
        // sessions alone leave it with no project context.
        // The registry is a separate service; a composition without it keeps
        // the panel working and simply shows no projects.
        workspaces: () => {
          const registry = ctx.get('workspaces')
          if (registry === undefined) return []
          return registry.list.getSnapshot().items.map(row => ({
            workspaceId: String(row.workspaceId),
            title: row.title,
            path: row.path,
            sessionIds: row.sessionIds.map(id => String(id)),
          }))
        },
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
