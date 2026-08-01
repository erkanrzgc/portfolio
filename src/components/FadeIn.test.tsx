import { cleanup, render, screen } from '@testing-library/react'
import { MotionConfig } from 'framer-motion'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import FadeIn from './FadeIn'

afterEach(cleanup)

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
})

describe('FadeIn', () => {
  it('renders its polymorphic wrapper as a list item', () => {
    render(
      <ul>
        <FadeIn as="li" className="service-grid-item">
          Service content
        </FadeIn>
      </ul>,
    )

    expect(screen.getByRole('listitem')).toHaveClass('service-grid-item')
  })

  it('preserves its DOM node when a parent rerenders with the same element type', () => {
    const { rerender } = render(
      <FadeIn as="section" className="fade-shell">
        First render
      </FadeIn>,
    )
    const initialNode = screen.getByText('First render')

    rerender(
      <FadeIn as="section" className="fade-shell">
        Second render
      </FadeIn>,
    )

    expect(screen.getByText('Second render')).toBe(initialNode)
  })

  it('renders its final static state when reduced motion is requested', () => {
    render(
      <MotionConfig reducedMotion="always">
        <FadeIn delay={5} duration={10} x={48} y={32}>
          Reduced motion content
        </FadeIn>
      </MotionConfig>,
    )

    const wrapper = screen.getByText('Reduced motion content')
    expect(wrapper).not.toHaveStyle({ opacity: '0' })
    expect(wrapper.style.transform).toBe('')
  })
})
