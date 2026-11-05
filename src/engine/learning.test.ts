import { describe, expect, it } from 'vitest'
import { CURRICULUM, emptyLearning, learningWeight, recordLearning, sanitizeLearning } from './learning'
import type { LearningHistory, RoundResult } from './types'

function result(target: number, success = true): RoundResult {
  return { target, answered: target, correct: success, firstTry: success, attempts: 1, revealed: false }
}

describe('learning curriculum', () => {
  it('requires three unaided successes on every current note before adding just one note', () => {
    let history = emptyLearning()
    for (const note of [60, 62]) {
      for (let i = 0; i < 3; i++) history = recordLearning(history, result(note))
    }
    for (let i = 0; i < 2; i++) history = recordLearning(history, result(64))
    expect(history.unlocked).toBe(3)
    history = recordLearning(history, result(64))
    expect(history.unlocked).toBe(4)
    expect(history.perNote[65]).toBeUndefined()
    history = recordLearning(history, result(60))
    expect(history.unlocked).toBe(4)
  })

  it('requires relearning an earlier missed note before the next promotion', () => {
    let history: LearningHistory = { unlocked: 4, perNote: Object.fromEntries(
      [60, 62, 64].map((n) => [n, { attempts: 3, correct: 3, streak: 3 }]),
    ) }
    history = recordLearning(history, result(60, false))
    for (let i = 0; i < 3; i++) history = recordLearning(history, result(65))
    expect(history.unlocked).toBe(4)
    for (let i = 0; i < 3; i++) history = recordLearning(history, result(60))
    expect(history.unlocked).toBe(5)
  })

  it('does not treat revealed or retried answers as mastery', () => {
    let history = recordLearning(emptyLearning(), result(60))
    history = recordLearning(history, { ...result(60), revealed: true })
    expect(history.perNote[60]).toEqual({ attempts: 2, correct: 1, streak: 0 })
    history = recordLearning(history, { ...result(60), firstTry: false, attempts: 2 })
    expect(history.perNote[60].streak).toBe(0)
  })

  it('prioritizes weak and new notes while continuing to review mastered notes', () => {
    const history = { unlocked: 3, perNote: {
      60: { attempts: 5, correct: 5, streak: 5 },
      62: { attempts: 5, correct: 1, streak: 0 },
    } }
    expect(learningWeight(history, 62)).toBeGreaterThan(learningWeight(history, 60))
    expect(learningWeight(history, 64)).toBeGreaterThan(learningWeight(history, 60))
    expect(learningWeight(history, 60)).toBeGreaterThan(0)
  })

  it('sanitizes corrupt progress and caps the completed curriculum', () => {
    expect(sanitizeLearning(null)).toEqual(emptyLearning())
    expect(sanitizeLearning({ unlocked: Infinity, perNote: { 60: { attempts: -1, correct: 50, streak: NaN } } }))
      .toEqual({ unlocked: 3, perNote: { 60: { attempts: 0, correct: 0, streak: 0 } } })
    const history = { unlocked: CURRICULUM.length, perNote: Object.fromEntries(
      CURRICULUM.map((note) => [note, { attempts: 3, correct: 3, streak: 3 }]),
    ) }
    expect(recordLearning(history, result(60)).unlocked).toBe(CURRICULUM.length)
  })
})
