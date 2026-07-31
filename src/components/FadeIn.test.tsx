import { cleanup, render, screen } from '@testing-library/react'
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
})
