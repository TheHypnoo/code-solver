export const CODE_LENGTH_OPTIONS = [3, 4, 5, 6] as const

export type CodeLength = (typeof CODE_LENGTH_OPTIONS)[number]
export type DigitState = 'absent' | 'present' | 'exact'

export type AttemptEntry = {
  digit: string
  state: DigitState
}

export type ParsedAttempt = {
  raw: string
  normalized: string
  code: string
  states: DigitState[]
  entries: AttemptEntry[]
}

export type SolverSummary = {
  discardedDigits: string[]
  guaranteedMisplacedDigits: string[]
  fixedPositions: Array<{
    position: number
    digit: string
  }>
  possibleDigits: string[]
}

export type SolverAnalysis = {
  remainingCandidates: string[]
  recommendedCandidate: string | null
  summary: SolverSummary
}

const DIGITS = '0123456789'

const STATE_ALIASES: Record<string, DigitState> = {
  r: 'absent',
  a: 'present',
  b: 'present',
  v: 'exact',
  g: 'exact',
}

const STATE_SYMBOLS: Record<DigitState, string> = {
  absent: 'r',
  present: 'a',
  exact: 'v',
}

export function formatStateSymbol(state: DigitState): string {
  return STATE_SYMBOLS[state]
}

export function parseCompactAttempt(
  rawValue: string,
  codeLength: number,
): ParsedAttempt {
  if (!CODE_LENGTH_OPTIONS.includes(codeLength as CodeLength)) {
    throw new Error('La longitud debe estar entre 3 y 6 dígitos.')
  }

  const cleaned = rawValue.toLowerCase().replace(/[\s,;:/\\|_-]+/g, '')

  if (cleaned.length === 0) {
    throw new Error('Escribe un intento como 1r2v3r4a.')
  }

  if (cleaned.length !== codeLength * 2) {
    throw new Error(
      `El intento debe tener ${codeLength} pares dígito+estado, por ejemplo 1r2v3r4a.`,
    )
  }

  const entries: AttemptEntry[] = []
  const seenDigits = new Set<string>()
  let code = ''
  let normalized = ''

  for (let index = 0; index < cleaned.length; index += 2) {
    const digit = cleaned[index]
    const stateSymbol = cleaned[index + 1]
    const state = STATE_ALIASES[stateSymbol]

    if (!/\d/.test(digit)) {
      throw new Error('Cada par debe empezar por un dígito del 0 al 9.')
    }

    if (!state) {
      throw new Error('Usa r para rojo, a o b para azul, y v o g para verde.')
    }

    if (seenDigits.has(digit)) {
      throw new Error('No se admiten dígitos repetidos en un mismo intento.')
    }

    seenDigits.add(digit)
    code += digit
    normalized += `${digit}${formatStateSymbol(state)}`
    entries.push({ digit, state })
  }

  return {
    raw: rawValue,
    normalized,
    code,
    states: entries.map(({ state }) => state),
    entries,
  }
}

export function generateCandidates(codeLength: CodeLength): string[] {
  const candidates: string[] = []
  const usedDigits = new Set<string>()

  const build = (current: string) => {
    if (current.length === codeLength) {
      candidates.push(current)
      return
    }

    for (const digit of DIGITS) {
      if (usedDigits.has(digit)) {
        continue
      }

      usedDigits.add(digit)
      build(current + digit)
      usedDigits.delete(digit)
    }
  }

  build('')

  return candidates
}

export function evaluateGuess(solution: string, guess: string): DigitState[] {
  return guess.split('').map((digit, index) => {
    if (solution[index] === digit) {
      return 'exact'
    }

    return solution.includes(digit) ? 'present' : 'absent'
  })
}

export function filterCandidates(
  candidates: string[],
  attempts: ParsedAttempt[],
): string[] {
  if (attempts.length === 0) {
    return candidates
  }

  return candidates.filter((candidate) =>
    attempts.every((attempt) =>
      evaluateGuess(candidate, attempt.code).every(
        (state, index) => state === attempt.states[index],
      ),
    ),
  )
}

export function chooseRecommendedCandidate(candidates: string[]): string | null {
  if (candidates.length === 0) {
    return null
  }

  if (candidates.length === 1) {
    return candidates[0]
  }

  if (candidates.length <= 550) {
    return chooseByPartitions(candidates)
  }

  return chooseByFrequency(candidates)
}

export function summarizeCandidates(candidates: string[]): SolverSummary {
  if (candidates.length === 0) {
    return {
      discardedDigits: DIGITS.split(''),
      guaranteedMisplacedDigits: [],
      fixedPositions: [],
      possibleDigits: [],
    }
  }

  const length = candidates[0].length
  const fixedPositions = Array.from({ length }, (_, position) => {
    const digit = candidates[0][position]
    const isFixed = candidates.every((candidate) => candidate[position] === digit)

    return isFixed ? { position, digit } : null
  }).filter((entry): entry is { position: number; digit: string } => entry !== null)

  const lockedDigits = new Set(fixedPositions.map(({ digit }) => digit))
  const presenceCounts = new Map<string, number>()

  for (const digit of DIGITS) {
    let count = 0

    for (const candidate of candidates) {
      if (candidate.includes(digit)) {
        count += 1
      }
    }

    presenceCounts.set(digit, count)
  }

  const discardedDigits = DIGITS.split('').filter(
    (digit) => (presenceCounts.get(digit) ?? 0) === 0,
  )
  const guaranteedMisplacedDigits = DIGITS.split('').filter((digit) => {
    const count = presenceCounts.get(digit) ?? 0
    return count === candidates.length && !lockedDigits.has(digit)
  })
  const possibleDigits = DIGITS.split('').filter((digit) => {
    const count = presenceCounts.get(digit) ?? 0
    return count > 0 && count < candidates.length
  })

  return {
    discardedDigits,
    guaranteedMisplacedDigits,
    fixedPositions,
    possibleDigits,
  }
}

export function analyzeCandidates(
  baseCandidates: string[],
  attempts: ParsedAttempt[],
): SolverAnalysis {
  const remainingCandidates = filterCandidates(baseCandidates, attempts)

  return {
    remainingCandidates,
    recommendedCandidate: chooseRecommendedCandidate(remainingCandidates),
    summary: summarizeCandidates(remainingCandidates),
  }
}

function chooseByFrequency(candidates: string[]): string {
  const length = candidates[0].length
  const positionCounts = Array.from({ length }, () => new Map<string, number>())
  const globalCounts = new Map<string, number>()

  for (const candidate of candidates) {
    candidate.split('').forEach((digit, position) => {
      positionCounts[position].set(digit, (positionCounts[position].get(digit) ?? 0) + 1)
      globalCounts.set(digit, (globalCounts.get(digit) ?? 0) + 1)
    })
  }

  const scoredCandidates = candidates.map((candidate) => {
    const score = candidate.split('').reduce((total, digit, position) => {
      const positionScore = positionCounts[position].get(digit) ?? 0
      const globalScore = globalCounts.get(digit) ?? 0

      return total + positionScore * 3 + globalScore
    }, 0)

    return { candidate, score }
  })

  scoredCandidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.candidate.localeCompare(right.candidate)
  })

  return scoredCandidates[0].candidate
}

function chooseByPartitions(candidates: string[]): string {
  let bestCandidate = candidates[0]
  let bestWorstBucket = Number.POSITIVE_INFINITY
  let bestPartitionCount = -1

  for (const guess of candidates) {
    const partitions = new Map<string, number>()
    let worstBucket = 0
    let discarded = false

    for (const solution of candidates) {
      const key = evaluateGuess(solution, guess).map(formatStateSymbol).join('')
      const nextCount = (partitions.get(key) ?? 0) + 1
      partitions.set(key, nextCount)
      worstBucket = Math.max(worstBucket, nextCount)

      if (worstBucket > bestWorstBucket) {
        discarded = true
        break
      }
    }

    if (discarded) {
      continue
    }

    if (
      worstBucket < bestWorstBucket ||
      (worstBucket === bestWorstBucket &&
        partitions.size > bestPartitionCount) ||
      (worstBucket === bestWorstBucket &&
        partitions.size === bestPartitionCount &&
        guess.localeCompare(bestCandidate) < 0)
    ) {
      bestCandidate = guess
      bestWorstBucket = worstBucket
      bestPartitionCount = partitions.size
    }
  }

  return bestCandidate
}
