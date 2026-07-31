import { useEffect, useRef } from 'react'

import {
  createOrbitPoints,
  createOrbitPosition,
  getOrbitDefinitions,
} from './orbitalAvatarGeometry'

export interface OrbitalAvatarProps {
  className?: string
  onReady?: () => void
}

const AVATAR_TEXTURE = '/images/avatar-transparent.png'
const MOBILE_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

export default function OrbitalAvatar({
  className,
  onReady,
}: OrbitalAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

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

      const mobileQuery = window.matchMedia(MOBILE_QUERY)
      const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
      const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY)
      const isMobile = mobileQuery.matches || window.innerWidth < 768
      const hasFinePointer = finePointerQuery.matches
      let prefersReducedMotion = reducedMotionQuery.matches
      let intersectsViewport = true
      let disposed = false
      let frameId: number | null = null
      let resizeObserver: ResizeObserver | null = null
      let intersectionObserver: IntersectionObserver | null = null
      let texture: import('three').Texture | null = null
      let readySignalled = false
      const geometries: Array<{ dispose: () => void }> = []
      const materials: Array<{ dispose: () => void }> = []

      let renderer: import('three').WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: !isMobile,
        })
      } catch {
        return
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
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        depthWrite: false,
        opacity: 0.09,
        transparent: true,
      })
      const core = new THREE.Mesh(coreGeometry, coreMaterial)
      geometries.push(coreGeometry)
      materials.push(coreMaterial)
      root.add(core)

      const atmosphereGeometry = new THREE.SphereGeometry(
        1.16,
        isMobile ? 24 : 36,
        isMobile ? 18 : 28,
      )
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xa855f7,
        depthWrite: false,
        opacity: 0.055,
        side: THREE.BackSide,
        transparent: true,
      })
      const atmosphere = new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial,
      )
      geometries.push(atmosphereGeometry)
      materials.push(atmosphereMaterial)
      root.add(atmosphere)

      const orbits = getOrbitDefinitions(isMobile)
      const satellites = orbits.map((orbit) => {
        const orbitGeometry = new THREE.BufferGeometry()
        orbitGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            createOrbitPoints(orbit, isMobile ? 56 : 96),
            3,
          ),
        )
        const orbitMaterial = new THREE.LineBasicMaterial({
          color: orbit.color,
          depthWrite: false,
          opacity: 0.3,
          transparent: true,
        })
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
        geometries.push(orbitGeometry)
        materials.push(orbitMaterial)
        root.add(orbitLine)

        const satelliteGeometry = new THREE.SphereGeometry(
          isMobile ? 0.035 : 0.04,
          10,
          8,
        )
        const satelliteMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: orbit.color,
          depthWrite: false,
          transparent: true,
        })
        const satellite = new THREE.Mesh(
          satelliteGeometry,
          satelliteMaterial,
        )
        geometries.push(satelliteGeometry)
        materials.push(satelliteMaterial)
        root.add(satellite)

        return { mesh: satellite, orbit }
      })

      const pointer = { x: 0, y: 0 }

      const resize = () => {
        if (disposed) return
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height, false)
      }

      const renderFrame = (time: number) => {
        if (disposed) return
        const animationTime = prefersReducedMotion ? 0 : time

        satellites.forEach(({ mesh, orbit }) => {
          const [x, y, z] = createOrbitPosition(
            orbit,
            orbit.phase + animationTime * orbit.speed * orbit.direction,
          )
          mesh.position.set(x, y, z)
        })

        root.rotation.x = prefersReducedMotion ? 0.04 : 0.04 + pointer.y * 0.06
        root.rotation.y = prefersReducedMotion
          ? 0
          : animationTime * 0.000025 + pointer.x * 0.08
        renderer.render(scene, camera)
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
        } catch {
          disposeScene()
          return
        }
        refreshLoop()
      }

      const handleVisibilityChange = () => refreshLoop()
      const handlePointerMove = (event: PointerEvent) => {
        if (disposed || prefersReducedMotion) return
        const bounds = container.getBoundingClientRect()
        const width = Math.max(1, bounds.width)
        const height = Math.max(1, bounds.height)
        pointer.x = ((event.clientX - bounds.left) / width - 0.5) * 2
        pointer.y = ((event.clientY - bounds.top) / height - 0.5) * 2
      }
      const handleReducedMotionChange = (event: MediaQueryListEvent) => {
        prefersReducedMotion = event.matches
        refreshLoop()
        if (prefersReducedMotion) {
          try {
            renderFrame(0)
          } catch {
            disposeScene()
          }
        }
      }

      disposeScene = () => {
        if (disposed) return
        disposed = true
        if (frameId !== null) {
          cancelAnimationFrame(frameId)
          frameId = null
        }
        resizeObserver?.disconnect()
        intersectionObserver?.disconnect()
        window.removeEventListener('resize', resize)
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        )
        if (hasFinePointer) {
          window.removeEventListener('pointermove', handlePointerMove)
        }
        reducedMotionQuery.removeEventListener(
          'change',
          handleReducedMotionChange,
        )
        texture?.dispose()
        geometries.forEach((geometry) => geometry.dispose())
        materials.forEach((material) => material.dispose())
        renderer.dispose()
        renderer.domElement.remove()
      }

      let loadedTexture: import('three').Texture
      try {
        loadedTexture = await new Promise<import('three').Texture>(
          (resolve, reject) => {
            texture = new THREE.TextureLoader().load(
              AVATAR_TEXTURE,
              resolve,
              undefined,
              reject,
            )
          },
        )
      } catch {
        if (!cancelled) disposeScene()
        return
      }

      if (cancelled || disposed) {
        if (texture !== loadedTexture) loadedTexture.dispose()
        return
      }
      texture = loadedTexture

      const avatarMaterial = new THREE.SpriteMaterial({
        alphaTest: 0.02,
        depthTest: false,
        depthWrite: false,
        map: texture,
        transparent: true,
      })
      const avatar = new THREE.Sprite(avatarMaterial)
      avatar.scale.set(2.12, 2.12, 1)
      materials.push(avatarMaterial)
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
      try {
        renderFrame(performance.now())
      } catch {
        disposeScene()
        return
      }
      if (cancelled || disposed) {
        disposeScene()
        return
      }

      container.appendChild(canvas)
      void canvas.offsetWidth
      canvas.style.opacity = '1'

      window.addEventListener('resize', resize)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
      if (hasFinePointer) {
        window.addEventListener('pointermove', handlePointerMove)
      }

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
      }
      if (typeof IntersectionObserver !== 'undefined') {
        intersectionObserver = new IntersectionObserver((entries) => {
          intersectsViewport = entries.some((entry) => entry.isIntersecting)
          refreshLoop()
        })
        intersectionObserver.observe(container)
      }

      if (!readySignalled) {
        readySignalled = true
        onReadyRef.current?.()
      }
      refreshLoop()
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
