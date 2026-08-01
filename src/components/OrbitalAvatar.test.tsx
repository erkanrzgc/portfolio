import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const three = vi.hoisted(() => {
  const state = {
    failRender: false,
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
    bufferGeometries: [] as Array<{
      attributes: Record<string, unknown>
      dispose: ReturnType<typeof vi.fn>
      setAttribute: ReturnType<typeof vi.fn>
      setDrawRange: ReturnType<typeof vi.fn>
    }>,
    materials: [] as Array<{
      dispose: ReturnType<typeof vi.fn>
      options: Record<string, unknown>
    }>,
    lines: [] as Array<{
      geometry: {
        attributes: Record<string, unknown>
        setAttribute: ReturnType<typeof vi.fn>
        setDrawRange: ReturnType<typeof vi.fn>
      }
      material: { options: Record<string, unknown> }
      renderOrder: number
      visible: boolean
    }>,
    meshes: [] as Array<{
      position: { set: ReturnType<typeof vi.fn> }
      scale: { setScalar: ReturnType<typeof vi.fn> }
      visible: boolean
    }>,
    groups: [] as Array<{
      rotation: { x: number; y: number; z: number }
      scale: { setScalar: ReturnType<typeof vi.fn> }
    }>,
    points: [] as Array<{
      geometry: {
        attributes: Record<string, unknown>
        setDrawRange: ReturnType<typeof vi.fn>
      }
      material: { options: Record<string, unknown> }
      renderOrder: number
      rotation: { x: number; y: number; z: number }
    }>,
    sphereGeometries: [] as Array<{
      heightSegments: number
      radius: number
      widthSegments: number
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
    attributes: Record<string, unknown> = {}
    setAttribute = vi.fn((name: string, attribute: unknown) => {
      this.attributes[name] = attribute
    })
    setDrawRange = vi.fn()

    constructor() {
      super()
      three.bufferGeometries.push(this)
    }
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
      needsUpdate = false

      constructor(
        public array: Float32Array,
        public itemSize: number,
      ) {}
    },
    Group: class {
      add = vi.fn()
      rotation = { x: 0, y: 0, z: 0 }
      scale = { setScalar: vi.fn() }

      constructor() {
        three.groups.push(this)
      }
    },
    Line: class {
      renderOrder = 0
      visible = true

      constructor(
        public geometry: {
          attributes: Record<string, unknown>
          setAttribute: ReturnType<typeof vi.fn>
          setDrawRange: ReturnType<typeof vi.fn>
        },
        public material: { options: Record<string, unknown> },
      ) {
        three.lines.push(this)
      }
    },
    LineBasicMaterial: DisposableMaterial,
    Mesh: class {
      position = createPosition()
      scale = { setScalar: vi.fn() }
      visible = true

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
    Points: class {
      renderOrder = 0
      rotation = { x: 0, y: 0, z: 0 }

      constructor(
        public geometry: {
          attributes: Record<string, unknown>
          setDrawRange: ReturnType<typeof vi.fn>
        },
        public material: { options: Record<string, unknown> },
      ) {
        three.points.push(this)
      }
    },
    PointsMaterial: DisposableMaterial,
    SphereGeometry: class extends DisposableGeometry {
      constructor(
        public radius: number,
        public widthSegments: number,
        public heightSegments: number,
      ) {
        super()
        three.sphereGeometries.push(this)
      }
    },
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
      render = vi.fn(() => {
        if (three.failRender) {
          throw new Error('render failed')
        }
      })
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
  coarsePointer = false,
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
            : query === '(pointer: coarse)'
              ? coarsePointer
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
  three.failRender = false
  three.failRenderer = false
  three.rendererConstructor.mockClear()
  three.rendererMethodFailure = null
  three.textureResult = 'success'
  three.renderers.length = 0
  three.textures.length = 0
  three.geometries.length = 0
  three.bufferGeometries.length = 0
  three.materials.length = 0
  three.lines.length = 0
  three.meshes.length = 0
  three.groups.length = 0
  three.points.length = 0
  three.sphereGeometries.length = 0
  three.sprites.length = 0
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 1,
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

  it('renders a subtle deterministic particle field around the avatar', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.points).toHaveLength(1))
    const particleField = three.points[0]
    const position = particleField.geometry.attributes.position as {
      array: Float32Array
      itemSize: number
    }

    expect(position.itemSize).toBe(3)
    expect(position.array).toHaveLength(96 * 3)
    expect(particleField.geometry.setDrawRange).toHaveBeenLastCalledWith(0, 96)
    expect(particleField.material.options).toMatchObject({
      blending: 2,
      depthWrite: false,
      opacity: expect.any(Number),
      size: expect.any(Number),
      transparent: true,
    })
    expect(particleField.material.options.opacity).toBeLessThanOrEqual(0.4)
    expect(particleField.renderOrder).toBeGreaterThan(
      three.sprites[0].renderOrder,
    )
  })

  it('pulses the atmosphere slowly while normal motion is active', async () => {
    const browser = installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const atmosphere = three.meshes[1]
    atmosphere.scale.setScalar.mockClear()

    const [firstFrameId, firstFrame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(firstFrameId)
    act(() => firstFrame(1000))
    const firstScale = atmosphere.scale.setScalar.mock.lastCall?.[0] as number

    const [secondFrameId, secondFrame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(secondFrameId)
    act(() => secondFrame(2200))
    const secondScale = atmosphere.scale.setScalar.mock.lastCall?.[0] as number

    expect(firstScale).toBeGreaterThanOrEqual(0.97)
    expect(firstScale).toBeLessThanOrEqual(1.03)
    expect(secondScale).toBeGreaterThanOrEqual(0.97)
    expect(secondScale).toBeLessThanOrEqual(1.03)
    expect(secondScale).not.toBe(firstScale)
  })

  it('keeps renderer and core quality independent from the initial viewport', async () => {
    installControlledBrowser({ coarsePointer: true })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    })
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers).toHaveLength(1))

    expect(three.rendererConstructor).toHaveBeenCalledWith({
      alpha: true,
      antialias: true,
    })
    expect(three.sphereGeometries[0]).toMatchObject({
      heightSegments: 28,
      radius: 1.08,
      widthSegments: 36,
    })
    expect(three.sphereGeometries[1]).toMatchObject({
      heightSegments: 28,
      radius: 1.16,
      widthSegments: 36,
    })
  })

  it('reapplies mobile and tablet workloads after orientation or breakpoint changes', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const windowAddEventListener = vi.spyOn(window, 'addEventListener')
    const windowRemoveEventListener = vi.spyOn(window, 'removeEventListener')
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    })
    render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const desktopPosition = three.lines[0].geometry.attributes.position as {
      array: Float32Array
    }
    const desktopParticlePosition = three.points[0].geometry.attributes.position
    expect(desktopPosition.array).toHaveLength((96 + 1) * 3)
    expect(three.lines[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 97)
    expect(three.lines.filter((line) => line.visible)).toHaveLength(8)
    expect(three.groups[1].scale.setScalar).toHaveBeenLastCalledWith(1)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.6)

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    })
    act(() => window.dispatchEvent(new Event('orientationchange')))

    const mobilePosition = three.lines[0].geometry.attributes.position as {
      array: Float32Array
    }
    expect(mobilePosition).toBe(desktopPosition)
    expect(mobilePosition.array).toHaveLength((96 + 1) * 3)
    expect(three.lines[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 57)
    expect(three.lines.filter((line) => line.visible)).toHaveLength(5)
    expect(three.meshes.slice(2).filter((mesh) => mesh.visible)).toHaveLength(5)
    expect(three.groups[1].scale.setScalar).toHaveBeenLastCalledWith(0.76)
    expect(three.points[0].geometry.attributes.position).toBe(
      desktopParticlePosition,
    )
    expect(
      (desktopParticlePosition as { array: Float32Array }).array,
    ).toHaveLength(96 * 3)
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 28)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.15)
    expect(windowRemoveEventListener).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    )

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })
    act(() => window.dispatchEvent(new Event('resize')))

    const tabletPosition = three.lines[0].geometry.attributes.position as {
      array: Float32Array
    }
    expect(tabletPosition).toBe(desktopPosition)
    expect(tabletPosition.array).toHaveLength((96 + 1) * 3)
    expect(three.lines[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 73)
    expect(three.lines.filter((line) => line.visible)).toHaveLength(8)
    expect(three.groups[1].scale.setScalar).toHaveBeenLastCalledWith(0.88)
    expect(three.points[0].geometry.attributes.position).toBe(
      desktopParticlePosition,
    )
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 56)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.35)
    expect(
      windowAddEventListener.mock.calls.filter(([type]) => type === 'pointermove'),
    ).toHaveLength(2)
  })

  it('downgrades a wide scene when the pointer becomes coarse', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const windowRemoveEventListener = vi.spyOn(window, 'removeEventListener')
    render(<OrbitalAvatar />)

    await waitFor(() =>
      expect(browser.media.has('(pointer: coarse)')).toBe(true),
    )
    const coarsePointerMedia = browser.media.get('(pointer: coarse)')!
    coarsePointerMedia.matches = true
    const coarsePointerHandler =
      coarsePointerMedia.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1] as EventListener
    expect(coarsePointerHandler).toEqual(expect.any(Function))

    act(() =>
      coarsePointerHandler({ matches: true } as unknown as MediaQueryListEvent),
    )

    expect(three.lines.filter((line) => line.visible)).toHaveLength(5)
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 28)
    expect(windowRemoveEventListener).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    )
  })

  it('removes a failed scene and signals unavailability once after readiness', async () => {
    const browser = installControlledBrowser()
    const onReady = vi.fn()
    const onUnavailable = vi.fn()
    const rendered = render(
      <OrbitalAvatar onReady={onReady} onUnavailable={onUnavailable} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    const [frameId, frame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(frameId)
    three.failRender = true

    act(() => frame(1000))
    act(() => frame(2000))

    expect(onUnavailable).toHaveBeenCalledTimes(1)
    expect(three.renderers[0].dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(browser.pendingFrames).toHaveLength(0)
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

  it('uses the latest unavailability callback without recreating the scene', async () => {
    const browser = installControlledBrowser()
    const firstOnUnavailable = vi.fn()
    const secondOnUnavailable = vi.fn()
    const rendered = render(
      <OrbitalAvatar onUnavailable={firstOnUnavailable} />,
    )

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    rendered.rerender(<OrbitalAvatar onUnavailable={secondOnUnavailable} />)
    const [frameId, frame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(frameId)
    three.failRender = true
    act(() => frame(1000))

    expect(three.renderers).toHaveLength(1)
    expect(firstOnUnavailable).not.toHaveBeenCalled()
    expect(secondOnUnavailable).toHaveBeenCalledTimes(1)
  })

  it('cancels work and exhaustively disposes initialized resources on unmount', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const windowAddEventListener = vi.spyOn(window, 'addEventListener')
    const windowRemoveEventListener = vi.spyOn(window, 'removeEventListener')
    const documentAddEventListener = vi.spyOn(document, 'addEventListener')
    const documentRemoveEventListener = vi.spyOn(document, 'removeEventListener')
    const onReady = vi.fn()
    const onUnavailable = vi.fn()
    const rendered = render(
      <OrbitalAvatar onReady={onReady} onUnavailable={onUnavailable} />,
    )

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())
    const resizeHandler = windowAddEventListener.mock.calls.find(
      ([type]) => type === 'resize',
    )?.[1]
    const orientationHandler = windowAddEventListener.mock.calls.find(
      ([type]) => type === 'orientationchange',
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
    const finePointerMedia = browser.media.get(
      '(hover: hover) and (pointer: fine)',
    )
    const finePointerHandler =
      finePointerMedia?.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1]
    const coarsePointerMedia = browser.media.get('(pointer: coarse)')
    const coarsePointerHandler =
      coarsePointerMedia?.addEventListener.mock.calls.find(
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
      'orientationchange',
      orientationHandler,
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
    expect(finePointerMedia?.removeEventListener).toHaveBeenCalledWith(
      'change',
      finePointerHandler,
    )
    expect(coarsePointerMedia?.removeEventListener).toHaveBeenCalledWith(
      'change',
      coarsePointerHandler,
    )

    act(() => scheduledCallback(2000))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onUnavailable).not.toHaveBeenCalled()
    expect(browser.requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('renders a stable reduced-motion frame without scheduling animation', async () => {
    const browser = installControlledBrowser({ reducedMotion: true })

    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalledTimes(1))
    expect(rendered.container.querySelectorAll('canvas')).toHaveLength(1)
    expect(browser.requestAnimationFrame).not.toHaveBeenCalled()
    expect(three.meshes[1].scale.setScalar).toHaveBeenLastCalledWith(1)
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
    expect(
      three.meshes[1].scale.setScalar.mock.calls.every(([scale]) => scale === 1),
    ).toBe(true)
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
