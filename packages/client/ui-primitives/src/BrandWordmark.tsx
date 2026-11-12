import type { IconProps } from './icons/props.ts'

/** Display options for the brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading mark before the name; defaults to true. */
  includeMark?: boolean | undefined
}

/** Product name rendered by the wordmark. */
const BRAND_NAME = 'Xiaoxiao'

/** Product category badge rendered in a filled pill after the name. */
const BRAND_BADGE = 'HARNESS'

/**
 * Render the brand wordmark: mark, name, and the product-category badge.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading mark.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 182 : 156
  const startX = includeMark ? 34 : 26
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 182 24' : '26 0 156 24'}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && (
        <g transform="translate(4 3)">
          <path
            d="M9 0.63a8.37 8.37 0 1 0 0 16.74 8.37 8.37 0 0 0 0-16.74Zm0 3.31a5.06 5.06 0 1 1 0 10.12 5.06 5.06 0 0 1 0-10.12Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </g>
      )}
      <text
        x={startX}
        y="17"
        fill="currentColor"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="17"
        fontWeight="600"
        letterSpacing="0.1"
      >
        {BRAND_NAME}
      </text>
      {/* Category badge: a filled pill in the current colour with inverted text,
          mirroring how the upstream wordmark marks the product family. */}
      <g transform={`translate(${startX + 78} 5)`}>
        <rect width="52" height="14" rx="3" fill="currentColor" />
        <text
          x="26"
          y="10.4"
          textAnchor="middle"
          fill="var(--dsw-alias-label-primary-inverted, #111)"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.6"
        >
          {BRAND_BADGE}
        </text>
      </g>
    </svg>
  )
}
