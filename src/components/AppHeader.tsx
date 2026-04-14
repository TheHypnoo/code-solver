type AppHeaderProps = {
  onResetAll: () => void
}

export function AppHeader({ onResetAll }: AppHeaderProps) {
  return (
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
        <button className="ghost-button" type="button" onClick={onResetAll}>
          Reiniciar sesión
        </button>
      </div>
    </header>
  )
}
