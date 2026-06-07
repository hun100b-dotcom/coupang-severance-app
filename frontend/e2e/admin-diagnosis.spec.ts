import { test } from '@playwright/test'

test('Admin diagnosis and SQL guide', async ({ page }) => {
  console.log('\n=== ADMIN DIAGNOSIS START ===\n')

  // 1. Check current admin page state
  console.log('[1/3] Checking current admin page...')
  await page.goto('http://localhost:5173/admin')
  await page.waitForTimeout(3000)

  // Count sidebar menus
  const menuCount = await page.locator('aside button').count()
  console.log(`      Sidebar menu count: ${menuCount}`)

  // Check if Settings tab exists
  const settingsExists = await page.locator('text=Settings').count() > 0
  console.log(`      Settings tab exists: ${settingsExists}`)

  // Get current email from sidebar
  const emailText = await page.locator('aside').textContent()
  const emailMatch = emailText?.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  console.log(`      Current logged in: ${emailMatch?.[0] || 'N/A'}`)

  // List all visible menus
  const menus = await page.locator('aside nav button span').allTextContents()
  const menuNames = menus.filter(m => m.trim() && m.length < 20)
  console.log(`      Visible menus: ${menuNames.join(', ')}`)

  // 2. Open Supabase SQL Editor in new tab
  console.log('\n[2/3] Opening Supabase SQL Editor...')
  const supabaseUrl = 'https://supabase.com/dashboard/project/hmjxrqhcwjyfkvlcejfc/editor'
  await page.goto(supabaseUrl)
  await page.waitForTimeout(2000)

  console.log(`      Opened: ${supabaseUrl}`)
  console.log('\n      ==================================================')
  console.log('      PLEASE EXECUTE THIS SQL IN THE EDITOR:')
  console.log('      ==================================================\n')
  console.log(`      DELETE FROM admin_accounts WHERE email = 'catchmarsterdmin@gmail.com';`)
  console.log(`      INSERT INTO admin_accounts (email, role, display_name, is_active)`)
  console.log(`      VALUES ('catchmasterdmin@gmail.com', 'super_admin', 'Super Admin', true);`)
  console.log(`      SELECT * FROM admin_accounts;`)
  console.log('\n      ==================================================\n')

  // Wait for user to execute SQL
  console.log('[3/3] Waiting 30 seconds for SQL execution...')
  console.log('      (Browser will stay open)')
  await page.waitForTimeout(30000)

  console.log('\n=== DIAGNOSIS COMPLETE ===')
  console.log('\nIf you executed the SQL:')
  console.log('  1. Close this browser window')
  console.log('  2. Go back to admin page')
  console.log('  3. Press Ctrl+Shift+R (hard refresh)')
  console.log('  4. Logout and login again')
  console.log('  5. Check Settings tab\n')
})
