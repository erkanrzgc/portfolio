import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Magnet from './Magnet'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type MediaQueryChangeListener = (event: MediaQueryListEvent) => void

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockRect(element: HTMLElement) {
  return vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}

function translation(element: HTMLElement) {
  const transform = element.style.transform
  const match = transform.match(
    /translate(?:3d)?\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px/,
  )

  expect(match, `Expected a pixel translation, received "${transform}"`).not.toBeNull()

  return {
    x: Number(match?.[1]),
    y: Number(match?.[2]),
  }
}

function movePointer(element: HTMLElement, clientX: number, clientY: number) {
  const init = { clientX, clientY }

  fireEvent.mouseMove(window, init)
  fireEvent.mouseMove(document, init)
  fireEvent.mouseMove(element, init)
}

function installReducedMotionQuery(
  initialMatches: boolean,
) {
  const eventTarget = new EventTarget()
  const listeners = new Set<MediaQueryChangeListener>()
  const mediaQuery = {
    matches: initialMatches,
    media: REDUCED_MOTION_QUERY,
    onchange: null,
    addEventListener: vi.fn(
      (type: string, listener: MediaQueryChangeListener) => {
        if (type !== 'change') return
        listeners.add(listener)
        eventTarget.addEventListener(type, listener as EventListener)
      },
    ),
    removeEventListener: vi.fn(
      (type: string, listener: MediaQueryChangeListener) => {
        if (type !== 'change') return
        listeners.delete(listener)
        eventTarget.removeEventListener(type, listener as EventListener)
      },
    ),
    addListener: vi.fn((listener: MediaQueryChangeListener) => {
      listeners.add(listener)
      eventTarget.addEventListener('change', listener as EventListener)
    }),
    removeListener: vi.fn((listener: MediaQueryChangeListener) => {
      listeners.delete(listener)
      eventTarget.removeEventListener('change', listener as EventListener)
    }),
    dispatchEvent: vi.fn((event: Event) => eventTarget.dispatchEvent(event)),
    listenerCount: () => listeners.size,
  }

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery as unknown as MediaQueryList),
  )

  return mediaQuery
}

function createMediaQueryChangeEvent(
  mediaQuery: { matches: boolean; media: string },
): Event {
  const event = new Event('change')

  Object.defineProperties(event, {
    matches: { value: mediaQuery.matches },
    media: { value: mediaQuery.media },
  })

  return event
}

describe('Magnet', () => {
  it('moves its content toward the pointer', () => {
    render(
      <Magnet strength={2}>
        <span>Magnetic content</span>
      </Magnet>,
    )
    const magnet = screen.getByText('Magnetic content').parentElement

    expect(magnet).not.toBeNull()
    mockRect(magnet as HTMLElement)
    movePointer(magnet as HTMLElement, 75, 80)

    const offset = translation(magnet as HTMLElement)
    expect(offset.x).toBeGreaterThan(0)
    expect(offset.y).toBeGreaterThan(0)
  })

  it('returns to its resting position when the pointer leaves', () => {
    render(
      <Magnet strength={2}>
        <span>Magnetic content</span>
      </Magnet>,
    )
    const magnet = screen.getByText('Magnetic content').parentElement

    expect(magnet).not.toBeNull()
    mockRect(magnet as HTMLElement)
    movePointer(magnet as HTMLElement, 75, 80)
    expect(translation(magnet as HTMLElement).x).toBeGreaterThan(0)

    fireEvent.mouseLeave(magnet as HTMLElement)

    expect(translation(magnet as HTMLElement)).toEqual({ x: 0, y: 0 })
  })

  it('stays at rest when reduced motion is already requested', () => {
    const mediaQuery = installReducedMotionQuery(true)
    render(
      <Magnet strength={2}>
        <span>Magnetic content</span>
      </Magnet>,
    )
    const magnet = screen.getByText('Magnetic content').parentElement

    expect(magnet).not.toBeNull()
    const rect = mockRect(magnet as HTMLElement)
    movePointer(magnet as HTMLElement, 75, 80)

    expect(translation(magnet as HTMLElement)).toEqual({ x: 0, y: 0 })
    expect(rect).not.toHaveBeenCalled()
    expect(matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY)
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('resets and stops tracking when reduced motion becomes requested', () => {
    const mediaQuery = installReducedMotionQuery(false)
    const inactiveTransition = 'transform 1s ease-in-out'
    const rendered = render(
      <Magnet strength={2} inactiveTransition={inactiveTransition}>
        <span>Magnetic content</span>
      </Magnet>,
    )
    const magnet = screen.getByText('Magnetic content').parentElement

    expect(magnet).not.toBeNull()
    const rect = mockRect(magnet as HTMLElement)
    movePointer(magnet as HTMLElement, 75, 80)
    expect(translation(magnet as HTMLElement).x).toBeGreaterThan(0)

    act(() => {
      mediaQuery.matches = true
      mediaQuery.dispatchEvent(createMediaQueryChangeEvent(mediaQuery))
    })

    expect(translation(magnet as HTMLElement)).toEqual({ x: 0, y: 0 })
    expect((magnet as HTMLElement).style.transition).toBe(inactiveTransition)

    const layoutReads = rect.mock.calls.length
    movePointer(magnet as HTMLElement, 80, 85)

    expect(translation(magnet as HTMLElement)).toEqual({ x: 0, y: 0 })
    expect((magnet as HTMLElement).style.transition).toBe(inactiveTransition)
    expect(rect).toHaveBeenCalledTimes(layoutReads)

    const changeListener = mediaQuery.addEventListener.mock.calls[0][1]
    rendered.unmount()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      changeListener,
    )
    expect(mediaQuery.listenerCount()).toBe(0)
  })
})
