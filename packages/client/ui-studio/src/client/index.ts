/**
 * Studio surface, browser half.
 *
 * Registers one keyed `main` panel that hosts four working surfaces behind a
 * vertical activity rail: Work, Code, Image and Video. Each surface owns its
 * own layout; the rail switches between them without leaving the panel.
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
// Type-only: pulls the ctx.uiWorkspace directory capability.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the ctx.workspaces service merge.
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { StudioKey } from './locales.ts'
import { StudioPanelIcon, StudioRoot } from './StudioRoot.tsx'
import { zh, en, ja, es, fr, de, ru, pt } from './locales.ts'

/** Plugin name used by the client assembler. */
export const name = 'client-ui-studio'

/** Required services: the slot registry and the locale dictionaries. */
export const inject = ['slots', 'locale', 'layout', 'uiWorkspace', 'workspaces']

const NS = 'ui-studio'
/** Keyed main-panel id; the sidebar lists main entries by this key. */
export const PANEL_ID = 'studio' as MainPanelId

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Studio rail labels and surface copy. */
    'ui-studio': StudioKey
  }
}

/**
 * Register the studio panel.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }),
    'ui-studio: dictionaries',
  )
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    // `conversation` is the layout's default entry rather than a keyed panel,
    // so returning to it means clearing the selected panel.
    inject: () => ({
      openConversation: () => { ctx.layout.selectPanel(null) },
      listDirectory: (path?: string, signal?: AbortSignal) => ctx.uiWorkspace.listDirectory(path, signal),
      // The studio edits one Workspace: the most recently updated row.
      workspacePath: ctx.workspaces.list.getSnapshot().items
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.path,
    }),
  }, StudioRoot))
  // Sidebar entry: a main panel with no launcher is unreachable.
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 0,
    locale: NS,
    label: () => t('rail.aria'),
  }, StudioPanelIcon))
}
