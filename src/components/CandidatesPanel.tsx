type CandidatesPanelProps = {
  remainingCandidatesCount: number
  visibleCandidates: string[]
}

export function CandidatesPanel({
  remainingCandidatesCount,
  visibleCandidates,
}: CandidatesPanelProps) {
  return (
    <article className="panel panel--candidates">
      <div className="panel__header">
        <div>
          <h2>Posibles restantes</h2>
        </div>
        <span className="panel__meta">
          {visibleCandidates.length.toLocaleString('es-ES')} visibles
        </span>
      </div>

      {remainingCandidatesCount === 0 ? (
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
          {remainingCandidatesCount > visibleCandidates.length ? (
            <p className="support-copy">
              Mostrando las primeras {visibleCandidates.length.toLocaleString('es-ES')} de{' '}
              {remainingCandidatesCount.toLocaleString('es-ES')} combinaciones.
            </p>
          ) : null}
        </>
      )}
    </article>
  )
}
