import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './CommandPalette.module.css'

/** One selectable row in the palette. */
export interface CommandPaletteEntry {
  /** Stable identity for keys and selection tracking. */
  id: string
  /** Primary label shown on the row. */
  title: string
  /** Optional secondary line (workspace, relative time). */
  detail?: string
}

/** Props accepted by the palette. */
export interface CommandPaletteProps {
  /** Rows to search; the owner decides ordering (usually newest first). */
  entries: readonly CommandPaletteEntry[]
  /** Called when a row is activated by click or Enter. */
  onSelect: (id: string) => void
  /** Localized placeholder for the search field. */
  placeholder: string
  /** Localized empty-state copy shown when nothing matches. */
  emptyLabel: string
  /** Localized dialog title. */
  title: string
  /** Localized accessible close label. */
  closeLabel: string
}

/**
 * Command palette: a modal list of recent Sessions with fuzzy-ish substring
 * filtering and full keyboard control.
 *
 * Owns its own open state and the ⌘K / Ctrl+K binding. Kept self-contained so
 * the host sidebar does not have to thread palette state through its tree.
 * @param props - rows, selection callback, and localized copy.
 * @returns the palette (renders nothing while closed).
 */
export function CommandPalette({
  entries, onSelect, placeholder, emptyLabel, title, closeLabel,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  // ⌘K / Ctrl+K toggles. Skipped while a transcript field owns the keystroke so
  // the binding never steals an editing key from the composer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setOpen(current => !current)
      setQuery('')
      setActive(0)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return entries
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(needle)
      || (entry.detail ?? '').toLowerCase().includes(needle))
  }, [entries, query])

  // Keep the selection inside the filtered range as the query narrows.
  useEffect(() => {
    setActive(current => (current >= matches.length ? 0 : current))
  }, [matches.length])

  const activate = useCallback((index: number) => {
    const entry = matches[index]
    if (entry === undefined) return
    onSelect(entry.id)
    close()
  }, [matches, onSelect, close])

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(current => (matches.length === 0 ? 0 : (current + 1) % matches.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(current => (matches.length === 0 ? 0 : (current - 1 + matches.length) % matches.length))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      activate(active)
    }
  }, [matches.length, active, activate])

  return (
    <Modal open={open} onClose={close} title={title} closeLabel={closeLabel} contentClassName={css.surface ?? ''}>
      <div className={css.root} onKeyDown={onKeyDown}>
        <input
          ref={input}
          className={css.input}
          value={query}
          placeholder={placeholder}
          autoFocus
          aria-label={placeholder}
          onChange={(event) => { setQuery(event.target.value); setActive(0) }}
        />
        <ul className={css.list} role="listbox" aria-label={title}>
          {matches.length === 0 && <li className={css.empty}>{emptyLabel}</li>}
          {matches.map((entry, index) => (
            <li key={entry.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? `${css.row} ${css.rowActive}` : css.row}
                onPointerEnter={() => { setActive(index) }}
                onClick={() => { activate(index) }}
              >
                <span className={css.rowTitle}>{entry.title}</span>
                {entry.detail !== undefined && <span className={css.rowDetail}>{entry.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
