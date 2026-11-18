import { useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './StudioRoot.module.css'

/** The four working surfaces the rail switches between. */
export type StudioSurface = 'work' | 'code' | 'image' | 'video'

/** Owner props of the studio main panel. */
export type StudioRootProps = PropsRuntime<'main'> & PropsLocale<'ui-studio'>

/** Rail entries in display order. */
const SURFACES: readonly StudioSurface[] = ['work', 'code', 'image', 'video']

/**
 * Render the studio surface: a vertical activity rail plus the selected
 * work area.
 * @param props - locale seat.
 * @returns the studio shell.
 */
export function StudioRoot({ t }: StudioRootProps) {
  const [surface, setSurface] = useState<StudioSurface>('work')
  return (
    <div className={css.root}>
      <nav className={css.rail} aria-label={t('rail.aria')}>
        {SURFACES.map(id => (
          <button
            key={id}
            type="button"
            className={css.railButton}
            data-active={surface === id || undefined}
            aria-current={surface === id ? 'page' : undefined}
            onClick={() => { setSurface(id) }}
          >
            <SurfaceGlyph surface={id} />
            <span className={css.railLabel}>{t(`rail.${id}` as 'rail.work')}</span>
          </button>
        ))}
      </nav>
      <section className={css.surface} data-surface={surface}>
        {surface === 'code' ? <CodeSurface t={t} /> : <SurfacePlaceholder id={surface} t={t} />}
      </section>
    </div>
  )
}

/** Surface placeholder for areas whose tools are not mounted yet. */
function SurfacePlaceholder({ id, t }: { id: StudioSurface; t: StudioRootProps['t'] }) {
  const title = t(`${id}.title` as 'work.title')
  const description = t(`${id}.description` as 'work.description')
  return (
    <div className={css.placeholder}>
      <SurfaceGlyph surface={id} large />
      <h2 className={css.placeholderTitle}>{title}</h2>
      <p className={css.placeholderText}>{description}</p>
      <span className={css.badge}>{t('common.soon')}</span>
    </div>
  )
}

/**
 * Code surface: file explorer, editor area and the structure map.
 * The explorer and map are wired to the workspace later; the layout and the
 * map panel exist now so the surface reads as a complete tool.
 */
function CodeSurface({ t }: { t: StudioRootProps['t'] }) {
  return (
    <div className={css.codeGrid}>
      <aside className={css.codeExplorer} aria-label={t('code.explorer')}>
        <p className={css.paneTitle}>{t('code.explorer')}</p>
      </aside>
      <div className={css.codeEditor} />
      <aside className={css.codeMap} aria-label={t('code.map')}>
        <p className={css.paneTitle}>{t('code.map')}</p>
        <p className={css.mapEmpty}>{t('code.map.empty')}</p>
      </aside>
    </div>
  )
}

/** Rail glyph per surface, drawn inline so the rail needs no asset pipeline. */
function SurfaceGlyph({ surface, large = false }: { surface: StudioSurface; large?: boolean }) {
  const size = large ? 40 : 18
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (surface === 'work') {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2.5" {...stroke} /><path d="M3 9h18" {...stroke} /></svg>
  }
  if (surface === 'code') {
    return <svg {...common}><path d="M9 7 4 12l5 5M15 7l5 5-5 5" {...stroke} /></svg>
  }
  if (surface === 'image') {
    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2.5" {...stroke} /><circle cx="9" cy="10" r="1.6" {...stroke} /><path d="m4 17 5-4 4 3 3-2 4 3" {...stroke} /></svg>
  }
  return <svg {...common}><rect x="3" y="5" width="14" height="14" rx="2.5" {...stroke} /><path d="m17 9 4-2v10l-4-2" {...stroke} /></svg>
}

/**
 * Sidebar launcher glyph for the studio panel.
 * @returns a 16px grid mark.
 */
export function StudioPanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
