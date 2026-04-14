import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import {
  CODE_LENGTH_OPTIONS,
  analyzeCandidates,
  formatStateSymbol,
  generateCandidates,
  parseCompactAttempt,
  type CodeLength,
  type DigitState,
  type ParsedAttempt,
} from './lib/solver'

type SavedAttempt = {
  id: string
  parsed: ParsedAttempt
}

type RoundState = {
  codeLength: CodeLength
  attempts: SavedAttempt[]
}

const STATE_LABELS: Record<DigitState, string> = {
  absent: 'Rojo',
  present: 'Azul',
  exact: 'Verde',
}

const MAX_VISIBLE_CANDIDATES = 180
const MAX_ATTEMPTS_PER_ROUND = 5
const TOTAL_ROUNDS = 5

function createRoundState(): RoundState {
  return {
    codeLength: 4,
    attempts: [],
  }
}

function createInitialRounds(): RoundState[] {
  return Array.from({ length: TOTAL_ROUNDS }, () => createRoundState())
}

function App() {
  const [rounds, setRounds] = useState<RoundState[]>(() => createInitialRounds())
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [compactInput, setCompactInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentRound = rounds[currentRoundIndex]
  const baseCandidates = useMemo(
    () => generateCandidates(currentRound.codeLength),
    [currentRound.codeLength],
  )
  const deferredAttempts = useDeferredValue(currentRound.attempts)
  const analysis = useMemo(
    () =>
      analyzeCandidates(
        baseCandidates,
        deferredAttempts.map(({ parsed }) => parsed),
      ),
    [baseCandidates, deferredAttempts],
  )
  const isUpdating = deferredAttempts !== currentRound.attempts
  const visibleCandidates = analysis.remainingCandidates.slice(
    0,
    MAX_VISIBLE_CANDIDATES,
  )
  const attemptsLeft = MAX_ATTEMPTS_PER_ROUND - currentRound.attempts.length
  const canAddAttempt = attemptsLeft > 0
  const completedRounds = rounds.filter(
    (round) => round.attempts.length === MAX_ATTEMPTS_PER_ROUND,
  ).length
  const exampleInput = useMemo(
    () =>
      Array.from({ length: currentRound.codeLength }, (_, index) => {
        const digit = ((index + 1) % 10).toString()
        const symbols = ['r', 'a', 'v']
        return `${digit}${symbols[index % symbols.length]}`
      }).join(''),
    [currentRound.codeLength],
  )

  const updateCurrentRound = (updater: (round: RoundState) => RoundState) => {
    setRounds((current) =>
      current.map((round, index) =>
        index === currentRoundIndex ? updater(round) : round,
      ),
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canAddAttempt) {
      setError('Esta jugada ya ha consumido sus 5 intentos.')
      return
    }

    try {
      const parsed = parseCompactAttempt(compactInput, currentRound.codeLength)
      const nextAttempts = [
        ...currentRound.attempts,
        { id: crypto.randomUUID(), parsed },
      ]
      const nextAnalysis = analyzeCandidates(
        baseCandidates,
        nextAttempts.map(({ parsed: attempt }) => attempt),
      )

      if (nextAnalysis.remainingCandidates.length === 0) {
        throw new Error(
          'Ese intento deja cero combinaciones posibles. Revisa colores o borra un intento anterior.',
        )
      }

      setError(null)
      startTransition(() => {
        updateCurrentRound((round) => ({
          ...round,
          attempts: nextAttempts,
        }))
        setCompactInput('')
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo interpretar ese intento.',
      )
    }
  }

  const handleDelete = (attemptId: string) => {
    startTransition(() => {
      updateCurrentRound((round) => ({
        ...round,
        attempts: round.attempts.filter(({ id }) => id !== attemptId),
      }))
      setError(null)
    })
  }

  const handleResetCurrentRound = () => {
    startTransition(() => {
      updateCurrentRound(() => createRoundState())
      setCompactInput('')
      setError(null)
    })
  }

  const handleResetAll = () => {
    startTransition(() => {
      setRounds(createInitialRounds())
      setCurrentRoundIndex(0)
      setCompactInput('')
      setError(null)
    })
  }

  const handleRoundChange = (roundIndex: number) => {
    startTransition(() => {
      setCurrentRoundIndex(roundIndex)
      setCompactInput('')
      setError(null)
    })
  }

  const handleCodeLengthChange = (length: CodeLength) => {
    startTransition(() => {
      updateCurrentRound((round) => ({
        ...round,
        codeLength: length,
      }))
      setError(null)
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Solver de códigos</h1>
          <p className="hero-copy">
            Tienes 5 jugadas en total y cada jugada admite como máximo 5 intentos.
            Selecciona la jugada, fija su longitud y usa el solver para apurar cada
            intento.
          </p>
        </div>
        <div className="topbar__actions">
          <div className="legend-inline">
            <span className="state-chip state-chip--absent">r = rojo</span>
            <span className="state-chip state-chip--present">a o b = azul</span>
            <span className="state-chip state-chip--exact">v o g = verde</span>
          </div>
          <button className="ghost-button" type="button" onClick={handleResetAll}>
            Reiniciar sesión
          </button>
        </div>
      </header>

      <section className="rounds-panel">
        <div>
          <h2>Jugadas</h2>
          <p className="support-copy">
            {completedRounds} de {TOTAL_ROUNDS} jugadas han consumido sus 5 intentos.
          </p>
        </div>
        <div className="round-tabs">
          {rounds.map((round, index) => {
            const usedAttempts = round.attempts.length
            const isActive = index === currentRoundIndex

            return (
              <button
                key={`round-${index + 1}`}
                type="button"
                className={isActive ? 'round-tab is-active' : 'round-tab'}
                onClick={() => handleRoundChange(index)}
              >
                <strong>Jugada {index + 1}</strong>
                <span>{round.codeLength} dígitos</span>
                <span>
                  {usedAttempts}/{MAX_ATTEMPTS_PER_ROUND} intentos
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--form">
          <div className="panel__header">
            <div>
              <h2>Jugada {currentRoundIndex + 1}</h2>
              <p className="support-copy">
                Quedan {attemptsLeft} de {MAX_ATTEMPTS_PER_ROUND} intentos.
              </p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={handleResetCurrentRound}
            >
              Reiniciar jugada
            </button>
          </div>

          <div className="length-picker">
            {CODE_LENGTH_OPTIONS.map((length) => (
              <button
                key={length}
                type="button"
                className={
                  length === currentRound.codeLength
                    ? 'length-pill is-active'
                    : 'length-pill'
                }
                disabled={currentRound.attempts.length > 0}
                onClick={() => handleCodeLengthChange(length)}
              >
                {length} dígitos
              </button>
            ))}
          </div>

          <p className="support-copy">
            La longitud se fija al empezar la jugada. Los intentos no admiten
            dígitos repetidos.
          </p>

          <form className="attempt-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Intento compacto</span>
              <input
                autoComplete="off"
                className="field__input"
                disabled={!canAddAttempt}
                inputMode="text"
                maxLength={currentRound.codeLength * 3}
                onChange={(event) => setCompactInput(event.target.value)}
                placeholder={exampleInput}
                value={compactInput}
              />
            </label>

            <p className="field-help">
              También puedes usar espacios: <code>1r 2v 3r 4a</code>.
            </p>

            <button className="primary-button" disabled={!canAddAttempt} type="submit">
              Añadir intento
            </button>
          </form>

          <div aria-live="polite" className="feedback-stack">
            {error ? <p className="message message--error">{error}</p> : null}
            {!canAddAttempt ? (
              <p className="message message--info">
                Has agotado los 5 intentos de esta jugada.
              </p>
            ) : null}
            {isUpdating ? (
              <p className="message message--info">Recalculando combinaciones…</p>
            ) : null}
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">Espacio inicial</span>
              <strong>{baseCandidates.length.toLocaleString('es-ES')}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Combinaciones vivas</span>
              <strong>{analysis.remainingCandidates.length.toLocaleString('es-ES')}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Intentos usados</span>
              <strong>
                {currentRound.attempts.length}/{MAX_ATTEMPTS_PER_ROUND}
              </strong>
            </div>
          </div>
        </article>

        <article className="panel panel--recommendation">
          <h2>Recomendación</h2>
          <div className="recommendation-card">
            <strong className="recommendation-card__code">
              {analysis.recommendedCandidate ?? 'Sin opciones'}
            </strong>
            <p>
              {analysis.remainingCandidates.length === 0
                ? 'No queda ninguna combinación compatible con el historial.'
                : analysis.remainingCandidates.length === 1
                  ? 'Solo queda una combinación posible.'
                  : 'Se calcula a partir de las combinaciones válidas restantes.'}
            </p>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-card__label">Descartados</span>
              <div className="digit-list">
                {analysis.summary.discardedDigits.length > 0 ? (
                  analysis.summary.discardedDigits.map((digit) => (
                    <span key={digit} className="digit-token digit-token--discarded">
                      {digit}
                    </span>
                  ))
                ) : (
                  <span className="summary-empty">Sin descartes definitivos</span>
                )}
              </div>
            </div>

            <div className="summary-card">
              <span className="summary-card__label">Fijos</span>
              <div className="digit-list">
                {analysis.summary.fixedPositions.length > 0 ? (
                  analysis.summary.fixedPositions.map(({ digit, position }) => (
                    <span key={`${digit}-${position}`} className="digit-token digit-token--exact">
                      {position + 1}={digit}
                    </span>
                  ))
                ) : (
                  <span className="summary-empty">Ninguna posición cerrada</span>
                )}
              </div>
            </div>

            <div className="summary-card">
              <span className="summary-card__label">Presentes mal colocados</span>
              <div className="digit-list">
                {analysis.summary.guaranteedMisplacedDigits.length > 0 ? (
                  analysis.summary.guaranteedMisplacedDigits.map((digit) => (
                    <span key={digit} className="digit-token digit-token--present">
                      {digit}
                    </span>
                  ))
                ) : (
                  <span className="summary-empty">Sin dígitos garantizados fuera de sitio</span>
                )}
              </div>
            </div>

            <div className="summary-card">
              <span className="summary-card__label">Aún posibles</span>
              <div className="digit-list">
                {analysis.summary.possibleDigits.length > 0 ? (
                  analysis.summary.possibleDigits.map((digit) => (
                    <span key={digit} className="digit-token">
                      {digit}
                    </span>
                  ))
                ) : (
                  <span className="summary-empty">Sin variaciones pendientes</span>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="panel panel--history">
          <div className="panel__header">
            <div>
              <h2>Historial</h2>
            </div>
          </div>

          {currentRound.attempts.length === 0 ? (
            <p className="empty-state">
              Empieza con un intento para filtrar las combinaciones.
            </p>
          ) : (
            <ul className="attempt-list">
              {currentRound.attempts.map(({ id, parsed }, index) => (
                <li key={id} className="attempt-card">
                  <div>
                    <span className="attempt-card__index">Intento {index + 1}</span>
                    <strong className="attempt-card__code">{parsed.code}</strong>
                  </div>
                  <div className="chip-row">
                    {parsed.entries.map(({ digit, state }, entryIndex) => (
                      <span
                        key={`${digit}-${entryIndex}`}
                        className={`state-chip state-chip--${state}`}
                      >
                        {digit}
                        {formatStateSymbol(state)}
                        {' · '}
                        {STATE_LABELS[state]}
                      </span>
                    ))}
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => handleDelete(id)}
                  >
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel panel--candidates">
          <div className="panel__header">
            <div>
              <h2>Posibles restantes</h2>
            </div>
            <span className="panel__meta">
              {visibleCandidates.length.toLocaleString('es-ES')} visibles
            </span>
          </div>

          {analysis.remainingCandidates.length === 0 ? (
            <p className="empty-state">No hay combinaciones compatibles ahora mismo.</p>
          ) : (
            <>
              <div className="candidate-grid">
                {visibleCandidates.map((candidate) => (
                  <code key={candidate} className="candidate-token">
                    {candidate}
                  </code>
                ))}
              </div>
              {analysis.remainingCandidates.length > visibleCandidates.length ? (
                <p className="support-copy">
                  Mostrando las primeras {visibleCandidates.length.toLocaleString('es-ES')} de{' '}
                  {analysis.remainingCandidates.length.toLocaleString('es-ES')} combinaciones.
                </p>
              ) : null}
            </>
          )}
        </article>
      </section>
    </main>
  )
}

export default App
