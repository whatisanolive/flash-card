// A 3D flip card. It's a real <button> so it works with keyboard and screen readers.
export default function Flashcard({ card, flipped, onFlip }) {
  return (
    <button
      type="button"
      className={`flashcard ${flipped ? 'flashcard--flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? `Answer: ${card.back}. Press to show question.` : `Question: ${card.front}. Press to reveal answer.`}
    >
      <div className="flashcard__inner">
        <div className="flashcard__face flashcard__face--front" aria-hidden={flipped}>
          <span className="flashcard__label">Question</span>
          <p>{card.front}</p>
          <span className="flashcard__hint">Tap or press Space to reveal</span>
        </div>
        <div className="flashcard__face flashcard__face--back" aria-hidden={!flipped}>
          <span className="flashcard__label">Answer</span>
          <p>{card.back}</p>
          <span className="flashcard__hint">Tap or press Space to flip back</span>
        </div>
      </div>
    </button>
  )
}
