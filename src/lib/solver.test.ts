import { describe, expect, it } from 'vitest'
import {
  analyzeCandidates,
  evaluateGuess,
  filterCandidates,
  formatStateSymbol,
  generateCandidates,
  parseCompactAttempt,
} from './solver'

describe('parseCompactAttempt', () => {
  it('normaliza aliases y separadores', () => {
    const parsed = parseCompactAttempt('1r 2g 3r 4b', 4)

    expect(parsed.code).toBe('1234')
    expect(parsed.feedbackKey).toBe('rvra')
    expect(parsed.normalized).toBe('1r2v3r4a')
    expect(parsed.states.map(formatStateSymbol)).toEqual(['r', 'v', 'r', 'a'])
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

  it('filtra candidatos consistentes con el historial', () => {
    const candidates = ['1234', '1243', '3412', '5612']
    const attempts = [parseCompactAttempt('1v2v3a4a', 4)]

    expect(filterCandidates(candidates, attempts)).toEqual(['1243'])
  })

  it('detecta contradicciones si no queda ninguna opcion', () => {
    const candidates = ['1234', '1243']
    const attempts = [parseCompactAttempt('1r2r3r4r', 4)]

    expect(analyzeCandidates(candidates, attempts).remainingCandidates).toEqual([])
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

  it('usa una apertura fija en el primer intento', () => {
    const candidates = generateCandidates(3)
    const analysis = analyzeCandidates(candidates, [], 5)

    expect(analysis.recommendedCandidate).toBe('123')
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
})
