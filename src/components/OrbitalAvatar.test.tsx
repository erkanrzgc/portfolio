import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const three = vi.hoisted(() => {
  const state = {
    failRenderer: false,
    rendererConstructor: vi.fn(),
    rendererMethodFailure: null as 'setClearColor' | 'setPixelRatio' | null,
    textureResult: 'success' as 'success' | 'failure',
    renderers: [] as Array<{
      domElement: HTMLCanvasElement
      dispose: ReturnType<typeof vi.fn>
      render: ReturnType<typeof vi.fn>
      setClearColor: ReturnType<typeof vi.fn>
      setPixelRatio: ReturnType<typeof vi.fn>
      setSize: ReturnType<typeof vi.fn>
    }>,
    textures: [] as Array<{
      colorSpace?: unknown
      dispose: ReturnType<typeof vi.fn>
    }>,
    geometries: [] as Array<{ dispose: ReturnType<typeof vi.fn> }>,
    materials: [] as Array<{
      dispose: ReturnType<typeof vi.fn>
      options: Record<string, unknown>
    }>,
    lines: [] as Array<{
      material: { options: Record<string, unknown> }
      renderOrder: number
    }>,
    meshes: [] as Array<{
      position: { set: ReturnType<typeof vi.fn> }
    }>,
    sprites: [] as Array<{
      material: { options: Record<string, unknown> }
      renderOrder: number
    }>,
  }

  return state
})

vi.mock('three', () => {
  class DisposableGeometry {
    dispose = vi.fn()

    constructor() {
      three.geometries.push(this)
    }
  }

  class BufferGeometry extends DisposableGeometry {
    setAttribute = vi.fn()
  }

  class DisposableMaterial {
    dispose = vi.fn()

    constructor(public options: Record<string, unknown> = {}) {
      three.materials.push(this)
    }
  }

  const createPosition = () => ({ set: vi.fn() })

  return {
    AdditiveBlending: 2,
    BackSide: 1,
    BufferGeometry,
    Float32BufferAttribute: class {
      constructor(
        public array: Float32Array,
        public itemSize: number,
      ) {}
    },
    Group: class {
      add = vi.fn()
      rotation = { x: 0, y: 0, z: 0 }
    },
    Line: class {
      renderOrder = 0

      constructor(
        public geometry: unknown,
        public material: { options: Record<string, unknown> },
      ) {
        three.lines.push(this)
      }
    },
    LineBasicMaterial: DisposableMaterial,
    Mesh: class {
      position = createPosition()

      constructor(
        public geometry: unknown,
        public material: unknown,
      ) {
        three.meshes.push(this)
      }
    },
    MeshBasicMaterial: DisposableMaterial,
    PerspectiveCamera: class {
      aspect = 1
      position = { z: 0 }
      updateProjectionMatrix = vi.fn()
    },
    Scene: class {
      add = vi.fn()
    },
    SphereGeometry: class extends DisposableGeometry {},
    Sprite: class {
      position = createPosition()
      renderOrder = 0
      scale = { set: vi.fn() }

      constructor(public material: { options: Record<string, unknown> }) {
        three.sprites.push(this)
      }
    },
    SpriteMaterial: DisposableMaterial,
    SRGBColorSpace: 'srgb',
    TextureLoader: class {
      load(
        _url: string,
        onLoad: (texture: { dispose: ReturnType<typeof vi.fn> }) => void,
        _onProgress?: unknown,
        onError?: (error: unknown) => void,
      ) {
        const texture = { dispose: vi.fn() }
        three.textures.push(texture)
        queueMicrotask(() => {
          if (three.textureResult === 'failure') {
            onError?.(new Error('texture failed'))
            return
          }

          onLoad(texture)
        })
        return texture
      }
    },
    WebGLRenderer: class {
      domElement = document.createElement('canvas')
      dispose = vi.fn()
      render = vi.fn()
      setClearColor = vi.fn()
      setPixelRatio = vi.fn()
      setSize = vi.fn()

      constructor(public options: Record<string, unknown>) {
        three.rendererConstructor(options)
        if (three.failRenderer) {
          throw new Error('renderer unavailable')
        }

        this.setClearColor.mockImplementation(() => {
          if (three.rendererMethodFailure === 'setClearColor') {
            throw new Error('clear color failed')
          }
        })
        this.setPixelRatio.mockImplementation(() => {
          if (three.rendererMethodFailure === 'setPixelRatio') {
            throw new Error('pixel ratio failed')
          }
        })
        three.renderers.push(this)
      }
    },
  }
})

import OrbitalAvatar from './OrbitalAvatar'

interface ControlledBrowser {
  cancelAnimationFrame: ReturnType<typeof vi.fn>
  intersectionObservers: Array<{
    callback: IntersectionObserverCallback
    disconnect: ReturnType<typeof vi.fn>
  }>
  media: Map<string, {
    addEventListener: ReturnType<typeof vi.fn>
    matches: boolean
    removeEventListener: ReturnType<typeof vi.fn>
  }>
  pendingFrames: Map<number, FrameRequestCallback>
  requestAnimationFrame: ReturnType<typeof vi.fn>
  resizeObservers: Array<{
    callback: ResizeObserverCallback
    disconnect: ReturnType<typeof vi.fn>
  }>
}

function installControlledBrowser({
  finePointer = false,
  reducedMotion = false,
} = {}): ControlledBrowser {
  let frameId = 0
  const pendingFrames = new Map<number, FrameRequestCallback>()
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    frameId += 1
    pendingFrames.set(frameId, callback)
    return frameId
  })
  const cancelAnimationFrame = vi.fn((id: number) => {
    pendingFrames.delete(id)
  })
  const media = new Map()

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      const queryList = {
        addEventListener: vi.fn(),
        matches:
          query === '(prefers-reduced-motion: reduce)'
            ? reducedMotion
            : query === '(hover: hover) and (pointer: fine)'
              ? finePointer
              : false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      }
      media.set(query, queryList)
      return queryList
    }),
  )

  const resizeObservers: ControlledBrowser['resizeObservers'] = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()

      constructor(public callback: ResizeObserverCallback) {
        resizeObservers.push(this)
      }
    },
  )

  const intersectionObservers: ControlledBrowser['intersectionObservers'] = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()

      constructor(public callback: IntersectionObserverCallback) {
        intersectionObservers.push(this)
      }
    },
  )

  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false,
  })

  return {
    cancelAnimationFrame,
    intersectionObservers,
    media,
    pendingFrames,
    requestAnimationFrame,
    resizeObservers,
  }
}

beforeEach(() => {
  three.failRenderer = false
  three.rendererConstructor.mockClear()
  three.rendererMethodFailure = null
  three.textureResult = 'success'
  three.renderers.length = 0
  three.textures.length = 0
  three.geometries.length = 0
  three.materials.length = 0
  three.lines.length = 0
  three.meshes.length = 0
  three.sprites.length = 0
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('OrbitalAvatar', () => {
  it('does not construct a renderer when the dynamic import resolves after unmount', async () => {
    installControlledBrowser()
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar onReady={onReady} />)
    rendered.unmount()
    await act(async () => undefined)

    expect(three.renderers).toHaveLength(0)
    expect(onReady).not.toHaveBeenCalled()
  })

  it('keeps an empty decorative wrapper when renderer creation fails', async () => {
    installControlledBrowser()
    three.failRenderer = true
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar className="hero-orbit" onReady={onReady} />)

    await waitFor(() => expect(rendered.container.firstElementChild).not.toBeNull())
    await act(async () => undefined)
    const wrapper = rendered.container.firstElementChild
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper).toHaveClass('pointer-events-none', 'hero-orbit')
    expect(wrapper?.querySelector('canvas')).toBeNull()
    expect(three.rendererConstructor).toHaveBeenCalledTimes(1)
    expect(onReady).not.toHaveBeenCalled()
  })

  it('disposes renderer initialization when configuration throws', async () => {
    installControlledBrowser()
    three.rendererMethodFailure = 'setClearColor'
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar onReady={onReady} />)

    await waitFor(() =>
      expect(three.renderers[0]?.dispose).toHaveBeenCalledTimes(1),
    )
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
  })

  it('appends and renders one canvas before signalling readiness once', async () => {
    const browser = installControlledBrowser()
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar onReady={onReady} />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalledTimes(1))
    const canvas = rendered.container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas?.style.display).toBe('block')
    expect(canvas?.style.width).toBe('100%')
    expect(canvas?.style.height).toBe('100%')
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(three.lines).toHaveLength(8)
    expect(three.meshes).toHaveLength(10)
    expect(browser.pendingFrames).toHaveLength(1)

    const [frameId, frame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(frameId)
    act(() => frame(1000))

    expect(three.renderers[0].render).toHaveBeenCalledTimes(2)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(three.meshes.slice(2).every((mesh) => mesh.position.set.mock.calls.length > 0)).toBe(true)
    expect(browser.pendingFrames).toHaveLength(1)
  })

  it('uses the avatar as a depth-writing prepass before depth-tested orbit lines', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.sprites).toHaveLength(1))
    const avatar = three.sprites[0]
    expect(avatar.material.options.alphaTest).toEqual(expect.any(Number))
    expect(avatar.material.options.alphaTest).toBeGreaterThan(0)
    expect(avatar.material.options.depthTest).toBe(true)
    expect(avatar.material.options.depthWrite).toBe(true)
    expect(avatar.material.options.map).toBe(three.textures[0])
    expect(three.textures[0].colorSpace).toBe('srgb')
    expect(three.lines.length).toBeGreaterThan(0)
    expect(
      three.lines.every(
        (line) =>
          line.renderOrder > avatar.renderOrder &&
          line.material.options.depthTest === true &&
          line.material.options.depthWrite === false,
      ),
    ).toBe(true)
  })

  it('does not recreate the scene when the readiness callback identity changes', async () => {
    installControlledBrowser()
    const firstOnReady = vi.fn()
    const secondOnReady = vi.fn()
    const rendered = render(<OrbitalAvatar onReady={firstOnReady} />)

    await waitFor(() => expect(firstOnReady).toHaveBeenCalledTimes(1))
    rendered.rerender(<OrbitalAvatar onReady={secondOnReady} />)
    await act(async () => undefined)

    expect(three.renderers).toHaveLength(1)
    expect(firstOnReady).toHaveBeenCalledTimes(1)
    expect(secondOnReady).not.toHaveBeenCalled()
  })

  it('cancels work and exhaustively disposes initialized resources on unmount', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const windowAddEventListener = vi.spyOn(window, 'addEventListener')
    const windowRemoveEventListener = vi.spyOn(window, 'removeEventListener')
    const documentAddEventListener = vi.spyOn(document, 'addEventListener')
    const documentRemoveEventListener = vi.spyOn(document, 'removeEventListener')
    const onReady = vi.fn()
    const rendered = render(<OrbitalAvatar onReady={onReady} />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())
    const resizeHandler = windowAddEventListener.mock.calls.find(
      ([type]) => type === 'resize',
    )?.[1]
    const pointerHandler = windowAddEventListener.mock.calls.find(
      ([type]) => type === 'pointermove',
    )?.[1]
    const visibilityHandler = documentAddEventListener.mock.calls.find(
      ([type]) => type === 'visibilitychange',
    )?.[1]
    const reducedMotionMedia = browser.media.get(
      '(prefers-reduced-motion: reduce)',
    )
    const reducedMotionHandler = reducedMotionMedia?.addEventListener.mock.calls.find(
      ([type]) => type === 'change',
    )?.[1]
    const scheduledCallback = [...browser.pendingFrames.values()][0]
    rendered.unmount()

    expect(browser.cancelAnimationFrame).toHaveBeenCalledTimes(1)
    expect(browser.resizeObservers[0].disconnect).toHaveBeenCalledTimes(1)
    expect(browser.intersectionObservers[0].disconnect).toHaveBeenCalledTimes(1)
    expect(three.textures[0].dispose).toHaveBeenCalledTimes(1)
    expect(three.geometries.length).toBeGreaterThan(0)
    expect(three.geometries.every((geometry) => geometry.dispose.mock.calls.length === 1)).toBe(true)
    expect(three.materials.length).toBeGreaterThan(0)
    expect(three.materials.every((material) => material.dispose.mock.calls.length === 1)).toBe(true)
    expect(three.renderers[0].dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(windowRemoveEventListener).toHaveBeenCalledWith(
      'resize',
      resizeHandler,
    )
    expect(windowRemoveEventListener).toHaveBeenCalledWith(
      'pointermove',
      pointerHandler,
    )
    expect(documentRemoveEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      visibilityHandler,
    )
    expect(reducedMotionMedia?.removeEventListener).toHaveBeenCalledWith(
      'change',
      reducedMotionHandler,
    )

    act(() => scheduledCallback(2000))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(browser.requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('renders a stable reduced-motion frame without scheduling animation', async () => {
    const browser = installControlledBrowser({ reducedMotion: true })

    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalledTimes(1))
    expect(rendered.container.querySelectorAll('canvas')).toHaveLength(1)
    expect(browser.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('redraws the stable reduced-motion frame after resize', async () => {
    const browser = installControlledBrowser({ reducedMotion: true })
    render(<OrbitalAvatar />)

    await waitFor(() =>
      expect(three.renderers[0]?.render).toHaveBeenCalledTimes(1),
    )
    act(() =>
      browser.resizeObservers[0].callback([], {} as ResizeObserver),
    )

    expect(three.renderers[0].render).toHaveBeenCalledTimes(2)
    expect(browser.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('disposes the renderer and resources without mounting a canvas when texture loading fails', async () => {
    installControlledBrowser()
    three.textureResult = 'failure'
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar onReady={onReady} />)

    await waitFor(() => expect(three.renderers[0]?.dispose).toHaveBeenCalledTimes(1))
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(three.textures[0].dispose).toHaveBeenCalledTimes(1)
    expect(three.geometries.length).toBeGreaterThan(0)
    expect(three.geometries.every((geometry) => geometry.dispose.mock.calls.length === 1)).toBe(true)
    expect(three.materials.length).toBeGreaterThan(0)
    expect(three.materials.every((material) => material.dispose.mock.calls.length === 1)).toBe(true)
    expect(onReady).not.toHaveBeenCalled()
  })

  it('refreshes the visible animation loop without duplicate frames', async () => {
    const browser = installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    expect(browser.intersectionObservers).toHaveLength(1)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(browser.pendingFrames).toHaveLength(0)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(browser.pendingFrames).toHaveLength(1)

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(browser.pendingFrames).toHaveLength(0)

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expect(browser.pendingFrames).toHaveLength(1)
  })

  it('skips pointer layout work while offscreen or document-hidden', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    const getBoundingClientRect = vi.spyOn(wrapper, 'getBoundingClientRect')

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    act(() =>
      window.dispatchEvent(
        new MouseEvent('pointermove', { clientX: 10, clientY: 10 }),
      ),
    )

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    act(() =>
      window.dispatchEvent(
        new MouseEvent('pointermove', { clientX: 20, clientY: 20 }),
      ),
    )

    expect(getBoundingClientRect).not.toHaveBeenCalled()
  })
})
