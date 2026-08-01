import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GLOW_LAYERS,
  GLOW_TEXTURE_SIZE,
  createRadialGlowTextureData,
} from './orbitalGlow'

const three = vi.hoisted(() => {
  const state = {
    failRender: false,
    failRenderer: false,
    rendererConstructor: vi.fn(),
    rendererMethodFailure: null as 'setClearColor' | 'setPixelRatio' | null,
    textureResult: 'success' as 'success' | 'failure' | 'pending',
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
    textureRequests: [] as Array<{
      onError?: (error: unknown) => void
      onLoad: (texture: { dispose: ReturnType<typeof vi.fn> }) => void
    }>,
    dataTextures: [] as Array<{
      data: Uint8Array
      width: number
      height: number
      format: unknown
      dispose: ReturnType<typeof vi.fn>
      needsUpdate: boolean
      magFilter?: unknown
      minFilter?: unknown
      generateMipmaps: boolean
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
      opacity: number
      options: Record<string, unknown>
      rotation: number
    }>,
    lines: [] as Array<{
      geometry: {
        attributes: Record<string, unknown>
        setAttribute: ReturnType<typeof vi.fn>
        setDrawRange: ReturnType<typeof vi.fn>
      }
      material: { opacity: number; options: Record<string, unknown> }
      renderOrder: number
      visible: boolean
    }>,
    meshes: [] as Array<{
      position: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
      }
      scale: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
        setScalar: ReturnType<typeof vi.fn>
      }
      visible: boolean
    }>,
    scenes: [] as Array<{
      add: ReturnType<typeof vi.fn>
      children: unknown[]
    }>,
    groups: [] as Array<{
      add: ReturnType<typeof vi.fn>
      children: unknown[]
      name: string
      position: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
      }
      rotation: { x: number; y: number; z: number }
      scale: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
        setScalar: ReturnType<typeof vi.fn>
      }
      visible: boolean
    }>,
    points: [] as Array<{
      geometry: {
        attributes: Record<string, unknown>
        setDrawRange: ReturnType<typeof vi.fn>
      }
      material: { options: Record<string, unknown> }
      position: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
      }
      scale: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
        setScalar: ReturnType<typeof vi.fn>
      }
      renderOrder: number
      rotation: { x: number; y: number; z: number }
    }>,
    sphereGeometries: [] as Array<{
      heightSegments: number
      radius: number
      widthSegments: number
    }>,
    sprites: [] as Array<{
      material: {
        opacity: number
        options: Record<string, unknown>
        rotation: number
      }
      position: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
      }
      scale: {
        x: number
        y: number
        z: number
        set: ReturnType<typeof vi.fn>
        setScalar: ReturnType<typeof vi.fn>
      }
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
    opacity: number
    rotation = 0

    constructor(public options: Record<string, unknown> = {}) {
      this.opacity = (options.opacity as number | undefined) ?? 1
      three.materials.push(this)
    }
  }

  const createPosition = () => {
    const position = {
      x: 0,
      y: 0,
      z: 0,
      set: vi.fn((x: number, y: number, z: number) => {
        position.x = x
        position.y = y
        position.z = z
      }),
    }
    return position
  }

  const createScale = () => {
    const scale = {
      x: 1,
      y: 1,
      z: 1,
      set: vi.fn((x: number, y: number, z: number) => {
        scale.x = x
        scale.y = y
        scale.z = z
      }),
      setScalar: vi.fn((value: number) => {
        scale.x = value
        scale.y = value
        scale.z = value
      }),
    }
    return scale
  }

  return {
    AdditiveBlending: 2,
    BackSide: 1,
    BufferGeometry,
    DataTexture: class {
      dispose = vi.fn()
      needsUpdate = false
      magFilter?: unknown
      minFilter?: unknown
      generateMipmaps = true

      constructor(
        public data: Uint8Array,
        public width: number,
        public height: number,
        public format: unknown,
      ) {
        three.dataTextures.push(this)
      }
    },
    Float32BufferAttribute: class {
      needsUpdate = false

      constructor(
        public array: Float32Array,
        public itemSize: number,
      ) {}
    },
    LinearFilter: 'linear',
    Group: class {
      children: unknown[] = []
      name = ''
      visible = true
      add = vi.fn((child: unknown) => this.children.push(child))
      position = createPosition()
      rotation = { x: 0, y: 0, z: 0 }
      scale = createScale()

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
        public material: { opacity: number; options: Record<string, unknown> },
      ) {
        three.lines.push(this)
      }
    },
    LineBasicMaterial: DisposableMaterial,
    Mesh: class {
      position = createPosition()
      scale = createScale()
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
      children: unknown[] = []
      add = vi.fn((child: unknown) => this.children.push(child))

      constructor() {
        three.scenes.push(this)
      }
    },
    Points: class {
      position = createPosition()
      renderOrder = 0
      rotation = { x: 0, y: 0, z: 0 }
      scale = createScale()

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
      scale = createScale()

      constructor(
        public material: {
          opacity: number
          options: Record<string, unknown>
          rotation: number
        },
      ) {
        three.sprites.push(this)
      }
    },
    SpriteMaterial: DisposableMaterial,
    RGBAFormat: 'rgba',
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
        three.textureRequests.push({ onError, onLoad })
        if (three.textureResult === 'pending') return texture
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

function getGroup(name: string) {
  const group = three.groups.find((candidate) => candidate.name === name)
  if (!group) throw new Error(`Expected group ${name}`)
  return group
}

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

function runNextFrame(browser: ControlledBrowser, time: number) {
  const nextFrame = browser.pendingFrames.entries().next().value as
    | [number, FrameRequestCallback]
    | undefined
  if (!nextFrame) throw new Error('Expected a pending animation frame')

  const [frameId, callback] = nextFrame
  browser.pendingFrames.delete(frameId)
  act(() => callback(time))
}

function createPointerEvent(
  type: string,
  {
    button = 0,
    clientX = 0,
    clientY = 0,
    isPrimary = true,
    pointerId = 1,
    pointerType = 'mouse',
  }: Partial<Pick<PointerEvent,
    'button' | 'clientX' | 'clientY' | 'isPrimary' | 'pointerId' | 'pointerType'
  >> = {},
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    button: { value: button },
    clientX: { value: clientX },
    clientY: { value: clientY },
    isPrimary: { value: isPrimary },
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })
  return event as PointerEvent
}

function mockWrapperBounds(wrapper: HTMLDivElement) {
  vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
    bottom: 600,
    height: 400,
    left: 100,
    right: 700,
    top: 200,
    width: 600,
    x: 100,
    y: 200,
    toJSON: () => undefined,
  })
}

function installPointerCapture(
  wrapper: HTMLDivElement,
  { dispatchLostSynchronously = false } = {},
) {
  const capturedPointers = new Set<number>()
  const setPointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.add(pointerId)
  })
  const hasPointerCapture = vi.fn((pointerId: number) =>
    capturedPointers.has(pointerId),
  )
  const releasePointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.delete(pointerId)
    if (dispatchLostSynchronously) {
      wrapper.dispatchEvent(createPointerEvent('lostpointercapture', { pointerId }))
    }
  })
  Object.defineProperties(wrapper, {
    hasPointerCapture: { configurable: true, value: hasPointerCapture },
    releasePointerCapture: { configurable: true, value: releasePointerCapture },
    setPointerCapture: { configurable: true, value: setPointerCapture },
  })
  return { hasPointerCapture, releasePointerCapture, setPointerCapture }
}

beforeEach(() => {
  three.failRender = false
  three.failRenderer = false
  three.rendererConstructor.mockClear()
  three.rendererMethodFailure = null
  three.textureResult = 'success'
  three.renderers.length = 0
  three.textures.length = 0
  three.textureRequests.length = 0
  three.dataTextures.length = 0
  three.geometries.length = 0
  three.bufferGeometries.length = 0
  three.materials.length = 0
  three.lines.length = 0
  three.meshes.length = 0
  three.scenes.length = 0
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
    expect(three.lines).toHaveLength(11)
    expect(three.meshes).toHaveLength(13)
    expect(browser.pendingFrames).toHaveLength(1)

    const [frameId, frame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(frameId)
    act(() => frame(1000))

    expect(three.renderers[0].render).toHaveBeenCalledTimes(2)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(three.meshes.slice(2).every((mesh) => mesh.position.set.mock.calls.length > 0)).toBe(true)
    expect(browser.pendingFrames).toHaveLength(1)
  })

  it('builds the avatar, interaction, glow, and orbit actors as named rigs', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())

    expect(three.groups).toHaveLength(16)
    const root = getGroup('root')
    const avatarRig = getGroup('avatarRig')
    const interactionRig = getGroup('interactionRig')
    const orbitalGroup = getGroup('orbitalGroup')
    const glowGroup = getGroup('glowGroup')
    const orbitRigs = Array.from({ length: 11 }, (_, index) =>
      getGroup(`orbitRig-${index}`),
    )

    expect(three.scenes[0].children).toHaveLength(2)
    expect(three.scenes[0].children).toEqual(
      expect.arrayContaining([root, glowGroup]),
    )

    expect(root.children).toHaveLength(2)
    expect(root.children).toEqual(
      expect.arrayContaining([avatarRig, interactionRig]),
    )

    expect(avatarRig.children).toHaveLength(3)
    expect(avatarRig.children).toEqual(
      expect.arrayContaining([
        three.meshes[0],
        three.meshes[1],
        three.sprites[2],
      ]),
    )

    expect(interactionRig.children).toHaveLength(2)
    expect(interactionRig.children).toEqual(
      expect.arrayContaining([three.points[0], orbitalGroup]),
    )

    expect(glowGroup.children).toHaveLength(2)
    expect(glowGroup.children).toEqual(
      expect.arrayContaining([three.sprites[0], three.sprites[1]]),
    )

    expect(orbitalGroup.children).toHaveLength(11)
    expect(orbitalGroup.children).toEqual(expect.arrayContaining(orbitRigs))

    orbitRigs.forEach((orbitRig, index) => {
      expect(orbitRig.children).toHaveLength(2)
      expect(orbitRig.children).toEqual(
        expect.arrayContaining([three.lines[index], three.meshes[index + 2]]),
      )
    })
  })

  it('layers pointer motion through the interaction rig with avatar and glow lag', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const interactionRig = getGroup('interactionRig')
    const avatarRig = getGroup('avatarRig')
    const glowGroup = getGroup('glowGroup')
    const orbitRig = getGroup('orbitRig-0')

    runNextFrame(browser, 1000)
    const initialGlowRotation = { ...glowGroup.rotation }
    const initialOrbitRotation = { ...orbitRig.rotation }
    act(() =>
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 700,
        clientY: 400,
        pointerId: 99,
        pointerType: 'mouse',
      })),
    )
    runNextFrame(browser, 1016)

    expect(interactionRig.rotation.y).not.toBe(0)
    expect(Math.abs(avatarRig.position.x)).toBeGreaterThan(0)
    expect(Math.abs(avatarRig.position.x)).toBeLessThan(
      Math.abs(interactionRig.rotation.y),
    )
    expect(orbitRig.rotation).not.toEqual(initialOrbitRotation)
    expect(glowGroup.position.x).toBe(avatarRig.position.x)
    expect(glowGroup.position.y).toBe(avatarRig.position.y)
    expect(glowGroup.rotation).toEqual(initialGlowRotation)
    expect(browser.pendingFrames).toHaveLength(1)
  })

  it.each([
    { button: 1, label: 'middle' },
    { button: 2, label: 'right' },
  ])('ignores $label mouse pointerdown', async ({ button }) => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const capture = installPointerCapture(wrapper)
    const interactionRig = getGroup('interactionRig')
    runNextFrame(browser, 1000)
    const initialYaw = interactionRig.rotation.y

    act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
      button,
      clientX: 400,
      clientY: 400,
      pointerId: 50 + button,
      pointerType: 'mouse',
    })))

    expect(capture.setPointerCapture).not.toHaveBeenCalled()
    expect(wrapper.style.cursor).toBe('grab')
    runNextFrame(browser, 1016)
    expect(interactionRig.rotation.x).toBe(0.04)
    expect(interactionRig.rotation.y - initialYaw).toBeCloseTo(
      0.016 * 0.025,
      12,
    )

    act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
      pointerId: 60 + button,
      pointerType: 'mouse',
    })))
    expect(capture.setPointerCapture).toHaveBeenCalledWith(60 + button)
  })

  it('preserves a fine-pointer flick released before the next frame', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const interactionRig = getGroup('interactionRig')
    const capture = installPointerCapture(wrapper, {
      dispatchLostSynchronously: true,
    })
    runNextFrame(browser, 1000)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 7,
        pointerType: 'mouse',
      }))
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 520,
        clientY: 360,
        pointerId: 7,
        pointerType: 'mouse',
      }))
      wrapper.dispatchEvent(createPointerEvent('pointerup', {
        clientX: 520,
        clientY: 360,
        pointerId: 7,
        pointerType: 'mouse',
      }))
    })

    expect(capture.setPointerCapture).toHaveBeenCalledWith(7)
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(1)
    runNextFrame(browser, 1016)
    const releasedYaw = interactionRig.rotation.y
    runNextFrame(browser, 1032)
    expect(Math.abs(interactionRig.rotation.y - releasedYaw)).toBeGreaterThan(
      0.016 * 0.025,
    )
  })

  it('keeps vertical touch intent native and applies horizontal touch momentum', async () => {
    const browser = installControlledBrowser({ coarsePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const capture = installPointerCapture(wrapper)
    const interactionRig = getGroup('interactionRig')
    runNextFrame(browser, 1000)
    const beforeVertical = interactionRig.rotation.y

    const verticalMove = createPointerEvent('pointermove', {
      clientX: 406,
      clientY: 440,
      pointerId: 8,
      pointerType: 'touch',
    })
    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 8,
        pointerType: 'touch',
      }))
      wrapper.dispatchEvent(verticalMove)
      wrapper.dispatchEvent(createPointerEvent('pointerup', {
        clientX: 406,
        clientY: 440,
        pointerId: 8,
        pointerType: 'touch',
      }))
    })

    expect(verticalMove.defaultPrevented).toBe(false)
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(8)
    runNextFrame(browser, 1016)
    expect(interactionRig.rotation.y - beforeVertical).toBeCloseTo(
      0.016 * 0.025,
      8,
    )

    const horizontalMove = createPointerEvent('pointermove', {
      clientX: 450,
      clientY: 406,
      pointerId: 9,
      pointerType: 'touch',
    })
    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 9,
        pointerType: 'touch',
      }))
      wrapper.dispatchEvent(horizontalMove)
      wrapper.dispatchEvent(createPointerEvent('pointerup', {
        clientX: 450,
        clientY: 406,
        pointerId: 9,
        pointerType: 'touch',
      }))
    })

    expect(horizontalMove.defaultPrevented).toBe(true)
    runNextFrame(browser, 1032)
    const releasedYaw = interactionRig.rotation.y
    runNextFrame(browser, 1048)
    expect(Math.abs(interactionRig.rotation.y - releasedYaw)).toBeGreaterThan(
      0.016 * 0.025,
    )
  })

  it('clears stale cancellation when a new drag starts before the next frame', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const capture = installPointerCapture(wrapper)
    const interactionRig = getGroup('interactionRig')
    runNextFrame(browser, 1000)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 12,
      }))
      wrapper.dispatchEvent(createPointerEvent('pointercancel', {
        clientX: 400,
        clientY: 400,
        pointerId: 12,
      }))
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 13,
      }))
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 490,
        clientY: 400,
        pointerId: 13,
      }))
      wrapper.dispatchEvent(createPointerEvent('pointerup', {
        clientX: 490,
        clientY: 400,
        pointerId: 13,
      }))
    })

    expect(capture.setPointerCapture).toHaveBeenNthCalledWith(1, 12)
    expect(capture.setPointerCapture).toHaveBeenNthCalledWith(2, 13)
    runNextFrame(browser, 1016)
    const releasedYaw = interactionRig.rotation.y
    runNextFrame(browser, 1032)
    expect(Math.abs(interactionRig.rotation.y - releasedYaw)).toBeGreaterThan(
      0.016 * 0.025,
    )
  })

  it('cancels capture on pointer cancellation, visibility, loss, and profile changes', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const interactionRig = getGroup('interactionRig')
    const capture = installPointerCapture(wrapper, {
      dispatchLostSynchronously: true,
    })
    runNextFrame(browser, 1000)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 20 }))
      wrapper.dispatchEvent(createPointerEvent('pointercancel', { pointerId: 20 }))
    })
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(1)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 21 }))
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 22 }))
      wrapper.dispatchEvent(createPointerEvent('lostpointercapture', {
        pointerId: 22,
      }))
    })
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(3)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 23 }))
      const coarseMedia = browser.media.get('(pointer: coarse)')!
      coarseMedia.matches = true
      const handler = coarseMedia.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1] as EventListener
      handler({ matches: true } as unknown as MediaQueryListEvent)
    })
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(4)

    const reducedMotionMedia = browser.media.get(
      '(prefers-reduced-motion: reduce)',
    )!
    const reducedMotionHandler =
      reducedMotionMedia.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1] as EventListener
    const activeMove = createPointerEvent('pointermove', {
      clientX: 490,
      clientY: 406,
      pointerId: 24,
      pointerType: 'touch',
    })
    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 400,
        pointerId: 24,
        pointerType: 'touch',
      }))
      wrapper.dispatchEvent(activeMove)
      reducedMotionMedia.matches = true
      reducedMotionHandler({ matches: true } as unknown as MediaQueryListEvent)
    })

    expect(activeMove.defaultPrevented).toBe(true)
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(5)
    expect(wrapper.style.pointerEvents).toBe('none')
    expect(wrapper.style.touchAction).toBe('')
    expect(wrapper.style.cursor).toBe('')
    expect(browser.pendingFrames).toHaveLength(0)
    expect(interactionRig.rotation.x).toBe(0.04)
    expect(interactionRig.rotation.y).toBe(0)
  })

  it('cancels an uncaptured drag when the pointer leaves the surface', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    Object.defineProperty(wrapper, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('capture unavailable')
      }),
    })
    runNextFrame(browser, 1000)

    act(() => {
      wrapper.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 40 }))
      wrapper.dispatchEvent(createPointerEvent('pointerleave', { pointerId: 40 }))
    })

    const capture = installPointerCapture(wrapper)
    act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
      pointerId: 41,
    })))
    expect(capture.setPointerCapture).toHaveBeenCalledWith(41)
  })

  it('exposes interaction styles only for a ready interactive scene', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)
    const wrapper = rendered.container.firstElementChild as HTMLDivElement

    expect(wrapper.style.pointerEvents).toBe('none')
    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const capture = installPointerCapture(wrapper)
    expect(wrapper.style.pointerEvents).toBe('auto')
    expect(wrapper.style.touchAction).toBe('pan-y')
    expect(wrapper.style.cursor).toBe('grab')

    act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
      pointerId: 31,
      pointerType: 'mouse',
    })))
    expect(wrapper.style.cursor).toBe('grabbing')
    act(() => wrapper.dispatchEvent(createPointerEvent('pointerup', {
      pointerId: 31,
      pointerType: 'mouse',
    })))
    expect(wrapper.style.cursor).toBe('grab')

    act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
      pointerId: 32,
      pointerType: 'mouse',
    })))

    rendered.unmount()
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(32)
    expect(wrapper.style.pointerEvents).toBe('none')
    expect(wrapper.style.touchAction).toBe('')
    expect(wrapper.style.cursor).toBe('')
  })

  it('keeps reduced-motion and failed scenes noninteractive', async () => {
    installControlledBrowser({ reducedMotion: true })
    const reduced = render(<OrbitalAvatar />)
    const reducedWrapper = reduced.container.firstElementChild as HTMLDivElement
    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())
    expect(reducedWrapper.style.pointerEvents).toBe('none')
    expect(reducedWrapper.style.touchAction).toBe('')
    expect(reducedWrapper.style.cursor).toBe('')
    reduced.unmount()

    installControlledBrowser()
    three.failRenderer = true
    const failed = render(<OrbitalAvatar />)
    const failedWrapper = failed.container.firstElementChild as HTMLDivElement
    await act(async () => undefined)
    expect(failedWrapper).toHaveClass('pointer-events-none')
    expect(failedWrapper.style.pointerEvents).toBe('none')
  })

  it('attaches ready container listeners once and removes the original callbacks', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    three.textureResult = 'pending'
    const windowAddEventListener = vi.spyOn(window, 'addEventListener')
    const rendered = render(<OrbitalAvatar />)
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    const addEventListener = vi.spyOn(wrapper, 'addEventListener')
    const removeEventListener = vi.spyOn(wrapper, 'removeEventListener')
    const interactionTypes = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
      'pointerleave',
    ]

    await waitFor(() => expect(three.textureRequests).toHaveLength(1))
    expect(
      addEventListener.mock.calls.filter(([type]) =>
        interactionTypes.includes(type),
      ),
    ).toHaveLength(0)
    await act(async () => three.textureRequests[0].onLoad(three.textures[0]))
    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const attached = addEventListener.mock.calls.filter(([type]) =>
      interactionTypes.includes(type),
    ) as Array<[string, EventListener]>
    expect(attached.map(([type]) => type)).toEqual(interactionTypes)
    expect(
      windowAddEventListener.mock.calls.filter(([type]) => type === 'pointermove'),
    ).toHaveLength(0)
    const originalCallbacks = attached.map(([, callback]) => callback)
    const interactionAdds = () =>
      addEventListener.mock.calls.filter(([type]) =>
        interactionTypes.includes(type),
      ) as Array<[string, EventListener]>
    const interactionRemovals = () =>
      removeEventListener.mock.calls.filter(([type]) =>
        interactionTypes.includes(type),
      ) as Array<[string, EventListener]>
    const expectExactBatches = (
      calls: Array<[string, EventListener]>,
      batchCount: number,
    ) => {
      expect(calls).toHaveLength(interactionTypes.length * batchCount)
      for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        const batch = calls.slice(
          batchIndex * interactionTypes.length,
          (batchIndex + 1) * interactionTypes.length,
        )
        expect(batch.map(([type]) => type)).toEqual(interactionTypes)
        expect(batch.map(([, callback]) => callback)).toEqual(originalCallbacks)
      }
    }

    act(() => window.dispatchEvent(new Event('resize')))
    act(() => window.dispatchEvent(new Event('resize')))
    expectExactBatches(interactionAdds(), 1)
    expectExactBatches(interactionRemovals(), 0)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expectExactBatches(interactionAdds(), 1)
    expectExactBatches(interactionRemovals(), 1)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expectExactBatches(interactionAdds(), 2)
    expectExactBatches(interactionRemovals(), 1)

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expectExactBatches(interactionAdds(), 2)
    expectExactBatches(interactionRemovals(), 2)
    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    expectExactBatches(interactionAdds(), 3)
    expectExactBatches(interactionRemovals(), 2)

    const reducedMotionMedia = browser.media.get(
      '(prefers-reduced-motion: reduce)',
    )!
    const reducedMotionHandler =
      reducedMotionMedia.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1] as EventListener
    reducedMotionMedia.matches = true
    act(() =>
      reducedMotionHandler({ matches: true } as unknown as MediaQueryListEvent),
    )
    expectExactBatches(interactionAdds(), 3)
    expectExactBatches(interactionRemovals(), 3)
    reducedMotionMedia.matches = false
    act(() =>
      reducedMotionHandler({ matches: false } as unknown as MediaQueryListEvent),
    )
    expectExactBatches(interactionAdds(), 4)
    expectExactBatches(interactionRemovals(), 3)

    rendered.unmount()
    expectExactBatches(interactionAdds(), 4)
    expectExactBatches(interactionRemovals(), 4)
  })

  it('resumes animation without integrating time spent while paused', async () => {
    const browser = installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    runNextFrame(browser, 1000)
    const satellitePosition = { ...three.meshes[2].position }

    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    act(() =>
      browser.resizeObservers[0].callback([], {} as ResizeObserver),
    )
    act(() =>
      browser.intersectionObservers[0].callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    runNextFrame(browser, 10000)

    expect(three.meshes[2].position).toEqual(satellitePosition)
  })

  it('reuses all orbit rigs while profiles change their visibility', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())
    const orbitRigs = Array.from({ length: 11 }, (_, index) =>
      getGroup(`orbitRig-${index}`),
    )
    expect(orbitRigs.filter((rig) => rig.visible)).toHaveLength(11)
    expect(three.lines).toHaveLength(11)

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })
    act(() => window.dispatchEvent(new Event('resize')))

    expect(orbitRigs.filter((rig) => rig.visible)).toHaveLength(9)
    expect(three.lines).toHaveLength(11)
    expect(
      orbitRigs.every((rig, index) => rig === getGroup(`orbitRig-${index}`)),
    ).toBe(true)

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    })
    act(() => window.dispatchEvent(new Event('orientationchange')))

    expect(orbitRigs.filter((rig) => rig.visible)).toHaveLength(6)
    expect(three.lines).toHaveLength(11)
    expect(three.groups).toHaveLength(16)
  })

  it('applies each orbit visual weight to its line and satellite', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())

    expect(three.lines[8].material.opacity).toBeCloseTo(0.3 * 0.84)
    expect(three.meshes[10].scale.setScalar).toHaveBeenCalledWith(0.84)
    expect(three.lines[10].material.opacity).toBeCloseTo(0.3 * 0.72)
    expect(three.meshes[12].scale.setScalar).toHaveBeenCalledWith(0.72)
  })

  it('renders two glow sprites before the avatar sprite', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.sprites).toHaveLength(3))

    const [avatar] = three.sprites.slice(2)
    expect(avatar.renderOrder).toBe(1)
    GLOW_LAYERS.forEach((definition, index) => {
      const glow = three.sprites[index]
      expect(glow.renderOrder).toBe(0)
      expect(glow.position.set).toHaveBeenCalledWith(0, 0, definition.z)
      expect(definition.z).toBeLessThan(0)
      expect(glow.scale.set).toHaveBeenCalledWith(
        definition.scale[0],
        definition.scale[1],
        1,
      )
    })
  })

  it('keeps glow sprites aligned with the avatar while the interaction rig rotates', async () => {
    const browser = installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.sprites).toHaveLength(3))
    expect(three.groups).toHaveLength(16)

    const interactionRig = getGroup('interactionRig')
    const avatarRig = getGroup('avatarRig')
    const glowGroup = getGroup('glowGroup')
    const initialGlowRotation = { ...glowGroup.rotation }
    const initialInteractionRotation = { ...interactionRig.rotation }
    expect(three.scenes[0].add).toHaveBeenCalledWith(glowGroup)
    GLOW_LAYERS.forEach((_definition, index) => {
      expect(glowGroup.add).toHaveBeenCalledWith(three.sprites[index])
      expect(interactionRig.add).not.toHaveBeenCalledWith(three.sprites[index])
    })

    runNextFrame(browser, 1000)
    runNextFrame(browser, 1040)

    expect(interactionRig.rotation).not.toEqual(initialInteractionRotation)
    expect(glowGroup.rotation).toEqual(initialGlowRotation)
    expect(glowGroup.position.x).toBe(avatarRig.position.x)
    expect(glowGroup.position.y).toBe(avatarRig.position.y)
  })

  it('shares one configured procedural texture between the glow layers', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.sprites).toHaveLength(3))

    expect(three.dataTextures).toHaveLength(1)
    const glowTexture = three.dataTextures[0]
    expect(glowTexture).toMatchObject({
      format: 'rgba',
      generateMipmaps: false,
      magFilter: 'linear',
      minFilter: 'linear',
      needsUpdate: true,
      width: GLOW_TEXTURE_SIZE,
      height: GLOW_TEXTURE_SIZE,
    })
    expect(glowTexture.data).toEqual(createRadialGlowTextureData())
    GLOW_LAYERS.forEach((definition, index) => {
      const glow = three.sprites[index]
      expect(glow.material.opacity).toBe(definition.opacity)
      expect(glow.material.options).toMatchObject({
        blending: 2,
        color: definition.color,
        depthTest: true,
        depthWrite: false,
        map: glowTexture,
        opacity: definition.opacity,
        transparent: true,
      })
    })
  })

  it('keeps the core shells effectively transparent so they cannot form a filled disc', async () => {
    installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())

    expect(three.materials[0].opacity).toBe(0.003)
    expect(three.materials[1].opacity).toBe(0.004)
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
      three.sprites[2].renderOrder,
    )
  })

  it('pulses the inner glow slowly while normal motion is active', async () => {
    const browser = installControlledBrowser()
    render(<OrbitalAvatar />)

    await waitFor(() => expect(three.sprites).toHaveLength(3))
    three.sprites.slice(0, 2).forEach((sprite) => sprite.scale.set.mockClear())

    runNextFrame(browser, 1000)
    runNextFrame(browser, 1040)

    GLOW_LAYERS.forEach((definition, index) => {
      const breath =
        1 + Math.sin(0.04 * 0.45 + definition.pulseOffset) * 0.018
      const [width, height, depth] =
        three.sprites[index].scale.set.mock.lastCall as [number, number, number]
      expect(width).toBeCloseTo(definition.scale[0] * breath, 12)
      expect(height).toBeCloseTo(definition.scale[1] * breath, 12)
      expect(depth).toBe(1)
      expect(Math.abs(breath - 1)).toBeLessThanOrEqual(0.018)
    })
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
    expect(
      three.groups.filter(
        (group) => group.name.startsWith('orbitRig-') && group.visible,
      ),
    ).toHaveLength(11)
    expect(
      getGroup('interactionRig').scale.setScalar,
    ).toHaveBeenLastCalledWith(1)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.6)
    const desktopGlowSprites = [...three.sprites.slice(0, 2)]
    const desktopGlowTexture = three.dataTextures[0]
    expect(desktopGlowSprites).toHaveLength(2)
    GLOW_LAYERS.forEach((definition, index) => {
      expect(desktopGlowSprites[index].material.opacity).toBe(
        definition.opacity,
      )
    })

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
    expect(three.lines).toHaveLength(11)
    expect(three.meshes).toHaveLength(13)
    expect(
      three.groups.filter(
        (group) => group.name.startsWith('orbitRig-') && group.visible,
      ),
    ).toHaveLength(6)
    expect(
      getGroup('interactionRig').scale.setScalar,
    ).toHaveBeenLastCalledWith(0.76)
    expect(three.points[0].geometry.attributes.position).toBe(
      desktopParticlePosition,
    )
    expect(
      (desktopParticlePosition as { array: Float32Array }).array,
    ).toHaveLength(96 * 3)
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 28)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.15)
    expect(three.sprites).toHaveLength(3)
    expect(three.dataTextures[0]).toBe(desktopGlowTexture)
    expect(three.dataTextures).toHaveLength(1)
    GLOW_LAYERS.forEach((definition, index) => {
      const glow = three.sprites[index]
      expect(glow).toBe(desktopGlowSprites[index])
      expect(glow.scale.set).toHaveBeenLastCalledWith(
        definition.scale[0] * 0.84,
        definition.scale[1] * 0.84,
        1,
      )
      expect(glow.material.opacity).toBeCloseTo(definition.opacity * 0.7)
    })
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
    expect(three.lines).toHaveLength(11)
    expect(
      three.groups.filter(
        (group) => group.name.startsWith('orbitRig-') && group.visible,
      ),
    ).toHaveLength(9)
    expect(
      getGroup('interactionRig').scale.setScalar,
    ).toHaveBeenLastCalledWith(0.88)
    expect(three.points[0].geometry.attributes.position).toBe(
      desktopParticlePosition,
    )
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 56)
    expect(three.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1.35)
  })

  it('downgrades a wide scene when the pointer becomes coarse', async () => {
    const browser = installControlledBrowser({ finePointer: true })
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

    expect(
      three.groups.filter(
        (group) => group.name.startsWith('orbitRig-') && group.visible,
      ),
    ).toHaveLength(6)
    expect(three.lines).toHaveLength(11)
    expect(three.points[0].geometry.setDrawRange).toHaveBeenLastCalledWith(0, 28)
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

    await waitFor(() => expect(three.sprites).toHaveLength(3))
    const avatar = three.sprites[2]
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
    expect(three.dataTextures[0].dispose).toHaveBeenCalledTimes(1)
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
    const avatarRig = getGroup('avatarRig')
    const glowGroup = getGroup('glowGroup')
    expect(avatarRig.position.x).toBe(0)
    expect(avatarRig.position.y).toBe(0)
    expect(avatarRig.scale.setScalar).toHaveBeenLastCalledWith(1)
    expect(glowGroup.position.x).toBe(0)
    expect(glowGroup.position.y).toBe(0)
    expect(three.meshes[1].scale.setScalar).toHaveBeenLastCalledWith(1)
    GLOW_LAYERS.forEach((definition, index) => {
      expect(three.sprites[index].scale.set).toHaveBeenLastCalledWith(
        definition.scale[0],
        definition.scale[1],
        1,
      )
    })
  })

  it('resets active motion when reduced motion is enabled and resumes from neutral', async () => {
    const browser = installControlledBrowser({ finePointer: true })
    const rendered = render(<OrbitalAvatar />)

    await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
    const wrapper = rendered.container.firstElementChild as HTMLDivElement
    mockWrapperBounds(wrapper)
    const interactionRig = getGroup('interactionRig')
    const avatarRig = getGroup('avatarRig')
    const glowGroup = getGroup('glowGroup')
    const avatarMaterial = three.sprites[2].material
    const initialGlowRotation = { ...glowGroup.rotation }

    runNextFrame(browser, 1000)
    act(() =>
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 700,
        clientY: 400,
        pointerId: 99,
        pointerType: 'mouse',
      })),
    )
    runNextFrame(browser, 1016)
    expect(interactionRig.rotation.y).not.toBe(0)
    expect(avatarRig.position.x).not.toBe(0)
    expect(avatarMaterial.rotation).not.toBe(0)

    const reducedMotionMedia = browser.media.get(
      '(prefers-reduced-motion: reduce)',
    )!
    const reducedMotionHandler =
      reducedMotionMedia.addEventListener.mock.calls.find(
        ([type]) => type === 'change',
      )?.[1] as EventListener
    reducedMotionMedia.matches = true
    act(() =>
      reducedMotionHandler({ matches: true } as unknown as MediaQueryListEvent),
    )

    expect(browser.pendingFrames).toHaveLength(0)
    expect(interactionRig.rotation.x).toBe(0.04)
    expect(interactionRig.rotation.y).toBe(0)
    expect(avatarRig.position.x).toBe(0)
    expect(avatarRig.position.y).toBe(0)
    expect(avatarRig.scale.setScalar).toHaveBeenLastCalledWith(1)
    expect(avatarMaterial.rotation).toBe(0)
    expect(glowGroup.position.x).toBe(0)
    expect(glowGroup.position.y).toBe(0)
    expect(glowGroup.rotation).toEqual(initialGlowRotation)

    const scheduledFrames = browser.requestAnimationFrame.mock.calls.length
    reducedMotionMedia.matches = false
    act(() =>
      reducedMotionHandler({ matches: false } as unknown as MediaQueryListEvent),
    )

    expect(browser.requestAnimationFrame).toHaveBeenCalledTimes(
      scheduledFrames + 1,
    )
    expect(browser.pendingFrames).toHaveLength(1)
    runNextFrame(browser, 10000)
    expect(interactionRig.rotation.x).toBe(0.04)
    expect(interactionRig.rotation.y).toBe(0)
    expect(avatarRig.position.x).toBe(0)
    expect(avatarRig.position.y).toBe(0)
    expect(avatarMaterial.rotation).toBe(0)

    runNextFrame(browser, 10016)
    expect(interactionRig.rotation.x).toBe(0.04)
    expect(interactionRig.rotation.y).toBeCloseTo(0.016 * 0.025, 12)
    expect(avatarRig.position.x).toBe(0)
    expect(avatarRig.position.y).toBe(0)
    expect(avatarMaterial.rotation).toBe(0)
    expect(glowGroup.position.x).toBe(0)
    expect(glowGroup.position.y).toBe(0)
    expect(glowGroup.rotation).toEqual(initialGlowRotation)
    expect(browser.pendingFrames).toHaveLength(1)
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
    GLOW_LAYERS.forEach((definition, index) => {
      expect(three.sprites[index].scale.set).toHaveBeenLastCalledWith(
        definition.scale[0],
        definition.scale[1],
        1,
      )
    })
  })

  it('disposes the renderer and resources without mounting a canvas when texture loading fails', async () => {
    installControlledBrowser()
    three.textureResult = 'failure'
    const onReady = vi.fn()

    const rendered = render(<OrbitalAvatar onReady={onReady} />)

    await waitFor(() => expect(three.renderers[0]?.dispose).toHaveBeenCalledTimes(1))
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(three.textures[0].dispose).toHaveBeenCalledTimes(1)
    expect(three.dataTextures[0].dispose).toHaveBeenCalledTimes(1)
    expect(three.geometries.length).toBeGreaterThan(0)
    expect(three.geometries.every((geometry) => geometry.dispose.mock.calls.length === 1)).toBe(true)
    expect(three.materials.length).toBeGreaterThan(0)
    expect(three.materials.every((material) => material.dispose.mock.calls.length === 1)).toBe(true)
    expect(onReady).not.toHaveBeenCalled()
  })

  it('disposes pending avatar and glow textures once when an unmounted request later succeeds', async () => {
    installControlledBrowser()
    three.textureResult = 'pending'
    const onReady = vi.fn()
    const onUnavailable = vi.fn()
    const rendered = render(
      <OrbitalAvatar onReady={onReady} onUnavailable={onUnavailable} />,
    )

    await waitFor(() => expect(three.dataTextures).toHaveLength(1))
    await waitFor(() => expect(three.textureRequests).toHaveLength(1))
    const avatarTexture = three.textures[0]
    const glowTexture = three.dataTextures[0]
    rendered.unmount()

    expect(avatarTexture.dispose).toHaveBeenCalledTimes(1)
    expect(glowTexture.dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()

    await act(async () => three.textureRequests[0].onLoad(avatarTexture))

    expect(avatarTexture.dispose).toHaveBeenCalledTimes(1)
    expect(glowTexture.dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
  })

  it('disposes pending avatar and glow textures once when an unmounted request later fails', async () => {
    installControlledBrowser()
    three.textureResult = 'pending'
    const onReady = vi.fn()
    const onUnavailable = vi.fn()
    const rendered = render(
      <OrbitalAvatar onReady={onReady} onUnavailable={onUnavailable} />,
    )

    await waitFor(() => expect(three.dataTextures).toHaveLength(1))
    await waitFor(() => expect(three.textureRequests).toHaveLength(1))
    const avatarTexture = three.textures[0]
    const glowTexture = three.dataTextures[0]
    rendered.unmount()

    expect(avatarTexture.dispose).toHaveBeenCalledTimes(1)
    expect(glowTexture.dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()

    await act(async () =>
      three.textureRequests[0].onError?.(new Error('texture failed')),
    )

    expect(avatarTexture.dispose).toHaveBeenCalledTimes(1)
    expect(glowTexture.dispose).toHaveBeenCalledTimes(1)
    expect(rendered.container.querySelector('canvas')).toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
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
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 10,
        clientY: 10,
      })),
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
      wrapper.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 20,
        clientY: 20,
      })),
    )

    expect(getBoundingClientRect).not.toHaveBeenCalled()
  })
})
