import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpotlightCard from './SpotlightCard'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const NARROW_VIEWPORT_QUERY = '(max-width: 639px)'

interface ControlledMediaQuery {
  addEventListener: ReturnType<typeof vi.fn>
  matches: boolean
  removeEventListener: ReturnType<typeof vi.fn>
  setMatches: (matches: boolean) => void
}

interface MatchMediaOptions {
  finePointer?: boolean
  narrowViewport?: boolean
  reducedMotion?: boolean
}

function initialMatch(query: string, options: MatchMediaOptions) {
  if (query === REDUCED_MOTION_QUERY) return options.reducedMotion ?? false
  if (query === FINE_POINTER_QUERY) return options.finePointer ?? false
  if (query === NARROW_VIEWPORT_QUERY) return options.narrowViewport ?? false
  return false
}

function installMatchMedia(options: MatchMediaOptions = {}) {
  const queries = new Map<string, ControlledMediaQuery>()

  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      addEventListener: vi.fn((type: string, callback: (event: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.add(callback)
      }),
      matches: initialMatch(query, options),
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

function installLegacyMatchMedia(options: MatchMediaOptions = {}) {
  const queries = new Map<string, ControlledMediaQuery & {
    addListener: ReturnType<typeof vi.fn>
    removeListener: ReturnType<typeof vi.fn>
  }>()

  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      addListener: vi.fn((callback: (event: MediaQueryListEvent) => void) => listeners.add(callback)),
      matches: initialMatch(query, options),
      removeListener: vi.fn((callback: (event: MediaQueryListEvent) => void) => listeners.delete(callback)),
      setMatches(matches: boolean) {
        mediaQuery.matches = matches
        listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent))
      },
    }
    queries.set(query, mediaQuery as typeof mediaQuery & ControlledMediaQuery)
    return mediaQuery
  }))

  return queries
}

function installControlledFrames() {
  let frameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
  return frames
}

function runOnlyFrame(frames: Map<number, FrameRequestCallback>, time = 16) {
  expect(frames.size).toBe(1)
  const [id, callback] = [...frames.entries()][0]
  frames.delete(id)
  act(() => callback(time))
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

function expectNeutralMotion(card: HTMLElement) {
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('50%')
  expect(card.style.getPropertyValue('--spotlight-y')).toBe('50%')
  expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('0deg')
  expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('0deg')
  expect(card.style.getPropertyValue('--spotlight-lift')).toBe('0px')
  expect(card).not.toHaveAttribute('data-spotlight-active')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SpotlightCard', () => {
  it('batches pointer moves into one frame and uses the latest point', () => {
    installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 30, clientY: 40, pointerType: 'mouse' })
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    expect(frames.size).toBe(1)
    expect(rect).not.toHaveBeenCalled()

    runOnlyFrame(frames)

    expect(rect).toHaveBeenCalledTimes(1)
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('60%')
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('80%')
    expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('-1.8deg')
    expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('0.6deg')
    expect(card).toHaveAttribute('data-spotlight-active', 'true')
  })

  it('caps corner tilt at three degrees and lift at four pixels', () => {
    installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    mockRect(card)

    fireEvent.pointerMove(card, { clientX: 120, clientY: 30, pointerType: 'mouse' })
    runOnlyFrame(frames)

    expect(card.style.getPropertyValue('--spotlight-x')).toBe('100%')
    expect(card.style.getPropertyValue('--spotlight-y')).toBe('0%')
    expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('3deg')
    expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('3deg')
    expect(card.style.getPropertyValue('--spotlight-lift')).toBe('-4px')
  })

  it('cancels a pending frame and resets every value on leave', () => {
    installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    fireEvent.pointerLeave(card)

    expect(frames.size).toBe(0)
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)
    expectNeutralMotion(card)
  })

  it('uses the same complete reset path for pointer cancellation', () => {
    installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    runOnlyFrame(frames)
    expect(card).toHaveAttribute('data-spotlight-active', 'true')

    fireEvent.pointerCancel(card)

    expectNeutralMotion(card)
  })

  it('keeps a narrow fine-pointer viewport static and resets on entry', () => {
    const queries = installMatchMedia({ finePointer: true, narrowViewport: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    expect(frames.size).toBe(0)
    expect(rect).not.toHaveBeenCalled()
    expectNeutralMotion(card)

    act(() => queries.get(NARROW_VIEWPORT_QUERY)?.setMatches(false))
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    expect(frames.size).toBe(1)

    act(() => queries.get(NARROW_VIEWPORT_QUERY)?.setMatches(true))
    expect(frames.size).toBe(0)
    expectNeutralMotion(card)
  })

  it('resets and cancels work when capability changes or component unmounts', () => {
    const queries = installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    const rendered = render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    act(() => queries.get(REDUCED_MOTION_QUERY)?.setMatches(true))
    expect(frames.size).toBe(0)
    expectNeutralMotion(card)

    act(() => queries.get(REDUCED_MOTION_QUERY)?.setMatches(false))
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    expect(frames.size).toBe(1)
    rendered.unmount()
    expect(frames.size).toBe(0)
  })

  it('does not schedule work or read layout when reduced motion is enabled', () => {
    installMatchMedia({ finePointer: true, reducedMotion: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })

    expect(frames.size).toBe(0)
    expect(rect).not.toHaveBeenCalled()
    expectNeutralMotion(card)
  })

  it('does not schedule work or read layout for a coarse pointer', () => {
    installMatchMedia()
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })

    expect(frames.size).toBe(0)
    expect(rect).not.toHaveBeenCalled()
    expectNeutralMotion(card)
  })

  it('does not track touch pointers when fine-pointer media is enabled', () => {
    installMatchMedia({ finePointer: true })
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'touch' })

    expect(frames.size).toBe(0)
    expect(rect).not.toHaveBeenCalled()
    expectNeutralMotion(card)
  })

  it('updates tracking when media capabilities change', () => {
    const queries = installMatchMedia()
    const frames = installControlledFrames()
    render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)

    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    expect(frames.size).toBe(0)

    act(() => queries.get(FINE_POINTER_QUERY)?.setMatches(true))
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    runOnlyFrame(frames)
    expect(rect).toHaveBeenCalledTimes(1)
    expect(card.style.getPropertyValue('--spotlight-x')).toBe('60%')

    act(() => queries.get(FINE_POINTER_QUERY)?.setMatches(false))
    expectNeutralMotion(card)
    fireEvent.pointerMove(card, { clientX: 90, clientY: 120, pointerType: 'mouse' })
    expect(frames.size).toBe(0)
    expect(rect).toHaveBeenCalledTimes(1)
  })

  it('removes all three modern media listeners with their original callbacks', () => {
    const queries = installMatchMedia({ finePointer: true })
    const rendered = render(<SpotlightCard>Content</SpotlightCard>)
    const reducedMotion = queries.get(REDUCED_MOTION_QUERY)!
    const finePointer = queries.get(FINE_POINTER_QUERY)!
    const narrowViewport = queries.get(NARROW_VIEWPORT_QUERY)!
    const reducedHandler = reducedMotion.addEventListener.mock.calls[0][1]
    const fineHandler = finePointer.addEventListener.mock.calls[0][1]
    const narrowHandler = narrowViewport.addEventListener.mock.calls[0][1]

    rendered.unmount()

    expect(reducedMotion.removeEventListener).toHaveBeenCalledWith('change', reducedHandler)
    expect(finePointer.removeEventListener).toHaveBeenCalledWith('change', fineHandler)
    expect(narrowViewport.removeEventListener).toHaveBeenCalledWith('change', narrowHandler)
  })

  it('uses legacy media listeners to refresh tracking and clean up', () => {
    const queries = installLegacyMatchMedia()
    const frames = installControlledFrames()
    const rendered = render(<SpotlightCard>Content</SpotlightCard>)
    const card = screen.getByRole('article')
    const rect = mockRect(card)
    const reducedMotion = queries.get(REDUCED_MOTION_QUERY)!
    const finePointer = queries.get(FINE_POINTER_QUERY)!
    const narrowViewport = queries.get(NARROW_VIEWPORT_QUERY)!
    const reducedHandler = reducedMotion.addListener.mock.calls[0][0]
    const fineHandler = finePointer.addListener.mock.calls[0][0]
    const narrowHandler = narrowViewport.addListener.mock.calls[0][0]

    act(() => finePointer.setMatches(true))
    fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
    runOnlyFrame(frames)
    rendered.unmount()

    expect(rect).toHaveBeenCalledTimes(1)
    expect(reducedMotion.removeListener).toHaveBeenCalledWith(reducedHandler)
    expect(finePointer.removeListener).toHaveBeenCalledWith(fineHandler)
    expect(narrowViewport.removeListener).toHaveBeenCalledWith(narrowHandler)
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
