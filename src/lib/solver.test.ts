import { describe, expect, it } from 'vitest'
import {
  analyzeCandidates,
  evaluateGuess,
  filterCandidates,
  formatStateSymbol,
  generateCandidates,
  parseCompactAttempt,
  summarizeCandidates,
} from './solver'

describe('parseCompactAttempt', () => {
  it('normaliza aliases y separadores', () => {
    const parsed = parseCompactAttempt('1r 2g 3r 4b', 4)

    expect(parsed.code).toBe('1234')
    expect(parsed.feedbackKey).toBe('rvra')
    expect(parsed.normalized).toBe('1r2v3r4a')
    expect(parsed.states.map(formatStateSymbol)).toEqual(['r', 'v', 'r', 'a'])
  })

  it('rechaza entrada vacia', () => {
    expect(() => parseCompactAttempt('', 4)).toThrow(/Escribe un intento/)
  })

  it('rechaza longitudes fuera de rango', () => {
    expect(() => parseCompactAttempt('1r2r', 2)).toThrow(/La longitud debe estar entre 3 y 6/)
  })

  it('rechaza un numero incorrecto de pares', () => {
    expect(() => parseCompactAttempt('1r2r3r', 4)).toThrow(/El intento debe tener 4 pares/)
  })

  it('rechaza simbolos de estado invalidos', () => {
    expect(() => parseCompactAttempt('1x2r3r4r', 4)).toThrow(/Usa r para rojo/)
  })

  it('rechaza caracteres no numericos en el digito', () => {
    expect(() => parseCompactAttempt('ar2r3r4r', 4)).toThrow(
      /Cada par debe empezar por un dígito/,
    )
  })

  it('rechaza digitos repetidos', () => {
    expect(() => parseCompactAttempt('1r2a1v4r', 4)).toThrow(
      /No se admiten dígitos repetidos/,
    )
  })
})

describe('solver core', () => {
  it('genera todas las permutaciones sin repetidos', () => {
    expect(generateCandidates(3)).toHaveLength(720)
    expect(generateCandidates(4)).toHaveLength(5040)
    expect(generateCandidates(5)).toHaveLength(30240)
  })

  it('evalua un intento con rojo, azul y verde', () => {
    expect(evaluateGuess('1234', '1564')).toEqual([
      'exact',
      'absent',
      'absent',
      'exact',
    ])
    expect(evaluateGuess('1234', '4321')).toEqual([
      'present',
      'present',
      'present',
      'present',
    ])
  })

  it('no modifica la lista si no hay intentos', () => {
    const candidates = ['1234', '1243']

    expect(filterCandidates(candidates, [])).toEqual(candidates)
  })

  it('filtra candidatos consistentes con el historial', () => {
    const candidates = ['1234', '1243', '3412', '5612']
    const attempts = [parseCompactAttempt('1v2v3a4a', 4)]

    expect(filterCandidates(candidates, attempts)).toEqual(['1243'])
  })

  it('filtra usando multiples intentos acumulados', () => {
    const candidates = ['1243', '2143', '4213', '3412']
    const secondGuess = '2143'
    const secondFeedback = evaluateGuess('1243', secondGuess)
      .map(formatStateSymbol)
      .join('')
    const attempts = [
      parseCompactAttempt('1v2v3a4a', 4),
      parseCompactAttempt(
        secondGuess
          .split('')
          .map((digit, index) => `${digit}${secondFeedback[index]}`)
          .join(''),
        4,
      ),
    ]

    expect(filterCandidates(candidates, attempts)).toEqual(['1243'])
  })

  it('detecta contradicciones si no queda ninguna opcion', () => {
    const candidates = ['1234', '1243']
    const attempts = [parseCompactAttempt('1r2r3r4r', 4)]
    const analysis = analyzeCandidates(candidates, attempts)

    expect(analysis.remainingCandidates).toEqual([])
    expect(analysis.recommendedCandidate).toBeNull()
    expect(analysis.summary.discardedDigits).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  })

  it('resume bien posiciones fijas, descartes y posibles', () => {
    const summary = summarizeCandidates(['1234', '1235'])

    expect(summary.fixedPositions).toEqual([
      { position: 0, digit: '1' },
      { position: 1, digit: '2' },
      { position: 2, digit: '3' },
    ])
    expect(summary.discardedDigits).toEqual(['0', '6', '7', '8', '9'])
    expect(summary.guaranteedMisplacedDigits).toEqual([])
    expect(summary.possibleDigits).toEqual(['4', '5'])
  })

  it('marca digitos presentes en todas las soluciones pero mal colocados', () => {
    const summary = summarizeCandidates(['1234', '2143'])

    expect(summary.fixedPositions).toEqual([])
    expect(summary.guaranteedMisplacedDigits).toEqual(['1', '2', '3', '4'])
  })

  it('devuelve la unica opcion restante como sugerencia', () => {
    const candidates = ['1243']
    const analysis = analyzeCandidates(
      candidates,
      [parseCompactAttempt('1v2v4v3v', 4)],
    )

    expect(analysis.recommendedCandidate).toBe('1243')
    expect(analysis.summary.fixedPositions).toEqual([
      { position: 0, digit: '1' },
      { position: 1, digit: '2' },
      { position: 2, digit: '4' },
      { position: 3, digit: '3' },
    ])
  })

  it('usa una apertura fija en el primer intento de 3 digitos', () => {
    const candidates = generateCandidates(3)
    const analysis = analyzeCandidates(candidates, [], 5)

    expect(analysis.recommendedCandidate).toBe('123')
  })

  it('usa una apertura fija en el primer intento de 4 digitos', () => {
    const candidates = generateCandidates(4)
    const analysis = analyzeCandidates(candidates, [], 5)

    expect(analysis.recommendedCandidate).toBe('1234')
  })

  it('continua la apertura si el primer intento aporta poca señal', () => {
    const candidates = generateCandidates(3)
    const analysis = analyzeCandidates(
      candidates,
      [parseCompactAttempt('1r2r3r', 3)],
      4,
    )

    expect(analysis.recommendedCandidate).toBe('456')
  })

  it('evita el brute force cuando aun quedan varios candidatos y varios intentos', () => {
    const candidates = generateCandidates(3)
    const attempts = [parseCompactAttempt('1r2v3a', 3)]
    const analysis = analyzeCandidates(candidates, attempts, 4)

    expect(analysis.remainingCandidates).toEqual([
      '320',
      '324',
      '325',
      '326',
      '327',
      '328',
      '329',
    ])
    expect(analysis.recommendedCandidate).toBe('046')
    expect(analysis.remainingCandidates).not.toContain(
      analysis.recommendedCandidate as string,
    )
  })

  it('no reutiliza digitos ya descartados en guesses exploratorios', () => {
    const candidates = generateCandidates(3)
    const attempts = [
      parseCompactAttempt('1r2v3a', 3),
      parseCompactAttempt('0r4r6r', 3),
    ]
    const analysis = analyzeCandidates(candidates, attempts, 3)

    expect(analysis.remainingCandidates).toEqual(['325', '327', '328', '329'])
    expect(analysis.recommendedCandidate).toBe('578')
  })

  it('cierra sobre candidatas reales cuando ya esta en endgame', () => {
    const candidates = ['1234', '1243', '1324']
    const analysis = analyzeCandidates(candidates, [], 2)

    expect(candidates).toContain(analysis.recommendedCandidate)
  })

  it('mantiene la recomendacion dentro del conjunto si solo quedan dos opciones', () => {
    const candidates = ['1234', '1243']
    const analysis = analyzeCandidates(candidates, [], 4)

    expect(candidates).toContain(analysis.recommendedCandidate)
  })

  it('acepta feedback coherente generado por evaluateGuess', () => {
    const solution = '1243'
    const guess = '1234'
    const feedback = evaluateGuess(solution, guess)
      .map(formatStateSymbol)
      .join('')
    const attempt = parseCompactAttempt(
      guess
        .split('')
        .map((digit, index) => `${digit}${feedback[index]}`)
        .join(''),
      4,
    )

    expect(filterCandidates(['1243', '1234', '3412'], [attempt])).toEqual(['1243'])
  })
})
