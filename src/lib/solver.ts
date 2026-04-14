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
  feedbackKey: string
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

type GuessScore = {
  candidateBias: number
  entropy: number
  expectedBucket: number
  guess: string
  immediateSolveRate: number
  worstBucket: number
}

type SolverPhase = 'opening' | 'midgame' | 'endgame'

const DIGITS = '0123456789'
const FEEDBACK_KEY_CACHE = new Map<string, string>()
const MAX_SCORING_SOLUTIONS = 2500
const MAX_REMAINING_GUESSES = 80
const MAX_EXPLORATORY_GUESSES = 140
const OPENING_GUESSES: Record<CodeLength, string[]> = {
  3: ['123', '456'],
  4: ['1234', '5678'],
  5: ['12345', '67890'],
  6: ['123456', '789012'],
}

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
    feedbackKey: entries.map(({ state }) => formatStateSymbol(state)).join(''),
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
      getFeedbackKey(candidate, attempt.code) === attempt.feedbackKey,
    ),
  )
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
  attemptsLeft = Number.POSITIVE_INFINITY,
): SolverAnalysis {
  const remainingCandidates = filterCandidates(baseCandidates, attempts)

  return {
    remainingCandidates,
    recommendedCandidate: chooseRecommendedCandidate(
      baseCandidates,
      remainingCandidates,
      attempts,
      attemptsLeft,
    ),
    summary: summarizeCandidates(remainingCandidates),
  }
}

function chooseRecommendedCandidate(
  baseCandidates: string[],
  remainingCandidates: string[],
  attempts: ParsedAttempt[],
  attemptsLeft: number,
): string | null {
  if (remainingCandidates.length === 0) {
    return null
  }

  if (remainingCandidates.length === 1) {
    return remainingCandidates[0]
  }

  const openingGuess = selectOpeningGuess(
    baseCandidates[0].length as CodeLength,
    attempts,
    remainingCandidates.length,
    attemptsLeft,
  )

  if (openingGuess) {
    return openingGuess
  }

  const phase = getSolverPhase(remainingCandidates.length, attemptsLeft)
  const scoringSolutions = sampleScoringSolutions(remainingCandidates)
  const guessPool = buildGuessPool(
    baseCandidates,
    remainingCandidates,
    phase,
    attemptsLeft,
  )
  const remainingSet = new Set(remainingCandidates)
  const solutionCount = scoringSolutions.length
  let bestScore: GuessScore | null = null

  for (const guess of guessPool) {
    const partitions = new Map<string, number>()
    let worstBucket = 0
    let sumSquares = 0

    for (const solution of scoringSolutions) {
      const key = getFeedbackKey(solution, guess)
      const nextCount = (partitions.get(key) ?? 0) + 1
      partitions.set(key, nextCount)
      worstBucket = Math.max(worstBucket, nextCount)
    }

    for (const bucketSize of partitions.values()) {
      sumSquares += bucketSize * bucketSize
    }

    const expectedBucket = sumSquares / solutionCount
    const entropy = calculateEntropy(partitions, solutionCount)
    const immediateSolveRate =
      (partitions.get(getSolvedKey(guess.length)) ?? 0) / solutionCount
    const candidateBias = remainingSet.has(guess)
      ? phase === 'endgame'
        ? 2
        : 1
      : phase !== 'endgame'
        ? 1
        : 0

    const currentScore: GuessScore = {
      candidateBias,
      entropy,
      expectedBucket,
      guess,
      immediateSolveRate,
      worstBucket,
    }

    if (isBetterGuessScore(currentScore, bestScore)) {
      bestScore = currentScore
    }
  }

  return bestScore?.guess ?? guessPool[0]
}

function chooseByFrequency(candidates: string[], remainingSet: Set<string>, attemptsLeft: number): string[] {
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
    const uniqueDigits = new Set(candidate).size
    const score = candidate.split('').reduce((total, digit, position) => {
      const positionScore = positionCounts[position].get(digit) ?? 0
      const globalScore = globalCounts.get(digit) ?? 0

      return total + positionScore * 3 + globalScore
    }, 0)

    const bias = remainingSet.has(candidate)
      ? attemptsLeft <= 2
        ? 40
        : 10
      : attemptsLeft >= 3
        ? 12
        : 0

    return { candidate, score: score + uniqueDigits * 5 + bias }
  })

  scoredCandidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.candidate.localeCompare(right.candidate)
  })

  return scoredCandidates.map(({ candidate }) => candidate)
}

function buildGuessPool(
  baseCandidates: string[],
  remainingCandidates: string[],
  phase: SolverPhase,
  attemptsLeft: number,
): string[] {
  const remainingSet = new Set(remainingCandidates)
  const rankedRemaining = chooseByFrequency(
    remainingCandidates,
    remainingSet,
    attemptsLeft,
  )
  const selectedRemaining =
    remainingCandidates.length <= MAX_REMAINING_GUESSES
      ? rankedRemaining
      : rankedRemaining.slice(0, MAX_REMAINING_GUESSES)

  if (phase === 'endgame' || attemptsLeft <= 1 || remainingCandidates.length <= 2) {
    return selectedRemaining
  }

  const rankedBase = chooseByFrequency(baseCandidates, remainingSet, attemptsLeft)
  const exploratoryGuesses: string[] = []

  for (const guess of rankedBase) {
    if (remainingSet.has(guess)) {
      continue
    }

    exploratoryGuesses.push(guess)

    if (exploratoryGuesses.length === MAX_EXPLORATORY_GUESSES) {
      break
    }
  }

  return [...selectedRemaining, ...exploratoryGuesses]
}

function sampleScoringSolutions(candidates: string[]): string[] {
  if (candidates.length <= MAX_SCORING_SOLUTIONS) {
    return candidates
  }

  const step = Math.ceil(candidates.length / MAX_SCORING_SOLUTIONS)
  const sampled: string[] = []

  for (let index = 0; index < candidates.length; index += step) {
    sampled.push(candidates[index])
  }

  return sampled
}

function getFeedbackKey(solution: string, guess: string): string {
  const cacheKey = `${solution}|${guess}`
  const cached = FEEDBACK_KEY_CACHE.get(cacheKey)

  if (cached) {
    return cached
  }

  const feedbackKey = evaluateGuess(solution, guess).map(formatStateSymbol).join('')
  FEEDBACK_KEY_CACHE.set(cacheKey, feedbackKey)

  return feedbackKey
}

function getSolvedKey(length: number): string {
  return 'v'.repeat(length)
}

function calculateEntropy(
  partitions: Map<string, number>,
  total: number,
): number {
  let entropy = 0

  for (const bucketSize of partitions.values()) {
    const probability = bucketSize / total
    entropy -= probability * Math.log2(probability)
  }

  return entropy
}

function isBetterGuessScore(
  current: GuessScore,
  best: GuessScore | null,
): boolean {
  if (!best) {
    return true
  }

  return compareGuessScores(current, best) < 0
}

function compareGuessScores(left: GuessScore, right: GuessScore): number {
  return (
    compareAscending(left.worstBucket, right.worstBucket) ||
    compareAscending(left.expectedBucket, right.expectedBucket) ||
    compareDescending(left.entropy, right.entropy) ||
    compareDescending(left.immediateSolveRate, right.immediateSolveRate) ||
    compareDescending(left.candidateBias, right.candidateBias) ||
    left.guess.localeCompare(right.guess)
  )
}

function compareAscending(left: number, right: number): number {
  return left === right ? 0 : left < right ? -1 : 1
}

function compareDescending(left: number, right: number): number {
  return left === right ? 0 : left > right ? -1 : 1
}

function getSolverPhase(
  remainingCandidatesCount: number,
  attemptsLeft: number,
): SolverPhase {
  // Enter endgame only when the search space is already small enough to justify
  // spending remaining attempts on direct candidate checks.
  if (attemptsLeft <= 2 || remainingCandidatesCount <= attemptsLeft) {
    return 'endgame'
  }

  return 'midgame'
}

function selectOpeningGuess(
  codeLength: CodeLength,
  attempts: ParsedAttempt[],
  remainingCandidatesCount: number,
  attemptsLeft: number,
): string | null {
  if (attemptsLeft <= 2) {
    return null
  }

  const openingPlan = OPENING_GUESSES[codeLength]
  const usedGuesses = new Set(attempts.map(({ code }) => code))

  if (attempts.length === 0) {
    return openingPlan[0]
  }

  if (attempts.length > 1) {
    return null
  }

  const firstAttemptHitCount = countHitDigits(attempts[0])
  const openingShouldContinue =
    firstAttemptHitCount <= Math.ceil(codeLength / 2) &&
    remainingCandidatesCount > codeLength * 6

  if (!openingShouldContinue) {
    return null
  }

  return openingPlan.find((guess) => !usedGuesses.has(guess)) ?? null
}

function countHitDigits(attempt: ParsedAttempt): number {
  return attempt.entries.filter(({ state }) => state !== 'absent').length
}
