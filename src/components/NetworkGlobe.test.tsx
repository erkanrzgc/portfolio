import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rendererConstruction = vi.hoisted(() => vi.fn())

vi.mock('three', () => ({
  WebGLRenderer: class {
    constructor() {
      rendererConstruction()
      throw new Error('WebGL is unavailable')
    }
  },
}))

import NetworkGlobe from './NetworkGlobe'

describe('NetworkGlobe', () => {
  beforeEach(() => {
    rendererConstruction.mockClear()
  })

  it('renders a non-interactive decorative wrapper with supplied classes', () => {
    const { container } = render(<NetworkGlobe className="test-layer" />)
    const wrapper = container.firstElementChild

    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper).toHaveClass('pointer-events-none', 'test-layer')
  })

  it('does not initialize Three.js after unmounting', async () => {
    const rendered = render(<NetworkGlobe />)

    rendered.unmount()
    await act(async () => {
      await Promise.resolve()
    })

    expect(rendererConstruction).not.toHaveBeenCalled()
    expect(rendered.container.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('leaves the wrapper empty when WebGL renderer creation fails', async () => {
    let rendered: ReturnType<typeof render> | undefined

    expect(() => {
      rendered = render(<NetworkGlobe />)
    }).not.toThrow()

    await waitFor(() => expect(rendererConstruction).toHaveBeenCalledOnce())
    expect(rendered?.container.querySelector('canvas')).not.toBeInTheDocument()
    expect(rendered?.container.firstElementChild).toBeEmptyDOMElement()
  })
})
