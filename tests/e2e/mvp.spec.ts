import { expect, test, type Page } from '@playwright/test'

const PIN = process.env.TEST_PIN ?? ''
const SHOTS = process.env.E2E_SHOTS // carpeta para capturas (opcional)

async function shot(page: Page, name: string, project: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true })
}

async function login(page: Page, who = 'Lara') {
  await page.goto('/entrar')
  await page.getByRole('button', { name: who, exact: true }).click()
  await page.getByLabel('PIN del grupo').fill(PIN)
  await page.getByRole('button', { name: `Entrar como ${who}` }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByText('Bajando el viaje…')).toHaveCount(0, { timeout: 15_000 })
}

test.skip(!PIN, 'Falta TEST_PIN')

test('entrar, ver hoy, cargar un gasto y verlo en balances', async ({ page }, info) => {
  await login(page)
  await expect(page.getByText(/Faltan/)).toBeVisible()
  await expect(page.getByText(/días/).first()).toBeVisible()
  await shot(page, '01-hoy-antes', info.project.name)

  // Simular un día en Niza
  await page.goto('/?fecha=2027-01-06')
  await expect(page.getByRole('heading', { name: /Día 17 de 25/ })).toBeVisible()
  await expect(page.getByText('Hostel Ozz').first()).toBeVisible()
  await expect(page.getByText(/micro|Micro/).first()).toBeVisible()
  await shot(page, '02-hoy-niza', info.project.name)

  // Alta rápida de gasto: monto + categoría + en qué + guardar (pagó yo, partes iguales)
  const t0 = Date.now()
  await page.getByRole('link', { name: 'Gasto' }).first().click()
  await page.getByLabel('¿Cuánto?').fill('36')
  await page.getByLabel('Moneda').selectOption('EUR')
  await page.getByRole('radio', { name: /Comida/ }).click()
  await page.getByLabel(/En qué/).fill('Almuerzo en Niza')
  await shot(page, '03-nuevo-gasto', info.project.name)
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect(page).toHaveURL(/\/gastos$/)
  expect(Date.now() - t0).toBeLessThan(10_000)
  await expect(page.getByText('Almuerzo en Niza').first()).toBeVisible()
  await shot(page, '04-gastos', info.project.name)

  await page.getByRole('link', { name: 'Balances' }).click()
  await expect(page.getByRole('heading', { name: 'EUR' })).toBeVisible()
  await expect(page.getByText(/Para quedar a mano en EUR/)).toBeVisible()
  await shot(page, '05-balances', info.project.name)

  await page.goto('/itinerario')
  await expect(page.getByRole('heading', { name: 'Israel' })).toBeVisible()
  await shot(page, '06-itinerario', info.project.name)
})

test('sin señal: se carga igual y se manda al volver', async ({ page, context }, info) => {
  await login(page, 'Juli')
  // El service worker tiene que haber guardado la app (solo en el build de producción).
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 20_000 })
  // Primera bajada completa del viaje (con señal), como pasa al instalar la app.
  await page.goto('/')
  await expect(page.getByText('Tu balance')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('link', { name: 'Gasto' }).first().click()
  await expect(page.getByLabel('¿Cuánto?')).toBeVisible()
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.getByLabel('¿Cuánto?').fill('12,40')
  await page.getByLabel('Moneda').selectOption('USD')
  await page.getByRole('radio', { name: /Súper/ }).click()
  const desc = `Agua offline ${Date.now()}`
  await page.getByLabel(/En qué/).fill(desc)
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect(page).toHaveURL(/\/gastos$/)
  await expect(page.getByText(desc)).toBeVisible()
  await expect(page.getByText(/Sin señal/)).toBeVisible()
  await shot(page, '07-offline', info.project.name)

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText(/Sin señal|Mandando/)).toHaveCount(0, { timeout: 15_000 })
})

test('dividir mal muestra un error claro', async ({ page }) => {
  await login(page, 'Ivi')
  await page.goto('/gastos/nuevo')
  await page.getByLabel('¿Cuánto?').fill('100')
  await page.getByLabel('Moneda').selectOption('USD')
  await page.getByRole('radio', { name: /Salidas/ }).click()
  await page.getByLabel(/En qué/).fill('Bar')
  await page.getByRole('radio', { name: 'Montos exactos' }).click()
  await page.locator('input[id^="split-"]').nth(0).fill('60')
  await page.locator('input[id^="split-"]').nth(1).fill('30')
  await expect(page.getByRole('alert')).toContainText('Faltan')
  await expect(page.getByRole('button', { name: /Guardar/ })).toBeDisabled()
})
