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

function fillFromIndex(
  cells: DraftCell[],
  startIndex: number,
  rawValue: string,
): DraftCell[] {
  const sanitized = rawValue.toLowerCase().replace(/[\s,;:/\\|_-]+/g, '')
  const nextCells = cells.map((cell) => ({ ...cell }))
  let cellIndex = startIndex

  for (const char of sanitized) {
    if (cellIndex >= nextCells.length) {
      break
    }

    if (/\d/.test(char)) {
      if (
        nextCells[cellIndex].digit &&
        nextCells[cellIndex].state === '' &&
        cellIndex < nextCells.length - 1
      ) {
        cellIndex += 1
      }

      nextCells[cellIndex] = {
        digit: char,
        state: '',
      }
      continue
    }

    const state = nextSymbol(char)

    if (!state || !nextCells[cellIndex].digit) {
      continue
    }

    nextCells[cellIndex] = {
      digit: nextCells[cellIndex].digit,
      state,
    }

    if (cellIndex < nextCells.length - 1) {
      cellIndex += 1
    }
  }

  return nextCells
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
          Flujo rápido: <code>2r 3b 4v</code>. El número se queda en la casilla y el color te mueve a la siguiente.
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
                const nextRawValue = event.target.value
                const digitCount = nextRawValue.replace(/\D/g, '').length

                if (digitCount > 1 || /[ravgb]/i.test(nextRawValue)) {
                  onChange(serializeDraft(fillFromIndex(cells, index, nextRawValue)))
                  return
                }

                const nextDigit = nextRawValue.replace(/\D/g, '').slice(-1)
                updateCell(index, {
                  digit: nextDigit,
                  state: nextDigit ? cell.state : '',
                })
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

                if (/\d/.test(event.key)) {
                  event.preventDefault()
                  updateCell(index, {
                    digit: event.key,
                    state: cell.state,
                  })
                  return
                }

                if (event.key === 'Backspace') {
                  event.preventDefault()

                  if (cell.state) {
                    updateCell(index, {
                      digit: cell.digit,
                      state: '',
                    })
                    return
                  }

                  if (cell.digit) {
                    updateCell(index, {
                      digit: '',
                      state: '',
                    })
                    return
                  }

                  if (index > 0) {
                    focusCell(index - 1)
                  }

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
