import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpotlightCard from './SpotlightCard'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

interface ControlledMediaQuery {
  addEventListener: ReturnType<typeof vi.fn>
  matches: boolean
  removeEventListener: ReturnType<typeof vi.fn>
  setMatches: (matches: boolean) => void
}

function installMatchMedia({ finePointer = false, reducedMotion = false } = {}) {
  const queries = new Map<string, ControlledMediaQuery>()

  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      addEventListener: vi.fn((type: string, callback: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.add(callback)
      }),
      matches: query === REDUCED_MOTION_QUERY ? reducedMotion : query === FINE_POINTER_QUERY ? finePointer : false,
      removeEventListener: vi.fn((type: string, callback: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.delete(callback)
      }),
      setMatches(matches: boolean) {
        mediaQuery.matches = matches
        listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent))
      },
    }
    queries.set(query, mediaQuery)
    return mediaQuery
  }))

  return queries
}

function mockRect(element: Element, left = 20, top = 30) {
  return vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: top + 100,
    height: 100,
    left,
    right: left + 100,
    top,
    width: 100,
    x: left,
    y: top,
    toJSON: () => ({}),
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SpotlightCard', () => {
  it('writes pointer coordinates relative to the card for a fine pointer', () => {
    installMatchMedia({ finePointer: true })
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })

    expect(card.style.getPropertyValue('--spotlight-x')).toBe('60px')
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('80px')
  })

  it('does not read layout or set coordinates when reduced motion is enabled', () => {
    installMatchMedia({ finePointer: true, reducedMotion: true })
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const getBoundingClientRect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })

    expect(getBoundingClientRect).not.toHaveBeenCalled()
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('')
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('')
  })

  it('does not read layout or set coordinates for a coarse pointer', () => {
    installMatchMedia()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const getBoundingClientRect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })

    expect(getBoundingClientRect).not.toHaveBeenCalled()
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('')
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('')
  })

  it('updates tracking when media preferences change', () => {
    const queries = installMatchMedia()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const getBoundingClientRect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })
    expect(getBoundingClientRect).not.toHaveBeenCalled()

    act(() => queries.get(FINE_POINTER_QUERY)?.setMatches(true))
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('60px')

    act(() => queries.get(REDUCED_MOTION_QUERY)?.setMatches(true))
    fireEvent.pointerMove(card, { clientX: 90, clientY: 120 })
    expect(getBoundingClientRect).toHaveBeenCalledTimes(1)
  })

  it('removes both media listeners with their original callbacks on unmount', () => {
    const queries = installMatchMedia({ finePointer: true })
    const rendered = render(<SpotlightCard>Content</SpotlightCard>)
    const reducedMotion = queries.get(REDUCED_MOTION_QUERY)!
    const finePointer = queries.get(FINE_POINTER_QUERY)!
    const reducedHandler = reducedMotion.addEventListener.mock.calls[0][1]
    const fineHandler = finePointer.addEventListener.mock.calls[0][1]

    rendered.unmount()

    expect(reducedMotion.removeEventListener).toHaveBeenCalledWith('change', reducedHandler)
    expect(finePointer.removeEventListener).toHaveBeenCalledWith('change', fineHandler)
  })

  it('renders semantic article content with merged classes', () => {
    installMatchMedia()
    render(<SpotlightCard className="project-card"><h2>Visible content</h2></SpotlightCard>)
    const card = screen.getByRole('article')

    expect(card).toHaveClass('spotlight-card', 'project-card')
    expect(card).not.toHaveAttribute('tabindex')
    expect(screen.getByRole('heading', { name: 'Visible content' })).toBeInTheDocument()
  })
})
