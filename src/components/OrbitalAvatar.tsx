import { useEffect, useRef } from 'react'

import {
  createOrbitPoints,
  createOrbitPosition,
  createParticlePositions,
  getOrbitDefinitions,
  getOrbitalSceneProfile,
  type OrbitalSceneProfile,
} from './orbitalAvatarGeometry'
import {
  GLOW_LAYERS,
  GLOW_TEXTURE_SIZE,
  createRadialGlowTextureData,
} from './orbitalGlow'
import { getOrbitMotionResponse } from './orbitalAvatarMotion'

export interface OrbitalAvatarProps {
  className?: string
  onReady?: () => void
  onUnavailable?: () => void
}

const AVATAR_TEXTURE = '/images/avatar-transparent.png'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const COARSE_POINTER_QUERY = '(pointer: coarse)'
const MAX_SCENE_PROFILE = getOrbitalSceneProfile({
  coarsePointer: false,
  width: 1440,
})

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
      let renderer: import('three').WebGLRenderer | null = null
      let sceneReady = false
      let unavailableSignalled = false
      const geometries: Array<{ dispose: () => void }> = []
      const materials: Array<{ dispose: () => void }> = []
      const textures: Array<{ dispose: () => void }> = []
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
        const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
        const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY)
        const coarsePointerQuery = window.matchMedia(COARSE_POINTER_QUERY)
        let activeProfile: OrbitalSceneProfile = getOrbitalSceneProfile({
          coarsePointer: coarsePointerQuery.matches,
          width: window.innerWidth,
        })
        let prefersReducedMotion = reducedMotionQuery.matches
        let intersectsViewport = true
        let readySignalled = false
        let pointerListenerAttached = false

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
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
          textures.splice(0).forEach((texture) =>
            disposeSafely(() => texture.dispose()),
          )
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
          Math.min(window.devicePixelRatio || 1, activeProfile.pixelRatioCap),
        )

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
        camera.position.z = 5.4
        const root = new THREE.Group()
        root.name = 'root'
        const avatarRig = new THREE.Group()
        avatarRig.name = 'avatarRig'
        const interactionRig = new THREE.Group()
        interactionRig.name = 'interactionRig'
        const orbitalGroup = new THREE.Group()
        orbitalGroup.name = 'orbitalGroup'
        const glowGroup = new THREE.Group()
        glowGroup.name = 'glowGroup'
        scene.add(root)
        scene.add(glowGroup)
        root.add(avatarRig)
        root.add(interactionRig)
        interactionRig.add(orbitalGroup)

        const coreGeometry = new THREE.SphereGeometry(
          1.08,
          36,
          28,
        )
        geometries.push(coreGeometry)
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          depthWrite: false,
          opacity: 0.003,
          transparent: true,
        })
        materials.push(coreMaterial)
        const core = new THREE.Mesh(coreGeometry, coreMaterial)
        avatarRig.add(core)

        const atmosphereGeometry = new THREE.SphereGeometry(
          1.16,
          36,
          28,
        )
        geometries.push(atmosphereGeometry)
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: 0xa855f7,
          depthWrite: false,
          opacity: 0.004,
          side: THREE.BackSide,
          transparent: true,
        })
        materials.push(atmosphereMaterial)
        const atmosphere = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial,
        )
        avatarRig.add(atmosphere)

        const glowTexture = new THREE.DataTexture(
          createRadialGlowTextureData(),
          GLOW_TEXTURE_SIZE,
          GLOW_TEXTURE_SIZE,
          THREE.RGBAFormat,
        )
        glowTexture.needsUpdate = true
        glowTexture.magFilter = THREE.LinearFilter
        glowTexture.minFilter = THREE.LinearFilter
        glowTexture.generateMipmaps = false
        textures.push(glowTexture)

        const glowActors = GLOW_LAYERS.map((definition) => {
          const material = new THREE.SpriteMaterial({
            blending: THREE.AdditiveBlending,
            color: definition.color,
            depthTest: true,
            depthWrite: false,
            map: glowTexture,
            opacity: definition.opacity,
            transparent: true,
          })
          materials.push(material)
          const sprite = new THREE.Sprite(material)
          sprite.position.set(0, 0, definition.z)
          sprite.renderOrder = 0
          glowGroup.add(sprite)
          return { definition, material, sprite }
        })

        const orbits = getOrbitDefinitions()
        const orbitActors = orbits.map((orbit, index) => {
          const rig = new THREE.Group()
          rig.name = `orbitRig-${index}`
          orbitalGroup.add(rig)

          const orbitGeometry = new THREE.BufferGeometry()
          geometries.push(orbitGeometry)
          const orbitPosition = new THREE.Float32BufferAttribute(
            createOrbitPoints(orbit, MAX_SCENE_PROFILE.orbitSegments),
            3,
          )
          orbitGeometry.setAttribute(
            'position',
            orbitPosition,
          )
          const orbitMaterial = new THREE.LineBasicMaterial({
            color: orbit.color,
            depthTest: true,
            depthWrite: false,
            opacity: 0.3 * orbit.visualWeight,
            transparent: true,
          })
          materials.push(orbitMaterial)
          const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
          orbitLine.renderOrder = 2
          rig.add(orbitLine)

          const satelliteGeometry = new THREE.SphereGeometry(
            0.04,
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
          satellite.scale.setScalar(orbit.visualWeight)
          rig.add(satellite)

          return {
            geometry: orbitGeometry,
            line: orbitLine,
            mesh: satellite,
            motion: getOrbitMotionResponse(orbit, index),
            orbit,
            position: orbitPosition,
            rig,
            scratchPosition: { x: 0, y: 0, z: 0 },
          }
        })

        const particleGeometry = new THREE.BufferGeometry()
        geometries.push(particleGeometry)
        const particlePosition = new THREE.Float32BufferAttribute(
          createParticlePositions(MAX_SCENE_PROFILE.particleCount),
          3,
        )
        particleGeometry.setAttribute(
          'position',
          particlePosition,
        )
        const particleMaterial = new THREE.PointsMaterial({
          blending: THREE.AdditiveBlending,
          color: 0xc4b5fd,
          depthTest: true,
          depthWrite: false,
          opacity: 0.32,
          size: 0.026,
          sizeAttenuation: true,
          transparent: true,
        })
        materials.push(particleMaterial)
        const particleField = new THREE.Points(
          particleGeometry,
          particleMaterial,
        )
        particleField.renderOrder = 2
        interactionRig.add(particleField)

        const pointer = { x: 0, y: 0 }

        const applySceneProfile = (
          nextProfile: OrbitalSceneProfile,
          force = false,
        ) => {
          if (!renderer) return
          const changed = force || nextProfile !== activeProfile
          activeProfile = nextProfile

          interactionRig.scale.setScalar(activeProfile.orbitScale)
          glowActors.forEach(({ definition, material, sprite }) => {
            material.opacity = definition.opacity * activeProfile.glowIntensity
            sprite.scale.set(
              definition.scale[0] * activeProfile.glowScale,
              definition.scale[1] * activeProfile.glowScale,
              1,
            )
          })
          orbitActors.forEach((actor, index) => {
            actor.rig.visible = index < activeProfile.orbitCount
            if (changed) {
              const nextPositions = createOrbitPoints(
                actor.orbit,
                activeProfile.orbitSegments,
              )
              actor.position.array.fill(0)
              actor.position.array.set(nextPositions)
              actor.position.needsUpdate = true
            }
            actor.geometry.setDrawRange(
              0,
              activeProfile.orbitSegments + 1,
            )
          })
          if (changed) {
            const nextPositions = createParticlePositions(
              activeProfile.particleCount,
            )
            particlePosition.array.fill(0)
            particlePosition.array.set(nextPositions)
            particlePosition.needsUpdate = true
          }
          particleGeometry.setDrawRange(0, activeProfile.particleCount)
          renderer.setPixelRatio(
            Math.min(
              window.devicePixelRatio || 1,
              activeProfile.pixelRatioCap,
            ),
          )

          if (!activeProfile.allowPointerParallax) {
            pointer.x = 0
            pointer.y = 0
          }
        }

        applySceneProfile(activeProfile, true)

        let syncPointerListener = () => undefined

        const renderFrame = (time: number) => {
          if (disposed || !renderer) return
          const animationTime = prefersReducedMotion ? 0 : time

          orbitActors.forEach(({ mesh, orbit }, index) => {
            if (index >= activeProfile.orbitCount) return
            const [x, y, z] = createOrbitPosition(
              orbit,
              orbit.phase + animationTime * orbit.speed * orbit.direction,
            )
            mesh.position.set(x, y, z)
          })

          atmosphere.scale.setScalar(1)
          glowActors.forEach(({ definition, sprite }) => {
            const breath = 1 + Math.sin(
              animationTime * 0.00045 + definition.pulseOffset,
            ) * 0.018
            sprite.scale.set(
              definition.scale[0] * activeProfile.glowScale * breath,
              definition.scale[1] * activeProfile.glowScale * breath,
              1,
            )
          })
          particleField.rotation.x = animationTime * 0.000006
          particleField.rotation.y = animationTime * -0.000012

          const canUsePointer =
            !prefersReducedMotion &&
            activeProfile.allowPointerParallax &&
            finePointerQuery.matches &&
            !coarsePointerQuery.matches
          root.rotation.x = prefersReducedMotion
            ? 0.04
            : 0.04 + (canUsePointer ? pointer.y : 0) * 0.06
          root.rotation.y = prefersReducedMotion
            ? 0
            : animationTime * 0.000025 +
              (canUsePointer ? pointer.x : 0) * 0.08
          renderer.render(scene, camera)
        }

        const resize = () => {
          if (disposed || !renderer) return
          applySceneProfile(
            getOrbitalSceneProfile({
              coarsePointer: coarsePointerQuery.matches,
              width: window.innerWidth,
            }),
          )
          syncPointerListener()
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
            syncPointerListener()
            refreshLoop()
          } catch {
            failScene()
          }
        }
        const handlePointerMove = (event: PointerEvent) => {
          if (
            disposed ||
            prefersReducedMotion ||
            !activeProfile.allowPointerParallax ||
            !finePointerQuery.matches ||
            coarsePointerQuery.matches ||
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
        syncPointerListener = () => {
          const shouldListen =
            sceneReady &&
            !disposed &&
            !prefersReducedMotion &&
            intersectsViewport &&
            !document.hidden &&
            activeProfile.allowPointerParallax &&
            finePointerQuery.matches &&
            !coarsePointerQuery.matches

          if (shouldListen && !pointerListenerAttached) {
            window.addEventListener('pointermove', handlePointerMove)
            pointerListenerAttached = true
          } else if (!shouldListen && pointerListenerAttached) {
            window.removeEventListener('pointermove', handlePointerMove)
            pointerListenerAttached = false
          }

          if (!shouldListen) {
            pointer.x = 0
            pointer.y = 0
          }
        }
        const handleReducedMotionChange = (event: MediaQueryListEvent) => {
          try {
            prefersReducedMotion = event.matches
            syncPointerListener()
            refreshLoop()
            if (prefersReducedMotion) renderFrame(0)
          } catch {
            failScene()
          }
        }
        const handleFinePointerChange = () => {
          try {
            syncPointerListener()
          } catch {
            failScene()
          }
        }
        const handleCoarsePointerChange = () => {
          safelyResize()
        }

        const loadedTexture = await new Promise<import('three').Texture>(
          (resolve, reject) => {
            const requestedTexture = new THREE.TextureLoader().load(
              AVATAR_TEXTURE,
              resolve,
              undefined,
              reject,
            )
            textures.push(requestedTexture)
          },
        )
        if (cancelled || disposed) return
        loadedTexture.colorSpace = THREE.SRGBColorSpace

        const avatarMaterial = new THREE.SpriteMaterial({
          alphaTest: 0.02,
          depthTest: true,
          depthWrite: true,
          map: loadedTexture,
          transparent: true,
        })
        materials.push(avatarMaterial)
        const avatar = new THREE.Sprite(avatarMaterial)
        avatar.renderOrder = 1
        avatar.scale.set(2.12, 2.12, 1)
        avatarRig.add(avatar)

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
        window.addEventListener('orientationchange', safelyResize)
        removeListeners.push(() =>
          window.removeEventListener('orientationchange', safelyResize),
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
        finePointerQuery.addEventListener('change', handleFinePointerChange)
        removeListeners.push(() =>
          finePointerQuery.removeEventListener(
            'change',
            handleFinePointerChange,
          ),
        )
        coarsePointerQuery.addEventListener(
          'change',
          handleCoarsePointerChange,
        )
        removeListeners.push(() =>
          coarsePointerQuery.removeEventListener(
            'change',
            handleCoarsePointerChange,
          ),
        )
        removeListeners.push(() => {
          if (pointerListenerAttached) {
            window.removeEventListener('pointermove', handlePointerMove)
            pointerListenerAttached = false
          }
        })
        syncPointerListener()

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(safelyResize)
          resizeObserver.observe(container)
        }
        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver((entries) => {
            try {
              intersectsViewport = entries.some((entry) => entry.isIntersecting)
              syncPointerListener()
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
