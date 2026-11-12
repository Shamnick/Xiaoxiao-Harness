import type { IconProps } from './icons/props.ts'

/** Native viewBox of {@link FISH_LOGO_PATH} (width and height in user units). */
export const FISH_LOGO_VIEWBOX = { width: 23.16, height: 17.04 }

/**
 * Brand mark path data: a ring with a solid core, drawn inside the historical
 * 23.16 x 17.04 viewBox so consumers composing their own svg (entrance effects,
 * masks) keep working unchanged.
 */
export const FISH_LOGO_PATH = [
  'M11.58 0.77a8.52 8.52 0 1 0 0 17.04 8.52 8.52 0 0 0 0-17.04Z',
  'm11.58 4.14a5.15 5.15 0 1 1 0 10.3 5.15 5.15 0 0 1 0-10.3Z',
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
      <path d={FISH_LOGO_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  )
}
