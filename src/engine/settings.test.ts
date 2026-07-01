import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'

describe('sanitizeSettings', () => {
  it('fills defaults for missing fields', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('clamps referenceNote into 0..127 and repairs non-finite values', () => {
    expect(sanitizeSettings({ referenceNote: 300 }).referenceNote).toBe(127)
    expect(sanitizeSettings({ referenceNote: -5 }).referenceNote).toBe(0)
    expect(sanitizeSettings({ referenceNote: Number.NaN }).referenceNote).toBe(
      DEFAULT_SETTINGS.referenceNote,
    )
    expect(sanitizeSettings({ referenceNote: 'C4' as unknown as number }).referenceNote).toBe(
      DEFAULT_SETTINGS.referenceNote,
    )
  })

  it('repairs an inverted range and clamps duration/velocity/channel/rounds', () => {
    const s = sanitizeSettings({
      rangeMin: 80,
      rangeMax: 60,
      noteDurationMs: 99999,
      outputVelocity: 999,
      outputChannel: 42,
      roundsPerSession: 0,
    })
    expect(s.rangeMin).toBeLessThanOrEqual(s.rangeMax)
    expect(s.noteDurationMs).toBeLessThanOrEqual(4000)
    expect(s.outputVelocity).toBeLessThanOrEqual(127)
    expect(s.outputChannel).toBeLessThanOrEqual(15)
    expect(s.roundsPerSession).toBeGreaterThanOrEqual(1)
  })

  it('preserves omni input channel (null) and clamps a set channel', () => {
    expect(sanitizeSettings({ inputChannel: null }).inputChannel).toBeNull()
    expect(sanitizeSettings({ inputChannel: 99 }).inputChannel).toBe(15)
  })

  it('falls back on invalid enum values', () => {
    expect(sanitizeSettings({ soundSource: 'bogus' as never }).soundSource).toBe(
      DEFAULT_SETTINGS.soundSource,
    )
    expect(sanitizeSettings({ theme: 'neon' as never }).theme).toBe(DEFAULT_SETTINGS.theme)
  })
})
