// Seeds the database with starter decks (the same ones FA-1 shipped with, plus more)
// and ~10 days of simulated study history so the Stats page has something to show.
// Run with: npm run db:seed   (or npm run db:reset to wipe first)
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { schedule } from '../src/lib/srs.js'

const prisma = new PrismaClient()
const DAY_MS = 24 * 60 * 60 * 1000

const decks = [
  {
    title: 'React Fundamentals',
    subject: 'Computer Science',
    description: 'Core ideas behind components, props, state and rendering.',
    swatch: 'green',
    cards: [
      ['What is JSX?', 'A syntax extension for JavaScript that lets you write HTML-like markup inside React components.'],
      ['What does useState return?', 'An array with the current state value and a function to update it.'],
      ['What is a prop?', 'A read-only input passed from a parent component to a child component.'],
      ['Why do lists need a "key" prop?', 'Keys help React identify which items changed, were added, or removed, so it can update the DOM efficiently.'],
      ['When does useEffect run?', 'After the component renders — on mount, and again whenever a value in its dependency array changes.'],
      ['What does React.memo do?', 'Skips re-rendering a component when its props have not changed (shallow comparison).'],
      ['What is useMemo for?', 'Caching the result of an expensive calculation between renders until its dependencies change.'],
      ['What is React Router\'s <Outlet />?', 'A placeholder in a parent route\'s element where the matched child route renders.'],
    ],
  },
  {
    title: 'Cell Biology',
    subject: 'Biology',
    description: 'Organelles and what they do.',
    swatch: 'amber',
    cards: [
      ['What is the powerhouse of the cell?', 'The mitochondrion — it generates ATP through cellular respiration.'],
      ['What does the cell membrane do?', 'Controls what enters and leaves the cell, maintaining a stable internal environment.'],
      ['What is the function of ribosomes?', 'They synthesize proteins by translating messenger RNA.'],
      ['What does the Golgi apparatus do?', 'Modifies, sorts and packages proteins and lipids for transport.'],
      ['Where is DNA stored in a eukaryotic cell?', 'In the nucleus (and a small amount in mitochondria).'],
      ['What do lysosomes contain?', 'Digestive enzymes that break down waste and worn-out cell parts.'],
    ],
  },
  {
    title: 'JavaScript ES6+',
    subject: 'Computer Science',
    description: 'Modern JavaScript syntax used throughout this app.',
    swatch: 'blue',
    cards: [
      ['What is the difference between let and const?', 'Both are block-scoped; const bindings cannot be reassigned, let bindings can.'],
      ['What does the spread operator (...) do with arrays?', 'Expands an iterable into individual elements, e.g. to copy or merge arrays.'],
      ['What is destructuring?', 'Unpacking values from arrays or properties from objects into distinct variables.'],
      ['What does async/await do?', 'Lets you write promise-based code that reads like synchronous code; await pauses until the promise settles.'],
      ['What is optional chaining (?.)?', 'Accesses a nested property and returns undefined instead of throwing if a link in the chain is null/undefined.'],
      ['What does Array.prototype.reduce do?', 'Runs a reducer over each element to accumulate a single result value.'],
      ['What are template literals?', 'Strings in backticks that allow embedded ${expressions} and multi-line text.'],
    ],
  },
  {
    title: 'French Basics',
    subject: 'Languages',
    description: 'Everyday words and phrases.',
    swatch: 'rose',
    cards: [
      ['Bonjour', 'Hello / Good morning'],
      ['Merci beaucoup', 'Thank you very much'],
      ['Où est la gare ?', 'Where is the train station?'],
      ['Je ne comprends pas', 'I don\'t understand'],
      ['L\'addition, s\'il vous plaît', 'The bill, please'],
    ],
  },
]

// Deterministic pseudo-random numbers so every seed produces the same history.
let seed = 42
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

async function main() {
  await prisma.review.deleteMany()
  await prisma.studySession.deleteMany()
  await prisma.card.deleteMany()
  await prisma.deck.deleteMany()

  const now = Date.now()

  for (const [deckIndex, d] of decks.entries()) {
    const deck = await prisma.deck.create({
      data: {
        title: d.title,
        subject: d.subject,
        description: d.description,
        swatch: d.swatch,
        createdAt: new Date(now - (12 - deckIndex) * DAY_MS),
      },
    })

    // The last deck is left untouched so the "new cards" state is visible too.
    const studyDays = deckIndex === decks.length - 1 ? [] : [9, 7, 4, 2, 1].slice(0, 5 - deckIndex)

    const cardStates = d.cards.map(([front, back]) => ({
      front,
      back,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      reviewCount: 0,
      dueAt: new Date(now - 12 * DAY_MS),
      lastReviewedAt: null,
      reviews: [],
    }))

    for (const daysAgo of studyDays) {
      const sessionTime = now - daysAgo * DAY_MS + Math.floor(rand() * 4) * 60 * 60 * 1000
      let known = 0
      let review = 0
      for (const state of cardStates) {
        const when = new Date(sessionTime)
        if (state.dueAt > when) continue
        const r = rand()
        const grade = r < 0.15 ? 0 : r < 0.3 ? 1 : r < 0.85 ? 2 : 3
        Object.assign(state, schedule(state, grade, when))
        state.reviews.push({ grade, reviewedAt: when })
        grade >= 2 ? known++ : review++
      }
      if (known + review > 0) {
        await prisma.studySession.create({
          data: {
            deckId: deck.id,
            mode: 'due',
            total: known + review,
            known,
            review,
            durationSec: (known + review) * (8 + Math.floor(rand() * 10)),
            completedAt: new Date(sessionTime + 5 * 60 * 1000),
          },
        })
      }
    }

    for (const { reviews, ...card } of cardStates) {
      await prisma.card.create({
        data: { ...card, deckId: deck.id, reviews: { create: reviews } },
      })
    }
  }

  const counts = await Promise.all([prisma.deck.count(), prisma.card.count(), prisma.review.count()])
  console.log(`Seeded ${counts[0]} decks, ${counts[1]} cards, ${counts[2]} reviews.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
