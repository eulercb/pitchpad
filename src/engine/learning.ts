import type { LearningHistory, RoundResult } from './types'

// White keys first, then accidentals, then the same steps in the next octave.
export const CURRICULUM = [60, 62, 64, 65, 67, 69, 71, 61, 63, 66, 68, 70,
  72, 74, 76, 77, 79, 81, 83, 73, 75, 78, 80, 82]
export const MASTERY_STREAK = 3

export function emptyLearning(): LearningHistory {
  return { unlocked: 3, perNote: {} }
}

const count = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0

export function sanitizeLearning(value: unknown): LearningHistory {
  if (!value || typeof value !== 'object') return emptyLearning()
  const input = value as Partial<LearningHistory>
  const perNote: LearningHistory['perNote'] = {}
  for (const note of CURRICULUM) {
    const t = input.perNote?.[note]
    if (!t || typeof t !== 'object') continue
    const attempts = count(t.attempts)
    const correct = Math.min(attempts, count(t.correct))
    perNote[note] = { attempts, correct, streak: Math.min(correct, count(t.streak)) }
  }
  return { unlocked: Math.max(3, Math.min(CURRICULUM.length, count(input.unlocked))), perNote }
}

export function recordLearning(history: LearningHistory, result: RoundResult): LearningHistory {
  const previous = history.perNote[result.target] ?? { attempts: 0, correct: 0, streak: 0 }
  const success = result.correct && result.firstTry && !result.revealed
  const perNote = { ...history.perNote, [result.target]: {
    attempts: previous.attempts + 1,
    correct: previous.correct + Number(success),
    streak: success ? previous.streak + 1 : 0,
  } }
  // Re-check earlier notes before each promotion; an old miss needs reinforcement.
  const mastered = CURRICULUM.slice(0, history.unlocked)
    .every((note) => (perNote[note]?.streak ?? 0) >= MASTERY_STREAK)
  return { unlocked: Math.min(CURRICULUM.length, history.unlocked + Number(mastered)), perNote }
}

export function learningWeight(history: LearningHistory, note: number): number {
  const t = history.perNote[note]
  if (!t) return 6
  // Every note retains a chance to appear; recent misses and low accuracy get extra review.
  return 1 + 4 * (1 - t.correct / Math.max(1, t.attempts)) +
    3 * (1 - Math.min(MASTERY_STREAK, t.streak) / MASTERY_STREAK)
}
