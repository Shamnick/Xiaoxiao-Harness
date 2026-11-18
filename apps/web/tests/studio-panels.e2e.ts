/**
 * Every studio working surface must be reachable from the sidebar.
 * This drives the real composition in Chromium: a panel id that never
 * registered, or a launcher pointing at the wrong key, fails here and
 * nowhere else — the unit suites only prove the registration calls happen.
 */
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'

/** The four surfaces the studio registers, in sidebar order. */
const SURFACES = ['work', 'code', 'image', 'video'] as const

it('exposes every studio surface on the sidebar', async () => {
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
  // The sidebar panel list is the only place these launchers can appear.
  await page.waitForSelector('[aria-label]', { timeout: 60_000 })

  for (const surface of SURFACES) {
    const launcher = page.getByRole('button', { name: new RegExp(surface, 'iu') })
    expect(await launcher.count(), `${surface} launcher missing from the sidebar`).toBeGreaterThan(0)
  }
})
