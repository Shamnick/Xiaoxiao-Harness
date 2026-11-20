/**
 * Every studio working surface must be reachable from the sidebar, and each
 * one must render its own pane once selected.
 *
 * This drives the real composition in Chromium: a panel id that never
 * registered, a launcher pointing at the wrong key, or a pane that throws on
 * mount fails here. The unit suites prove the registration calls happen; this
 * proves the reader can see the result.
 */
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'

/** The four surfaces the studio registers, in sidebar order. */
const SURFACES = ['work', 'code', 'image', 'video'] as const

it('renders every studio surface from the sidebar', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const tripwire = watchConsole(page)
  onTestFinished(() => {
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })

  await page.goto(scaffold.authenticatedUrl)
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })

  for (const surface of SURFACES) {
    const launcher = page.getByRole('button', { name: new RegExp(surface, 'iu') }).first()
    expect(await launcher.count(), `${surface} launcher missing from the sidebar`).toBeGreaterThan(0)
    await launcher.click()
    // Each surface marks its pane with the surface name, so a launcher that
    // opens the wrong panel is caught here rather than by eye.
    const pane = page.locator(`[data-surface="${surface}"]`)
    await expect.poll(() => pane.count(), { timeout: 30_000 }).toBeGreaterThan(0)
    await expect.poll(() => pane.isVisible(), { timeout: 30_000 }).toBe(true)
  }
})

it('mounts the code surface with its three panes and the explorer search', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const tripwire = watchConsole(page)
  onTestFinished(() => { expect(tripwire.pageErrors).toEqual([]) })

  await page.goto(scaffold.authenticatedUrl)
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })
  await page.getByRole('button', { name: /code/iu }).first().click()

  const code = page.locator('[data-surface="code"]')
  await expect.poll(() => code.isVisible(), { timeout: 30_000 }).toBe(true)

  // Two side panes carry accessible names from the dictionary, so assert the
  // structure instead of a key: the grid holds explorer, editor, and map.
  expect(await code.locator('aside').count(), 'expected two side panes').toBe(2)
  // The name filter and the two resize handles are the surface's controls.
  expect(await code.getByRole('searchbox').count(), 'explorer search missing').toBeGreaterThan(0)
  expect(await page.getByRole('separator').count(), 'expected two pane handles').toBe(2)
})

it('reaches the code surface by keyboard alone', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })

  // A launcher that is not a real button cannot be reached without a mouse.
  const launcher = page.getByRole('button', { name: /code/iu }).first()
  await launcher.focus()
  expect(await launcher.evaluate(node => node === document.activeElement)).toBe(true)
  await page.keyboard.press('Enter')
  await expect.poll(
    () => page.locator('[data-surface="code"]').isVisible(),
    { timeout: 30_000 },
  ).toBe(true)

  // Tab must stay inside the document and land on an operable element.
  await page.keyboard.press('Tab')
  const landed = await page.evaluate(() => document.activeElement?.tagName ?? '')
  expect(landed).toBe('BUTTON')
}, 180_000)

it('places its launchers inside the sidebar panel list', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })

  // The four launchers must share one ancestor: that container is the panel
  // list this plugin registered into. If they were scattered, the registration
  // went somewhere else and the desktop sidebar would not show them.
  const report = await page.evaluate(() => {
    const names = ['work', 'code', 'image', 'video']
    const found = names.map((name) => {
      const all = Array.from(document.querySelectorAll('button'))
        .filter(b => (b.textContent || '').trim().toLowerCase() === name)
      const node = all[0]
      if (node === undefined) return { name, found: false, parent: '' }
      return { name, found: true, parent: node.parentElement?.parentElement?.className ?? '' }
    })
    const parents = new Set(found.filter(f => f.found).map(f => f.parent))
    return { found, distinctParents: parents.size }
  })
  expect(report.found.every(f => f.found)).toBe(true)
  expect(report.distinctParents).toBe(1)
}, 180_000)

it('submits inside the surface without leaving it', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })

  await page.locator('button:has-text("Image")').first().click()
  await page.waitForTimeout(1200)

  const textarea = page.locator('textarea').first()
  await textarea.fill('a red boat at dusk')
  await page.locator('button:has-text("Generate image")').first().click()
  await page.waitForTimeout(2500)

  // The work happens here: the surface stays selected and the draft clears.
  expect(await page.locator('[data-surface]').first().getAttribute('data-surface')).toBe('image')
  expect(await textarea.inputValue()).toBe('')
}, 180_000)
