import { test, expect } from '@playwright/test'

test('Final admin check after SQL execution', async ({ page }) => {
  console.log('\n=== FINAL ADMIN CHECK ===\n')

  // Step 1: Go to admin page
  console.log('[1/4] Opening admin page...')
  await page.goto('http://localhost:5173/admin')
  await page.waitForTimeout(3000)

  // Step 2: Count menus
  const menuCount = await page.locator('aside button').count()
  console.log(`[2/4] Menu count: ${menuCount}`)

  // Step 3: List all menus
  const menuTexts = await page.locator('aside button').allTextContents()
  console.log('[3/4] Menu list:')
  menuTexts.forEach((text, i) => {
    const cleaned = text.trim().split('\n')[0]
    if (cleaned) console.log(`      ${i + 1}. ${cleaned}`)
  })

  // Step 4: Check Settings tab
  const settingsButton = page.locator('aside button:has-text("Settings")')
  const settingsExists = await settingsButton.count() > 0
  console.log(`[4/4] Settings tab exists: ${settingsExists}`)

  if (settingsExists) {
    console.log('\n✅ SUCCESS! Settings tab is visible!')
    console.log('   - Clicking Settings tab...')
    await settingsButton.click()
    await page.waitForTimeout(2000)

    // Take screenshot
    await page.screenshot({ path: 'admin-settings-success.png', fullPage: true })
    console.log('   - Screenshot saved: admin-settings-success.png')
  } else {
    console.log('\n❌ FAILED! Settings tab NOT visible')
    console.log('   Possible reasons:')
    console.log('   1. Need to logout and login again')
    console.log('   2. Need hard refresh (Ctrl+Shift+R)')
    console.log('   3. DB data not loaded yet')

    await page.screenshot({ path: 'admin-settings-failed.png', fullPage: true })
    console.log('   - Screenshot saved: admin-settings-failed.png')
  }

  // Check role badge
  const roleText = await page.locator('aside').textContent()
  console.log(`\nCurrent page state: ${roleText?.includes('Super Admin') ? '✅ Super Admin' : '❌ Not super admin'}`)

  console.log('\n=== CHECK COMPLETE ===\n')
})
