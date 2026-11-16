import type { ReactNode } from 'react'
import clsx from 'clsx'
import css from './StateDisplay.module.css'

/** Which state the surface is in. */
export type StateTone = 'empty' | 'error'

/** Props accepted by {@link StateDisplay}. */
export interface StateDisplayProps {
  /** Copy already resolved by the caller's locale dictionary. */
  title: string
  /** Optional supporting line under the title. */
  description?: string | undefined
  /** Optional leading glyph. Omitted, the surface renders title and copy only. */
  icon?: ReactNode | undefined
  /** Optional action row (retry button, call to action). */
  action?: ReactNode | undefined
  /** Distinguishes a neutral absence from a failure. Defaults to `empty`. */
  tone?: StateTone | undefined
  /** Extra class for layout placement inside the host surface. */
  className?: string | undefined
}

/**
 * Shared presentation for an absent or failed region.
 *
 * Copy is a required prop rather than a built-in string: client product text is
 * locale-owned, and this component has no locale seat of its own.
 * @param props - resolved copy, optional glyph and action.
 * @returns the centered state block.
 */
export function StateDisplay({
  title, description, icon, action, tone = 'empty', className,
}: StateDisplayProps) {
  return (
    <div className={clsx(css.root, tone === 'error' && css.error, className)} role="status">
      {icon !== undefined && <span className={css.icon} aria-hidden="true">{icon}</span>}
      <p className={css.title}>{title}</p>
      {description !== undefined && <p className={css.description}>{description}</p>}
      {action !== undefined && <div className={css.action}>{action}</div>}
    </div>
  )
}
