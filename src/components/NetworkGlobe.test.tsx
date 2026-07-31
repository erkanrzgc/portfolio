import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()

  return {
    ...actual,
    WebGLRenderer: class {
      constructor() {
        throw new Error('WebGL is unavailable')
      }
    },
  }
})

import NetworkGlobe from './NetworkGlobe'

describe('NetworkGlobe', () => {
  it('renders a non-interactive decorative wrapper with supplied classes', () => {
    const { container } = render(<NetworkGlobe className="test-layer" />)
    const wrapper = container.firstElementChild

    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper).toHaveClass('pointer-events-none', 'test-layer')
  })

  it('leaves the wrapper empty when WebGL renderer creation fails', () => {
    let rendered: ReturnType<typeof render> | undefined

    expect(() => {
      rendered = render(<NetworkGlobe />)
    }).not.toThrow()

    expect(rendered?.container.querySelector('canvas')).not.toBeInTheDocument()
    expect(rendered?.container.firstElementChild).toBeEmptyDOMElement()
  })
})
