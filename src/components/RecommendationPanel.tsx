import type { CSSProperties } from 'react'
import type { SolverSummary } from '../lib/solver'

type RecommendationPanelProps = {
  confettiBurst: number
  recommendedCandidate: string | null
  remainingCandidatesCount: number
  solvedCode: string | null
  summary: SolverSummary
}

export function RecommendationPanel({
  confettiBurst,
  recommendedCandidate,
  remainingCandidatesCount,
  solvedCode,
  summary,
}: RecommendationPanelProps) {
  const isSolved = solvedCode !== null
  const confettiPieces = Array.from({ length: 14 }, (_, index) => index)

  return (
    <article className="panel panel--recommendation">
      <h2>Recomendación</h2>
      <div
        key={confettiBurst}
        className={
          isSolved
            ? 'recommendation-card recommendation-card--solved'
            : 'recommendation-card'
        }
      >
        {isSolved ? (
          <div className="confetti-burst" aria-hidden="true">
            {confettiPieces.map((piece) => (
              <span
                key={piece}
                className="confetti-burst__piece"
                style={{ '--piece-index': piece } as CSSProperties}
              />
            ))}
          </div>
        ) : null}
        {isSolved ? <span className="recommendation-card__eyebrow">Solución cerrada</span> : null}
        <strong className="recommendation-card__code">
          {solvedCode ?? recommendedCandidate ?? 'Sin opciones'}
        </strong>
        <p>
          {remainingCandidatesCount === 0
            ? 'No queda ninguna combinación compatible con el historial.'
            : remainingCandidatesCount === 1
              ? 'Solo queda una combinación posible. Puedes dar la jugada por resuelta.'
              : 'Se calcula a partir de las combinaciones válidas restantes.'}
        </p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-card__label">Descartados</span>
          <div className="digit-list">
            {summary.discardedDigits.length > 0 ? (
              summary.discardedDigits.map((digit) => (
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
            {summary.fixedPositions.length > 0 ? (
              summary.fixedPositions.map(({ digit, position }) => (
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
            {summary.guaranteedMisplacedDigits.length > 0 ? (
              summary.guaranteedMisplacedDigits.map((digit) => (
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
            {summary.possibleDigits.length > 0 ? (
              summary.possibleDigits.map((digit) => (
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
  )
}
