import { useEffect, useRef } from 'react'

import {
  createOrbitPoints,
  createOrbitPosition,
  getOrbitDefinitions,
} from './orbitalAvatarGeometry'

export interface OrbitalAvatarProps {
  className?: string
  onReady?: () => void
  onUnavailable?: () => void
}

const AVATAR_TEXTURE = '/images/avatar-transparent.png'
const MOBILE_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

export default function OrbitalAvatar({
  className,
  onReady,
  onUnavailable,
}: OrbitalAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onReadyRef = useRef(onReady)
  const onUnavailableRef = useRef(onUnavailable)
  onReadyRef.current = onReady
  onUnavailableRef.current = onUnavailable

  useEffect(() => {
    const currentContainer = containerRef.current
    if (!currentContainer) return
    const container: HTMLDivElement = currentContainer

    let cancelled = false
    let disposeScene = () => undefined

    async function initialize() {
      let THREE: typeof import('three')

      try {
        THREE = await import('three')
      } catch {
        return
      }

      if (cancelled) return

      let disposed = false
      let frameId: number | null = null
      let resizeObserver: ResizeObserver | null = null
      let intersectionObserver: IntersectionObserver | null = null
      let texture: import('three').Texture | null = null
      let renderer: import('three').WebGLRenderer | null = null
      let sceneReady = false
      let unavailableSignalled = false
      const geometries: Array<{ dispose: () => void }> = []
      const materials: Array<{ dispose: () => void }> = []
      const removeListeners: Array<() => void> = []
      const disposeSafely = (action: () => void) => {
        try {
          action()
        } catch {
          // Cleanup continues so one faulty resource cannot leak the rest.
        }
      }
      const failScene = () => {
        const shouldNotify =
          sceneReady && !cancelled && !disposed && !unavailableSignalled
        disposeScene()
        if (shouldNotify) {
          unavailableSignalled = true
          disposeSafely(() => onUnavailableRef.current?.())
        }
      }

      try {
        const mobileQuery = window.matchMedia(MOBILE_QUERY)
        const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
        const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY)
        const isMobile = mobileQuery.matches || window.innerWidth < 768
        const hasFinePointer = finePointerQuery.matches
        let prefersReducedMotion = reducedMotionQuery.matches
        let intersectsViewport = true
        let readySignalled = false

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: !isMobile,
        })

        disposeScene = () => {
          if (disposed) return
          disposed = true
          if (frameId !== null) {
            const scheduledFrame = frameId
            frameId = null
            disposeSafely(() => cancelAnimationFrame(scheduledFrame))
          }
          disposeSafely(() => resizeObserver?.disconnect())
          disposeSafely(() => intersectionObserver?.disconnect())
          removeListeners.splice(0).forEach(disposeSafely)
          if (texture) disposeSafely(() => texture?.dispose())
          geometries.forEach((geometry) =>
            disposeSafely(() => geometry.dispose()),
          )
          materials.forEach((material) =>
            disposeSafely(() => material.dispose()),
          )
          disposeSafely(() => renderer?.dispose())
          disposeSafely(() => renderer?.domElement.remove())
        }

        renderer.setClearColor(0x000000, 0)
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6),
        )

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
        camera.position.z = 5.4
        const root = new THREE.Group()
        scene.add(root)

        const coreGeometry = new THREE.SphereGeometry(
          1.08,
          isMobile ? 24 : 36,
          isMobile ? 18 : 28,
        )
        geometries.push(coreGeometry)
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          depthWrite: false,
          opacity: 0.09,
          transparent: true,
        })
        materials.push(coreMaterial)
        const core = new THREE.Mesh(coreGeometry, coreMaterial)
        root.add(core)

        const atmosphereGeometry = new THREE.SphereGeometry(
          1.16,
          isMobile ? 24 : 36,
          isMobile ? 18 : 28,
        )
        geometries.push(atmosphereGeometry)
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: 0xa855f7,
          depthWrite: false,
          opacity: 0.055,
          side: THREE.BackSide,
          transparent: true,
        })
        materials.push(atmosphereMaterial)
        const atmosphere = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial,
        )
        root.add(atmosphere)

        const orbits = getOrbitDefinitions(isMobile)
        const satellites = orbits.map((orbit) => {
          const orbitGeometry = new THREE.BufferGeometry()
          geometries.push(orbitGeometry)
          orbitGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
              createOrbitPoints(orbit, isMobile ? 56 : 96),
              3,
            ),
          )
          const orbitMaterial = new THREE.LineBasicMaterial({
            color: orbit.color,
            depthTest: true,
            depthWrite: false,
            opacity: 0.3,
            transparent: true,
          })
          materials.push(orbitMaterial)
          const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
          orbitLine.renderOrder = 2
          root.add(orbitLine)

          const satelliteGeometry = new THREE.SphereGeometry(
            isMobile ? 0.035 : 0.04,
            10,
            8,
          )
          geometries.push(satelliteGeometry)
          const satelliteMaterial = new THREE.MeshBasicMaterial({
            blending: THREE.AdditiveBlending,
            color: orbit.color,
            depthTest: true,
            depthWrite: false,
            transparent: true,
          })
          materials.push(satelliteMaterial)
          const satellite = new THREE.Mesh(
            satelliteGeometry,
            satelliteMaterial,
          )
          satellite.renderOrder = 2
          root.add(satellite)

          return { mesh: satellite, orbit }
        })

        const pointer = { x: 0, y: 0 }

        const renderFrame = (time: number) => {
          if (disposed || !renderer) return
          const animationTime = prefersReducedMotion ? 0 : time

          satellites.forEach(({ mesh, orbit }) => {
            const [x, y, z] = createOrbitPosition(
              orbit,
              orbit.phase + animationTime * orbit.speed * orbit.direction,
            )
            mesh.position.set(x, y, z)
          })

          root.rotation.x = prefersReducedMotion
            ? 0.04
            : 0.04 + pointer.y * 0.06
          root.rotation.y = prefersReducedMotion
            ? 0
            : animationTime * 0.000025 + pointer.x * 0.08
          renderer.render(scene, camera)
        }

        const resize = () => {
          if (disposed || !renderer) return
          const width = Math.max(1, container.clientWidth)
          const height = Math.max(1, container.clientHeight)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height, false)
          if (sceneReady && (prefersReducedMotion || frameId === null)) {
            renderFrame(performance.now())
          }
        }

        const shouldAnimate = () =>
          !disposed &&
          !prefersReducedMotion &&
          intersectsViewport &&
          !document.hidden

        const refreshLoop = () => {
          if (shouldAnimate()) {
            if (frameId === null) {
              frameId = requestAnimationFrame(animate)
            }
            return
          }

          if (frameId !== null) {
            cancelAnimationFrame(frameId)
            frameId = null
          }
        }

        const animate = (time: number) => {
          frameId = null
          if (disposed) return

          try {
            renderFrame(time)
            refreshLoop()
          } catch {
            failScene()
          }
        }

        const safelyResize = () => {
          try {
            resize()
          } catch {
            failScene()
          }
        }
        const handleVisibilityChange = () => {
          try {
            refreshLoop()
          } catch {
            failScene()
          }
        }
        const handlePointerMove = (event: PointerEvent) => {
          if (
            disposed ||
            prefersReducedMotion ||
            !intersectsViewport ||
            document.hidden
          ) {
            return
          }

          try {
            const bounds = container.getBoundingClientRect()
            const width = Math.max(1, bounds.width)
            const height = Math.max(1, bounds.height)
            pointer.x = ((event.clientX - bounds.left) / width - 0.5) * 2
            pointer.y = ((event.clientY - bounds.top) / height - 0.5) * 2
          } catch {
            failScene()
          }
        }
        const handleReducedMotionChange = (event: MediaQueryListEvent) => {
          try {
            prefersReducedMotion = event.matches
            refreshLoop()
            if (prefersReducedMotion) renderFrame(0)
          } catch {
            failScene()
          }
        }

        const loadedTexture = await new Promise<import('three').Texture>(
          (resolve, reject) => {
            texture = new THREE.TextureLoader().load(
              AVATAR_TEXTURE,
              resolve,
              undefined,
              reject,
            )
          },
        )
        if (cancelled || disposed) {
          if (texture !== loadedTexture) loadedTexture.dispose()
          return
        }
        texture = loadedTexture
        loadedTexture.colorSpace = THREE.SRGBColorSpace

        const avatarMaterial = new THREE.SpriteMaterial({
          alphaTest: 0.02,
          depthTest: true,
          depthWrite: true,
          map: texture,
          transparent: true,
        })
        materials.push(avatarMaterial)
        const avatar = new THREE.Sprite(avatarMaterial)
        avatar.renderOrder = 1
        avatar.scale.set(2.12, 2.12, 1)
        root.add(avatar)

        const canvas = renderer.domElement
        canvas.setAttribute('aria-hidden', 'true')
        Object.assign(canvas.style, {
          display: 'block',
          height: '100%',
          opacity: '0',
          transition: 'opacity 500ms ease-out',
          width: '100%',
        })

        resize()
        renderFrame(performance.now())
        sceneReady = true
        if (cancelled || disposed) {
          disposeScene()
          return
        }

        container.appendChild(canvas)
        void canvas.offsetWidth
        canvas.style.opacity = '1'

        window.addEventListener('resize', safelyResize)
        removeListeners.push(() =>
          window.removeEventListener('resize', safelyResize),
        )
        document.addEventListener('visibilitychange', handleVisibilityChange)
        removeListeners.push(() =>
          document.removeEventListener(
            'visibilitychange',
            handleVisibilityChange,
          ),
        )
        reducedMotionQuery.addEventListener(
          'change',
          handleReducedMotionChange,
        )
        removeListeners.push(() =>
          reducedMotionQuery.removeEventListener(
            'change',
            handleReducedMotionChange,
          ),
        )
        if (hasFinePointer) {
          window.addEventListener('pointermove', handlePointerMove)
          removeListeners.push(() =>
            window.removeEventListener('pointermove', handlePointerMove),
          )
        }

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(safelyResize)
          resizeObserver.observe(container)
        }
        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver((entries) => {
            try {
              intersectsViewport = entries.some((entry) => entry.isIntersecting)
              refreshLoop()
            } catch {
              failScene()
            }
          })
          intersectionObserver.observe(container)
        }

        if (!readySignalled) {
          readySignalled = true
          onReadyRef.current?.()
        }
        refreshLoop()
      } catch {
        failScene()
      }
    }

    void initialize()

    return () => {
      cancelled = true
      disposeScene()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={['pointer-events-none', className].filter(Boolean).join(' ')}
    />
  )
}
