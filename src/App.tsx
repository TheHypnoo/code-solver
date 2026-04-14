import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { CandidatesPanel } from './components/CandidatesPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { RecommendationPanel } from './components/RecommendationPanel'
import { RoundFormPanel } from './components/RoundFormPanel'
import { RoundsPanel } from './components/RoundsPanel'
import {
  analyzeCandidates,
  generateCandidates,
  parseCompactAttempt,
  type CodeLength,
} from './lib/solver'
import type { RoundState } from './types/game'

const MAX_VISIBLE_CANDIDATES = 180
const MAX_ATTEMPTS_PER_ROUND = 5
const TOTAL_ROUNDS = 5

function createRoundState(): RoundState {
  return {
    codeLength: 4,
    attempts: [],
  }
}

function createInitialRounds(): RoundState[] {
  return Array.from({ length: TOTAL_ROUNDS }, () => createRoundState())
}

function App() {
  const [rounds, setRounds] = useState<RoundState[]>(() => createInitialRounds())
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [compactInput, setCompactInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentRound = rounds[currentRoundIndex]
  const baseCandidates = useMemo(
    () => generateCandidates(currentRound.codeLength),
    [currentRound.codeLength],
  )
  const deferredAttempts = useDeferredValue(currentRound.attempts)
  const attemptsLeft = MAX_ATTEMPTS_PER_ROUND - currentRound.attempts.length
  const analysis = useMemo(
    () =>
      analyzeCandidates(
        baseCandidates,
        deferredAttempts.map(({ parsed }) => parsed),
        attemptsLeft,
      ),
    [attemptsLeft, baseCandidates, deferredAttempts],
  )
  const isUpdating = deferredAttempts !== currentRound.attempts
  const isRoundSolved = analysis.remainingCandidates.length === 1
  const canAddAttempt = attemptsLeft > 0 && !isRoundSolved
  const visibleCandidates = analysis.remainingCandidates.slice(
    0,
    MAX_VISIBLE_CANDIDATES,
  )
  const solvedCode = isRoundSolved ? analysis.remainingCandidates[0] : null
  const completedRounds = rounds.filter(
    (round) => round.attempts.length === MAX_ATTEMPTS_PER_ROUND,
  ).length
  const [confettiBurst, setConfettiBurst] = useState(0)
  const lastSolvedSignatureRef = useRef<string | null>(null)
  const exampleInput = useMemo(
    () =>
      Array.from({ length: currentRound.codeLength }, (_, index) => {
        const digit = ((index + 1) % 10).toString()
        const symbols = ['r', 'a', 'v']
        return `${digit}${symbols[index % symbols.length]}`
      }).join(''),
    [currentRound.codeLength],
  )

  useEffect(() => {
    const solvedSignature = solvedCode
      ? `${currentRoundIndex}:${solvedCode}:${currentRound.attempts.length}`
      : null

    if (!solvedSignature) {
      lastSolvedSignatureRef.current = null
      return
    }

    if (lastSolvedSignatureRef.current === solvedSignature) {
      return
    }

    lastSolvedSignatureRef.current = solvedSignature
    setConfettiBurst((current) => current + 1)
  }, [currentRound.attempts.length, currentRoundIndex, solvedCode])

  const updateCurrentRound = (updater: (round: RoundState) => RoundState) => {
    setRounds((current) =>
      current.map((round, index) =>
        index === currentRoundIndex ? updater(round) : round,
      ),
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canAddAttempt) {
      setError('Esta jugada ya ha consumido sus 5 intentos.')
      return
    }

    try {
      const parsed = parseCompactAttempt(compactInput, currentRound.codeLength)
      const nextAttempts = [
        ...currentRound.attempts,
        { id: crypto.randomUUID(), parsed },
      ]
      const nextAnalysis = analyzeCandidates(
        baseCandidates,
        nextAttempts.map(({ parsed: attempt }) => attempt),
        attemptsLeft - 1,
      )

      if (nextAnalysis.remainingCandidates.length === 0) {
        throw new Error(
          'Ese intento deja cero combinaciones posibles. Revisa colores o borra un intento anterior.',
        )
      }

      setError(null)
      startTransition(() => {
        updateCurrentRound((round) => ({
          ...round,
          attempts: nextAttempts,
        }))
        setCompactInput('')
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo interpretar ese intento.',
      )
    }
  }

  const handleDelete = (attemptId: string) => {
    startTransition(() => {
      updateCurrentRound((round) => ({
        ...round,
        attempts: round.attempts.filter(({ id }) => id !== attemptId),
      }))
      setError(null)
    })
  }

  const handleResetCurrentRound = () => {
    startTransition(() => {
      updateCurrentRound(() => createRoundState())
      setCompactInput('')
      setError(null)
    })
  }

  const handleResetAll = () => {
    startTransition(() => {
      setRounds(createInitialRounds())
      setCurrentRoundIndex(0)
      setCompactInput('')
      setError(null)
    })
  }

  const handleRoundChange = (roundIndex: number) => {
    startTransition(() => {
      setCurrentRoundIndex(roundIndex)
      setCompactInput('')
      setError(null)
    })
  }

  const handleCodeLengthChange = (length: CodeLength) => {
    startTransition(() => {
      updateCurrentRound((round) => ({
        ...round,
        codeLength: length,
      }))
      setError(null)
    })
  }

  return (
    <main className="app-shell">
      <AppHeader onResetAll={handleResetAll} />

      <RoundsPanel
        completedRounds={completedRounds}
        currentRoundIndex={currentRoundIndex}
        maxAttemptsPerRound={MAX_ATTEMPTS_PER_ROUND}
        onRoundChange={handleRoundChange}
        rounds={rounds}
        totalRounds={TOTAL_ROUNDS}
      />

      <section className="dashboard-grid">
        <RoundFormPanel
          attemptsLeft={attemptsLeft}
          baseCandidatesCount={baseCandidates.length}
          canAddAttempt={canAddAttempt}
          compactInput={compactInput}
          currentRound={currentRound}
          currentRoundIndex={currentRoundIndex}
          error={error}
          exampleInput={exampleInput}
          isRoundSolved={isRoundSolved}
          isUpdating={isUpdating}
          maxAttemptsPerRound={MAX_ATTEMPTS_PER_ROUND}
          onCodeLengthChange={handleCodeLengthChange}
          onCompactInputChange={setCompactInput}
          onResetCurrentRound={handleResetCurrentRound}
          onSubmit={handleSubmit}
          remainingCandidatesCount={analysis.remainingCandidates.length}
        />

        <RecommendationPanel
          confettiBurst={confettiBurst}
          recommendedCandidate={analysis.recommendedCandidate}
          remainingCandidatesCount={analysis.remainingCandidates.length}
          solvedCode={solvedCode}
          summary={analysis.summary}
        />

        <HistoryPanel attempts={currentRound.attempts} onDelete={handleDelete} />

        <CandidatesPanel
          remainingCandidatesCount={analysis.remainingCandidates.length}
          visibleCandidates={visibleCandidates}
        />
      </section>
    </main>
  )
}

export default App
