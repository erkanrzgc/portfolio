import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const rendererRender = vi.hoisted(() => vi.fn())

vi.mock('three', () => {
  class Disposable {
    dispose = vi.fn()
  }

  class BufferGeometry extends Disposable {
    setAttribute = vi.fn()
  }

  return {
    AdditiveBlending: 2,
    BackSide: 1,
    BufferAttribute: class {},
    BufferGeometry,
    Float32BufferAttribute: class {},
    Group: class {
      add = vi.fn()
      rotation = { x: 0, y: 0 }
    },
    LineBasicMaterial: Disposable,
    LineSegments: class {},
    Mesh: class {},
    MeshBasicMaterial: Disposable,
    PerspectiveCamera: class {
      aspect = 1
      position = { z: 0 }
      updateProjectionMatrix = vi.fn()
    },
    Points: class {},
    PointsMaterial: Disposable,
    Scene: class {
      add = vi.fn()
    },
    SphereGeometry: BufferGeometry,
    WebGLRenderer: class {
      domElement = document.createElement('canvas')
      dispose = vi.fn()
      render = rendererRender
      setClearColor = vi.fn()
      setPixelRatio = vi.fn()
      setSize = vi.fn()
    },
  }
})

import NetworkGlobe from './NetworkGlobe'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('NetworkGlobe reduced motion', () => {
  it('renders one static frame without scheduling continuous animation', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        (query) =>
          ({
            addEventListener: vi.fn(),
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    )
    const requestAnimationFrame = vi.fn().mockReturnValue(1)
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)

    const rendered = render(<NetworkGlobe />)

    await waitFor(() => expect(rendererRender).toHaveBeenCalled())
    expect(rendered.container.querySelectorAll('canvas')).toHaveLength(1)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
