import type { IconProps } from './icons/props.ts'

/** Native viewBox of the brand mark (width and height in user units). */
export const FISH_LOGO_VIEWBOX = { width: 23.16, height: 17.04 }

/**
 * Brand mark geometry: a concentric two-ring mark with a solid core.
 *
 * The name is kept for consumers that compose their own svg around the same
 * geometry (entrance effects, masks), so they keep working unchanged.
 */
export const FISH_LOGO_PATH = [
  // Outer ring
  'M11.58 1.02a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z',
  'm11.58 2.62a5.9 5.9 0 1 1 0 11.8 5.9 5.9 0 0 1 0-11.8Z',
  // Core
  'M11.58 6.72a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',
].join(' ')

/**
 * Render the brand mark.
 * @param props.size - width in px (default 24; height keeps the viewBox ratio).
 * @param props.className - extra class for layout placement.
 * @returns the mark svg (aria-hidden; pair with the wordmark for accessibility).
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={(size * FISH_LOGO_VIEWBOX.height) / FISH_LOGO_VIEWBOX.width}
      className={className}
      viewBox={`0 0 ${FISH_LOGO_VIEWBOX.width} ${FISH_LOGO_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Outer ring solid, inner ring softened, core solid — gives the mark
          depth without gradients that would clash across render contexts. */}
      <path d={FISH_LOGO_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
      <circle cx="11.58" cy="8.52" r="4.5" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
    </svg>
  )
}
