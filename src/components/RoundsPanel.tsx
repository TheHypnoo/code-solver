import type { RoundState } from '../types/game'

type RoundsPanelProps = {
  completedRounds: number
  currentRoundIndex: number
  maxAttemptsPerRound: number
  onRoundChange: (roundIndex: number) => void
  rounds: RoundState[]
  totalRounds: number
}

export function RoundsPanel({
  completedRounds,
  currentRoundIndex,
  maxAttemptsPerRound,
  onRoundChange,
  rounds,
  totalRounds,
}: RoundsPanelProps) {
  return (
    <section className="rounds-panel">
      <div>
        <h2>Jugadas</h2>
        <p className="support-copy">
          {completedRounds} de {totalRounds} jugadas han consumido sus 5 intentos.
        </p>
      </div>
      <div className="round-tabs">
        {rounds.map((round, index) => {
          const isActive = index === currentRoundIndex

          return (
            <button
              key={`round-${index + 1}`}
              type="button"
              className={isActive ? 'round-tab is-active' : 'round-tab'}
              onClick={() => onRoundChange(index)}
            >
              <strong>Jugada {index + 1}</strong>
              <span>{round.codeLength} dígitos</span>
              <span>
                {round.attempts.length}/{maxAttemptsPerRound} intentos
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
