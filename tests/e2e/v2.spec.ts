import { expect, test, type Page } from '@playwright/test'

const PIN = process.env.TEST_PIN ?? ''
const SHOTS = process.env.E2E_SHOTS

async function shot(page: Page, name: string, project: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true })
}

async function login(page: Page, who: string) {
  await page.goto('/entrar')
  await page.getByRole('button', { name: who, exact: true }).click()
  await page.getByLabel('PIN del grupo').fill(PIN)
  await page.getByRole('button', { name: `Entrar como ${who}` }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByText('Tu balance')).toBeVisible({ timeout: 15_000 })
}

test.skip(!PIN, 'Falta TEST_PIN')

test('planes: ideas de Niza, votar y pasar a un día', async ({ page }, info) => {
  await login(page, 'Solcha')
  await page.goto('/planes')
  await expect(page.getByText('Saint-Tropez')).toBeVisible()
  await expect(page.getByText('Día 5')).toBeVisible()
  await shot(page, '10-planes', info.project.name)

  // Votar entre las ideas del "Día 5" (Menton / Mónaco)
  const card = page.locator('.card', { has: page.getByText('Día 5', { exact: true }) })
  await card.getByRole('button', { name: /Votar/ }).click()
  const q = `Día 5 test ${Date.now()}`
  await page.getByLabel('Pregunta').fill(q)
  await page.getByRole('button', { name: 'Crear votación' }).click()
  const poll = page.locator('section.card', { hasText: q })
  await expect(poll).toBeVisible()
  await poll.getByRole('button', { name: /Mónaco/ }).click()
  await expect(poll.getByText('tu voto')).toBeVisible()
  await expect(poll.getByText(/1 de 6 votaron/)).toBeVisible()
  await shot(page, '11-votacion', info.project.name)

  // Pasar una idea a un día
  await page.getByRole('tab', { name: 'Ideas' }).click()
  await page.getByRole('button', { name: 'Pasar Èze a un día' }).click()
  await page.getByRole('radio', { name: /8 ene/ }).click()
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByText(/quedó para el/)).toBeVisible()
  await page.goto('/itinerario/2027-01-08')
  await expect(page.getByText('Èze')).toBeVisible()
})

test('listas, info útil y diario', async ({ page }, info) => {
  await login(page, 'Wile')
  await page.goto('/listas?l=documentos')
  const item = `Pasaporte ${Date.now()}`
  await page.getByLabel('Nuevo ítem').fill(item)
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: `${item}: pendiente` }).click()
  await expect(page.getByRole('button', { name: `${item}: listo` })).toBeVisible()
  await shot(page, '12-listas', info.project.name)

  await page.goto('/info')
  await expect(page.getByText('Shabat').first()).toBeVisible()
  await expect(page.getByText(/sin verificar/)).toBeVisible()
  await shot(page, '13-info', info.project.name)

  const run = Date.now()
  await page.goto('/diario/2026-12-21')
  await page.getByLabel(/La frase del día/).fill(`¡Arrancamos! ${run}`)
  await page.getByRole('button', { name: 'Guardar frase' }).click()
  await expect(page.getByText(/Frase guardada/)).toBeVisible()
  await page.getByLabel(/Tu momento del día/).fill(`Despegar con las chicas ${run}`)
  await page.getByRole('button', { name: 'Guardar mi momento' }).click()
  await expect(page.getByText(/Tu momento quedó guardado/)).toBeVisible()
  await page.goto('/diario?fecha=2026-12-22')
  await expect(page.getByText(`“¡Arrancamos! ${run}”`)).toBeVisible()
  await expect(page.getByText(`Despegar con las chicas ${run}`)).toBeVisible()
  await shot(page, '14-diario', info.project.name)
})

test('wrapped', async ({ page }, info) => {
  await login(page, 'Meli')
  await page.goto('/wrapped')
  await expect(page.getByText('25 días. 6 amigas.')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText(/países, .* ciudades/)).toBeVisible()
  await shot(page, '15-wrapped-lugares', info.project.name)
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText(/km/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText(/gastados entre todas/)).toBeVisible()
  await shot(page, '16-wrapped-gasto', info.project.name)
})
