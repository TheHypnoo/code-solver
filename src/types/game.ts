import type { CodeLength, ParsedAttempt } from '../lib/solver'

export type SavedAttempt = {
  id: string
  parsed: ParsedAttempt
}

export type RoundState = {
  codeLength: CodeLength
  attempts: SavedAttempt[]
}
