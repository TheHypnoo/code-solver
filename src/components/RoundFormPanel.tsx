import type { FormEvent } from 'react'
import { AttemptComposer } from './AttemptComposer'
import { CODE_LENGTH_OPTIONS, type CodeLength } from '../lib/solver'
import type { RoundState } from '../types/game'

type RoundFormPanelProps = {
  attemptsLeft: number
  baseCandidatesCount: number
  canAddAttempt: boolean
  compactInput: string
  currentRound: RoundState
  currentRoundIndex: number
  error: string | null
  isRoundSolved: boolean
  isUpdating: boolean
  maxAttemptsPerRound: number
  onCodeLengthChange: (length: CodeLength) => void
  onCompactInputChange: (value: string) => void
  onResetCurrentRound: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  remainingCandidatesCount: number
}

export function RoundFormPanel({
  attemptsLeft,
  baseCandidatesCount,
  canAddAttempt,
  compactInput,
  currentRound,
  currentRoundIndex,
  error,
  isRoundSolved,
  isUpdating,
  maxAttemptsPerRound,
  onCodeLengthChange,
  onCompactInputChange,
  onResetCurrentRound,
  onSubmit,
  remainingCandidatesCount,
}: RoundFormPanelProps) {
  return (
    <article className="panel panel--form">
      <div className="panel__header">
        <div>
          <h2>Jugada {currentRoundIndex + 1}</h2>
          <p className="support-copy">
            {isRoundSolved
              ? `Jugada resuelta en ${currentRound.attempts.length} de ${maxAttemptsPerRound} intentos.`
              : `Quedan ${attemptsLeft} de ${maxAttemptsPerRound} intentos.`}
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onResetCurrentRound}>
          Reiniciar jugada
        </button>
      </div>

      <div className="length-picker">
        {CODE_LENGTH_OPTIONS.map((length) => (
          <button
            key={length}
            type="button"
            className={
              length === currentRound.codeLength ? 'length-pill is-active' : 'length-pill'
            }
            disabled={currentRound.attempts.length > 0}
            onClick={() => onCodeLengthChange(length)}
          >
            {length} dígitos
          </button>
        ))}
      </div>

      <p className="support-copy">
        La longitud se fija al empezar la jugada. Los intentos no admiten dígitos
        repetidos.
      </p>

      <form className="attempt-form" onSubmit={onSubmit}>
        <AttemptComposer
          codeLength={currentRound.codeLength}
          disabled={!canAddAttempt}
          onChange={onCompactInputChange}
          value={compactInput}
        />

        <button className="primary-button" disabled={!canAddAttempt} type="submit">
          Añadir intento
        </button>
      </form>

      <div aria-live="polite" className="feedback-stack">
        {error ? <p className="message message--error">{error}</p> : null}
        {isRoundSolved ? (
          <p className="message message--success">
            Jugada resuelta. Ya no hace falta añadir más intentos.
          </p>
        ) : null}
        {!canAddAttempt && !isRoundSolved ? (
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
          <strong>{baseCandidatesCount.toLocaleString('es-ES')}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Combinaciones vivas</span>
          <strong>{remainingCandidatesCount.toLocaleString('es-ES')}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Intentos usados</span>
          <strong>
            {currentRound.attempts.length}/{maxAttemptsPerRound}
          </strong>
        </div>
      </div>
    </article>
  )
}
