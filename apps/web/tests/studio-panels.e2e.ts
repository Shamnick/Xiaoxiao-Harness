/**
 * Every studio working surface must be reachable from the sidebar, and each
 * one must render its own pane once selected.
 *
 * This drives the real composition in Chromium: a panel id that never
 * registered, a launcher pointing at the wrong key, or a pane that throws on
 * mount fails here. The unit suites prove the registration calls happen; this
 * proves the reader can see the result.
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'

/** The four surfaces the studio registers, in sidebar order. */
const SURFACES = ['work', 'code', 'image', 'video'] as const

it('renders every studio surface from the sidebar', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  onTestFinished(() => scaffold.close())
  // A file the code surface can list once a session's workspace is known.
  await writeFile(join(scaffold.workspaceCwd, 'README.md'), '# Studio fixture\n')

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
