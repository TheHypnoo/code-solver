import { formatStateSymbol, type DigitState } from '../lib/solver'
import type { SavedAttempt } from '../types/game'

const STATE_LABELS: Record<DigitState, string> = {
  absent: 'Rojo',
  present: 'Azul',
  exact: 'Verde',
}

type HistoryPanelProps = {
  attempts: SavedAttempt[]
  onDelete: (attemptId: string) => void
}

export function HistoryPanel({ attempts, onDelete }: HistoryPanelProps) {
  return (
    <article className="panel panel--history">
      <div className="panel__header">
        <div>
          <h2>Historial</h2>
        </div>
      </div>

      {attempts.length === 0 ? (
        <p className="empty-state">
          Empieza con un intento para filtrar las combinaciones.
        </p>
      ) : (
        <ul className="attempt-list">
          {attempts.map(({ id, parsed }, index) => (
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
                onClick={() => onDelete(id)}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
