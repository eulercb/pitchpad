import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ status: 'IDLE', connect: vi.fn(async () => {}), connectScreen: vi.fn(async () => {}) }))
vi.mock('../hooks/useMidi', () => ({ useMidi: () => ({ status: mocks.status }) }))
vi.mock('../runtime', () => ({ connect: mocks.connect, connectScreen: mocks.connectScreen }))
import { ConnectScreen } from './ConnectScreen'
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('hardware-free entry', () => {
  for (const status of ['IDLE', 'UNSUPPORTED', 'PERMISSION_DENIED', 'NO_DEVICE']) {
    it(`offers screen play before MIDI for ${status}`, () => {
      mocks.status = status
      render(createElement(ConnectScreen))
      const button = screen.getByRole('button', { name: 'Play on screen' })
      expect(screen.getAllByRole('button')[0]).toBe(button)
      expect(button).toBeEnabled()
      fireEvent.click(button)
      expect(mocks.connectScreen).toHaveBeenCalledOnce()
      expect(mocks.connect).not.toHaveBeenCalled()
    })
  }
})
