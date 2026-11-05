import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Keyboard } from './Keyboard'

afterEach(cleanup)

describe('on-screen keyboard input', () => {
  it('accepts touch/pointer and accessible button activation, and blocks notes outside the pool', () => {
    const onPress = vi.fn()
    render(createElement(Keyboard, { min: 60, max: 64, enabledNotes: [60, 62, 64],
      answered: null, reveal: null, interactive: true, showLabels: true, onPress }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'C4' }))
    fireEvent.pointerUp(screen.getByRole('button', { name: 'C4' }))
    // Keyboard and assistive-technology clicks have detail 0.
    fireEvent.click(screen.getByRole('button', { name: 'D4' }), { detail: 0 })
    expect(onPress.mock.calls).toEqual([[60], [62]])
    for (const button of screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled)) {
      fireEvent.pointerDown(button)
      fireEvent.click(button)
    }
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('does not submit answers while the prompt is playing', () => {
    const onPress = vi.fn()
    render(createElement(Keyboard, { min: 60, max: 64, answered: null,
      reveal: null, interactive: false, showLabels: false, onPress }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'C4' }))
    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    expect(onPress).not.toHaveBeenCalled()
  })
})
