import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Keyboard } from './Keyboard'

afterEach(cleanup)

function pointer(target: HTMLElement, type: string, x = 20, y = 20) {
  fireEvent(target, Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }), { pointerId: 1 }))
}

describe('on-screen keyboard input', () => {
  it('accepts touch/pointer and accessible button activation, and blocks notes outside the pool', () => {
    const onPress = vi.fn()
    render(createElement(Keyboard, { min: 60, max: 64, enabledNotes: [60, 62, 64],
      answered: null, reveal: null, interactive: true, showLabels: true, onPress }))
    const c = screen.getByRole('button', { name: 'C4' })
    pointer(c, 'pointerdown')
    expect(onPress).not.toHaveBeenCalled()
    pointer(c, 'pointerup')
    fireEvent.click(c, { detail: 1 }) // the native click after a pointer tap must not answer twice
    // Keyboard and assistive-technology clicks have detail 0.
    fireEvent.click(screen.getByRole('button', { name: 'D4' }), { detail: 0 })
    expect(onPress.mock.calls).toEqual([[60], [62]])
    for (const button of screen.getAllByRole('button').filter((b) => (b as HTMLButtonElement).disabled)) {
      fireEvent.pointerDown(button)
      fireEvent.click(button)
    }
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('cancels drags, leaves and interrupted touches instead of submitting guesses', () => {
    const onPress = vi.fn()
    render(createElement(Keyboard, { min: 60, max: 71, answered: null, reveal: null,
      interactive: true, showLabels: true, onPress }))
    for (const name of ['C4', 'C♯4']) {
      const key = screen.getByRole('button', { name })
      pointer(key, 'pointerdown')
      pointer(key, 'pointermove', 40)
      pointer(key, 'pointerup', 20) // returning to the starting point must still count as a drag
      pointer(key, 'pointerdown')
      pointer(key, 'pointerout')
      pointer(key, 'pointerup')
      pointer(key, 'pointerdown')
      pointer(key, 'pointercancel')
      pointer(key, 'pointerup')
      expect(onPress).toHaveBeenCalledTimes(name === 'C4' ? 0 : 1)
      pointer(key, 'pointerdown')
      pointer(key, 'pointerup', 23, 24) // tolerate normal fingertip jitter
    }
    expect(onPress.mock.calls).toEqual([[60], [61]])
  })

  it('forgets held pointers when a prompt disables keys', () => {
    const onPress = vi.fn()
    const props = { min: 60, max: 64, answered: null, reveal: null,
      interactive: true, showLabels: true, onPress }
    const view = render(createElement(Keyboard, props))
    const key = screen.getByRole('button', { name: 'C4' })
    pointer(key, 'pointerdown')
    view.rerender(createElement(Keyboard, { ...props, interactive: false }))
    view.rerender(createElement(Keyboard, props))
    pointer(key, 'pointerup')
    expect(onPress).not.toHaveBeenCalled()
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
