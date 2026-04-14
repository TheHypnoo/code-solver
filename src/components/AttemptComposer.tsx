import { useMemo, useRef } from 'react'

type ComposerState = '' | 'r' | 'a' | 'v'

type DraftCell = {
  digit: string
  state: ComposerState
}

type AttemptComposerProps = {
  codeLength: number
  disabled: boolean
  value: string
  onChange: (value: string) => void
}

const STATE_OPTIONS = [
  { symbol: 'r' as const, label: 'Rojo', shortLabel: 'R', tone: 'absent' },
  { symbol: 'a' as const, label: 'Azul', shortLabel: 'A', tone: 'present' },
  { symbol: 'v' as const, label: 'Verde', shortLabel: 'V', tone: 'exact' },
]

const STATE_ALIAS_TO_SYMBOL: Record<string, ComposerState> = {
  a: 'a',
  b: 'a',
  g: 'v',
  r: 'r',
  v: 'v',
}

function parseDraft(value: string, codeLength: number): DraftCell[] {
  const cleaned = value.toLowerCase().replace(/[\s,;:/\\|_-]+/g, '')
  const cells = Array.from({ length: codeLength }, () => ({ digit: '', state: '' as ComposerState }))
  let cellIndex = 0

  for (const char of cleaned) {
    if (cellIndex >= codeLength) {
      break
    }

    if (/\d/.test(char)) {
      if (cells[cellIndex].digit && cells[cellIndex].state === '' && cellIndex < codeLength - 1) {
        cellIndex += 1
      }

      cells[cellIndex].digit = char
      continue
    }

    const state = STATE_ALIAS_TO_SYMBOL[char]

    if (!state || !cells[cellIndex].digit) {
      continue
    }

    cells[cellIndex].state = state

    if (cellIndex < codeLength - 1) {
      cellIndex += 1
    }
  }

  return cells
}

function serializeDraft(cells: DraftCell[]): string {
  return cells
    .map(({ digit, state }) => {
      if (!digit) {
        return ''
      }

      return `${digit}${state}`
    })
    .join('')
}

function nextSymbol(rawKey: string): ComposerState {
  return STATE_ALIAS_TO_SYMBOL[rawKey.toLowerCase()] ?? ''
}

export function AttemptComposer({
  codeLength,
  disabled,
  value,
  onChange,
}: AttemptComposerProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const cells = useMemo(() => parseDraft(value, codeLength), [codeLength, value])

  const updateCell = (index: number, nextCell: DraftCell) => {
    const nextCells = cells.map((cell, cellIndex) =>
      cellIndex === index ? nextCell : cell,
    )
    onChange(serializeDraft(nextCells))
  }

  const focusCell = (index: number) => {
    inputRefs.current[index]?.focus()
    inputRefs.current[index]?.select()
  }

  return (
    <div className="attempt-composer">
      <div className="attempt-composer__header">
        <span className="field__label">Entrada rápida</span>
        <span className="attempt-composer__hint">
          Escribe el dígito y pulsa <code>R</code>, <code>A/B</code> o <code>V/G</code>.
        </span>
      </div>

      <div className="attempt-composer__grid" role="group" aria-label="Entrada rápida por posición">
        {cells.map((cell, index) => (
          <div
            key={`composer-cell-${index}`}
            className={
              cell.state
                ? `attempt-slot attempt-slot--${STATE_OPTIONS.find(({ symbol }) => symbol === cell.state)?.tone}`
                : 'attempt-slot'
            }
          >
            <span className="attempt-slot__index">Pos. {index + 1}</span>
            <input
              ref={(node) => {
                inputRefs.current[index] = node
              }}
              aria-label={`Dígito ${index + 1}`}
              autoComplete="off"
              className="attempt-slot__digit"
              disabled={disabled}
              inputMode="numeric"
              maxLength={1}
              onChange={(event) => {
                const nextDigit = event.target.value.replace(/\D/g, '').slice(-1)
                updateCell(index, {
                  digit: nextDigit,
                  state: nextDigit ? cell.state : '',
                })

                if (nextDigit && index < codeLength - 1) {
                  focusCell(index + 1)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && index > 0) {
                  event.preventDefault()
                  focusCell(index - 1)
                  return
                }

                if (event.key === 'ArrowRight' && index < codeLength - 1) {
                  event.preventDefault()
                  focusCell(index + 1)
                  return
                }

                if (event.key === 'Backspace' && !cell.digit && index > 0) {
                  event.preventDefault()
                  focusCell(index - 1)
                  return
                }

                const nextState = nextSymbol(event.key)

                if (!nextState || !cell.digit) {
                  return
                }

                event.preventDefault()
                updateCell(index, {
                  digit: cell.digit,
                  state: nextState,
                })

                if (index < codeLength - 1) {
                  focusCell(index + 1)
                }
              }}
              placeholder="-"
              value={cell.digit}
            />

            <div className="attempt-slot__states" role="radiogroup" aria-label={`Color ${index + 1}`}>
              {STATE_OPTIONS.map((stateOption) => {
                const isSelected = cell.state === stateOption.symbol

                return (
                  <button
                    key={stateOption.symbol}
                    type="button"
                    aria-label={stateOption.label}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? `attempt-slot__state attempt-slot__state--${stateOption.tone} is-selected`
                        : `attempt-slot__state attempt-slot__state--${stateOption.tone}`
                    }
                    disabled={disabled || !cell.digit}
                    onClick={() => {
                      updateCell(index, {
                        digit: cell.digit,
                        state: stateOption.symbol,
                      })

                      if (index < codeLength - 1) {
                        focusCell(index + 1)
                      }
                    }}
                  >
                    {stateOption.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
