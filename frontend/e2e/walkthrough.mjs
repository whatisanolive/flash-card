import { chromium } from 'playwright-core'
// End-to-end walkthrough of every feature in a real browser (uses your installed Chrome).
// Prereqs: both servers running (npm run dev from the project root). Run: npm run test:e2e
// Screenshots are written to frontend/e2e/screenshots/. Test decks it creates are deleted at the end.
import { mkdirSync } from 'node:fs'
const OUT = process.argv[2] ?? 'e2e/screenshots'
mkdirSync(OUT, { recursive: true })
const URL = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
const problems = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`console.${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true })
const step = (s) => console.log('✔', s)

await page.goto(URL)
await page.evaluate(() => localStorage.setItem('recall.theme', '"light"'))
await page.reload()
await page.getByRole('heading', { name: 'Your decks' }).waitFor()
await page.locator('.deck-card').first().waitFor()
step(`dashboard: ${await page.locator('.deck-card').count()} decks`)
await shot('01-dashboard')

// search (debounced, server-side, searches card content)
await page.keyboard.press('/')
await page.keyboard.type('mitochondrion')
await page.waitForFunction(() => document.querySelectorAll('.deck-card').length === 1)
step(`search → ${await page.locator('.deck-card h3').innerText()} | url ${page.url()}`)
await page.getByRole('button', { name: 'Clear search' }).click()
await page.waitForFunction(() => document.querySelectorAll('.deck-card').length === 4)
await page.getByRole('button', { name: /Computer Science/ }).click()
await page.waitForFunction(() => document.querySelectorAll('.deck-card').length === 2)
step('subject filter → 2 decks')
await page.getByRole('button', { name: /^All/ }).click()
await page.getByLabel('Sort decks').selectOption('title')
await page.waitForFunction(() => document.querySelector('.deck-card h3').innerText === 'Cell Biology')
step('sort by title ok')

// create deck with validation
await page.getByRole('link', { name: '+ New deck' }).first().click()
await page.getByRole('button', { name: 'Create deck' }).click()
await page.getByText('Title is required').waitFor()
await page.getByLabel('Deck name').fill('cell biology')
await page.getByRole('button', { name: 'Create deck' }).click()
await page.getByText('You already have a deck with this title').waitFor()
step('client + server (409) validation shown')
await shot('02-deck-form-errors')
await page.getByLabel('Deck name').fill('World Capitals')
await page.getByLabel('Subject (optional)').fill('Geography')
await page.getByLabel('Description (optional)').fill('Countries and their capital cities')
await page.locator('.swatch--blue').click()
await page.getByRole('button', { name: 'Create deck' }).click()
await page.getByRole('heading', { name: 'World Capitals' }).waitFor()
step('deck created → redirected to detail with card form open')

// add cards
const addCard = async (f, b) => {
  await page.getByLabel('Question / term (front)').fill(f)
  await page.getByLabel('Answer / definition (back)').fill(b)
  await page.getByRole('button', { name: 'Add card' }).click()
}
await addCard('Capital of France?', 'capital of france?')
await page.getByText('Answer must be different from the question').waitFor()
step('card validation (same answer) shown')
await addCard('Capital of France?', 'Paris')
await page.locator('.card-row').first().waitFor()
await addCard('Capital of Japan?', 'Tokyo')
await addCard('Capital of Kenya?', 'Nairobi')
await page.waitForFunction(() => document.querySelectorAll('.card-row').length === 3)
await addCard('capital of france?', 'Lyon')
await page.getByText('This question is already in the deck').waitFor()
step('duplicate card rejected by server')
await page.getByRole('button', { name: 'Close' }).click()

// edit card
await page.getByRole('button', { name: 'Edit card 3' }).click()
await page.locator('.card-row--editing textarea').nth(1).fill('Nairobi (Kenya)')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Nairobi (Kenya)').waitFor()
step('card edited')
// search + status filter
await page.getByLabel('Search cards in this deck').fill('tokyo')
await page.waitForFunction(() => document.querySelectorAll('.card-row').length === 1)
await page.getByLabel('Search cards in this deck').fill('')
await shot('03-deck-detail')

// delete a card via confirm dialog
await page.getByRole('button', { name: 'Delete card 2' }).click()
await page.getByRole('alertdialog').waitFor()
await shot('04-confirm')
await page.getByRole('button', { name: 'Delete', exact: true }).click()
await page.waitForFunction(() => document.querySelectorAll('.card-row').length === 2)
step('card deleted via confirm dialog')

// study with keyboard
await page.getByRole('link', { name: /Review 2 due/ }).click()
await page.locator('.flashcard').waitFor()
await shot('05-study-front')
await page.keyboard.press('Space')
await page.locator('.grade-buttons').waitFor()
await page.waitForTimeout(600)
await shot('06-study-back')
await page.keyboard.press('3')
await page.keyboard.press('Space')
await page.getByRole('button', { name: /Again/ }).click()
await page.getByText('Session complete').waitFor()
await shot('07-summary')
step('study session complete: ' + (await page.locator('.study-summary__sub').innerText()))
await page.getByRole('button', { name: /Retry 1 missed/ }).click()
await page.locator('.flashcard').waitFor()
await page.getByRole('link', { name: '← World Capitals' }).click()
await page.getByRole('link', { name: 'Review 0 due →' }).waitFor()
step('back to deck; due count updated to 0 (again → 10 min, good → 1 day)')

// stats
await page.getByRole('link', { name: 'Progress' }).click()
await page.getByRole('heading', { name: 'Your progress' }).waitFor()
await page.locator('.chart__bar').first().waitFor()
await page.locator('.chart__svg rect').nth(13).hover()
await shot('08-stats')
step('stats page rendered')

// dark mode
await page.getByRole('button', { name: /Switch to dark mode/ }).click()
await shot('09-stats-dark')
await page.goto(URL)
await page.locator('.deck-card').first().waitFor()
await shot('10-dashboard-dark')
await page.getByRole('button', { name: /Switch to light mode/ }).click()

// 404s
await page.goto(`${URL}/nowhere`)
await page.getByText('404').waitFor()
await page.goto(`${URL}/decks/does-not-exist`)
await page.getByText('We couldn’t find that deck').waitFor()
step('404 route + missing deck handled')

// mobile
await page.setViewportSize({ width: 375, height: 800 })
await page.goto(URL)
await page.locator('.deck-card').first().waitFor()
await shot('11-mobile-dashboard')
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
step(`mobile horizontal overflow: ${overflow}`)
await page.locator('.deck-card__link').first().click()
await page.locator('.card-row').first().waitFor()
await shot('12-mobile-detail')
await page.getByRole('link', { name: 'Study all' }).click()
await page.locator('.flashcard').click()
await page.locator('.grade-buttons').waitFor()
await page.waitForTimeout(600)
await shot('13-mobile-study')

// import a deck from JSON (and reject a bad file)
const fs = await import('node:fs')
fs.writeFileSync(OUT + '/good.json', JSON.stringify({ title: 'Imported Deck', subject: 'Test', cards: [{ front: 'One?', back: '1' }, { front: 'Two?', back: '2' }] }))
fs.writeFileSync(OUT + '/bad.json', '{ nope')
await page.setViewportSize({ width: 1280, height: 860 })
await page.goto(URL)
await page.locator('.deck-card').first().waitFor()
await page.locator('input[type=file]').setInputFiles(OUT + '/bad.json')
await page.getByText('That file is not valid JSON').waitFor()
await page.locator('input[type=file]').setInputFiles(OUT + '/good.json')
await page.getByText('Imported “Imported Deck” with 2 cards').waitFor()
step('JSON import (valid + invalid) works')
await page.getByRole('button', { name: 'Delete Imported Deck' }).click()
await page.getByRole('button', { name: 'Delete deck' }).click()
await page.waitForFunction(() => ![...document.querySelectorAll('.deck-card h3')].some((h) => h.innerText === 'Imported Deck'))

// delete the test deck to leave data clean
await page.setViewportSize({ width: 1280, height: 860 })
await page.goto(URL)
await page.getByRole('button', { name: 'Delete World Capitals' }).click()
await page.getByRole('button', { name: 'Delete deck' }).click()
await page.waitForFunction(() => document.querySelectorAll('.deck-card').length === 4)
step('deck deleted from dashboard')

const real = problems.filter((p) => !/status of (404|409)/.test(p)) // 404/409s are triggered on purpose above
console.log('\nConsole problems:', real.length ? real.join('\n') : 'none')
if (real.length) process.exitCode = 1
await browser.close()
