/**
 * Welcome layout contract, asserted against the stylesheet text.
 * jsdom performs no layout, so the shell's overflow behaviour is pinned here:
 * the defect this guards against was an absolutely positioned message escaping
 * the form card and landing under the action buttons.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('../renderer/welcome.css', import.meta.url)),
  'utf8',
)

/**
 * Read one rule's declarations by selector.
 * @param selector - exact selector text, including the leading dot.
 * @returns the rule body, or undefined when the selector is absent.
 */
function ruleFor(selector: string): string | undefined {
  const index = css.indexOf(`${selector} {`)
  if (index < 0) return undefined
  const end = css.indexOf('}', index)
  return css.slice(index, end)
}

describe('welcome layout', () => {
  it('keeps the key error in flow so it cannot escape the form card', () => {
    const rule = ruleFor('.key-error')
    expect(rule).toBeDefined()
    expect(rule).toContain('position: static')
    expect(rule).not.toContain('position: absolute')
  })

  it('scrolls the column instead of clipping it', () => {
    const rule = ruleFor('.welcome')
    expect(rule).toContain('overflow-y: auto')
    expect(rule).toContain('min-height: 0')
  })

  it('lets the flex column shrink under its content', () => {
    // A missing min-height: 0 on the scrolling child collapses the scroll box
    // and pushes the action row out of the window.
    expect(css).toMatch(/\.welcome\s*\{[^}]*min-height:\s*0/u)
  })
})
