import { useEffect, useRef } from 'react'

import {
  createOrbitPoints,
  createParticlePositions,
  getOrbitDefinitions,
  getOrbitalSceneProfile,
  writeOrbitPosition,
  type OrbitalSceneProfile,
} from './orbitalAvatarGeometry'
import {
  GLOW_LAYERS,
  GLOW_TEXTURE_SIZE,
  createRadialGlowTextureData,
} from './orbitalGlow'
import {
  createOrbitalMotionState,
  getOrbitMotionResponse,
  resolveOrbitalDragIntent,
  stepOrbitalMotion,
  writeOrbitRigRotation,
  type OrbitalDragIntent,
  type OrbitalMotionState,
} from './orbitalAvatarMotion'

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
    Object.assign(container.style, {
      cursor: '',
      pointerEvents: 'none',
      touchAction: '',
    })

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
        let motionState: OrbitalMotionState = createOrbitalMotionState()
        let lastFrameTime: number | null = null
        let dragDeltaX = 0
        let dragDeltaY = 0
        let dragging = false
        let cancelMomentum = false
        interface ActiveDrag {
          readonly pointerId: number
          readonly pointerType: string
          readonly startX: number
          readonly startY: number
          lastX: number
          lastY: number
          intent: OrbitalDragIntent
        }
        let activeDrag: ActiveDrag | null = null
        let activeDragHasCapture = false
        let releaseAfterFrame = false
        let interactionListenersAttached = false
        let syncInteractionListeners = () => undefined
        const pointer = { x: 0, y: 0 }
        let avatarMaterial: import('three').SpriteMaterial | null = null
        const resetFrameClock = () => {
          lastFrameTime = null
        }
        const canInteract = () =>
          sceneReady &&
          !disposed &&
          !prefersReducedMotion &&
          intersectsViewport &&
          !document.hidden
        const releaseCapture = (pointerId: number) => {
          try {
            if (container.hasPointerCapture?.(pointerId)) {
              container.releasePointerCapture(pointerId)
            }
          } catch {
            // Pointer capture may already have been released by the browser.
          }
        }
        const finishDrag = (preserveMomentum: boolean) => {
          const finishedDrag = activeDrag
          activeDrag = null
          activeDragHasCapture = false

          if (preserveMomentum) {
            if (dragDeltaX !== 0 || dragDeltaY !== 0) {
              releaseAfterFrame = true
              dragging = true
            } else {
              releaseAfterFrame = false
              dragging = false
            }
          } else {
            releaseAfterFrame = false
            dragging = false
            dragDeltaX = 0
            dragDeltaY = 0
            cancelMomentum = true
          }

          if (canInteract()) {
            container.style.cursor =
              finePointerQuery.matches && !coarsePointerQuery.matches
                ? 'grab'
                : 'default'
          }
          if (finishedDrag) releaseCapture(finishedDrag.pointerId)
        }

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        })

        disposeScene = () => {
          if (disposed) return
          disposed = true
          resetFrameClock()
          if (frameId !== null) {
            const scheduledFrame = frameId
            frameId = null
            disposeSafely(() => cancelAnimationFrame(scheduledFrame))
          }
          disposeSafely(() => resizeObserver?.disconnect())
          disposeSafely(() => intersectionObserver?.disconnect())
          disposeSafely(syncInteractionListeners)
          removeListeners.splice(0).forEach(disposeSafely)
          finishDrag(false)
          interactionListenersAttached = false
          Object.assign(container.style, {
            cursor: '',
            pointerEvents: 'none',
            touchAction: '',
          })
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
            scratchRotation: { x: 0, y: 0, z: 0 },
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

        const renderFrame = (time: number) => {
          if (disposed || !renderer) return
          const deltaMs =
            prefersReducedMotion || lastFrameTime === null
              ? 0
              : Math.max(0, time - lastFrameTime)
          lastFrameTime = prefersReducedMotion ? null : time
          const canUsePointer =
            !prefersReducedMotion &&
            activeProfile.allowPointerParallax &&
            finePointerQuery.matches &&
            !coarsePointerQuery.matches
          motionState = stepOrbitalMotion(motionState, {
            cancelMomentum,
            deltaMs,
            dragDeltaX,
            dragDeltaY,
            dragging,
            pointerX: canUsePointer ? pointer.x : 0,
            pointerY: canUsePointer ? pointer.y : 0,
          })
          dragDeltaX = 0
          dragDeltaY = 0
          cancelMomentum = false
          if (releaseAfterFrame) {
            releaseAfterFrame = false
            dragging = false
          }
          const animationSeconds = motionState.elapsedSeconds

          orbitActors.forEach((actor, index) => {
            if (index >= activeProfile.orbitCount) return
            writeOrbitPosition(
              actor.orbit,
              actor.orbit.phase +
                animationSeconds * 1000 *
                  actor.orbit.speed *
                  actor.orbit.direction,
              actor.scratchPosition,
            )
            actor.mesh.position.set(
              actor.scratchPosition.x,
              actor.scratchPosition.y,
              actor.scratchPosition.z,
            )
            writeOrbitRigRotation(
              actor.motion,
              animationSeconds,
              motionState.pitchVelocity,
              motionState.yawVelocity,
              actor.scratchRotation,
            )
            actor.rig.rotation.x = actor.scratchRotation.x
            actor.rig.rotation.y = actor.scratchRotation.y
            actor.rig.rotation.z = actor.scratchRotation.z
          })

          atmosphere.scale.setScalar(1)
          interactionRig.rotation.x = 0.04 + motionState.pitch
          interactionRig.rotation.y = animationSeconds * 0.025 + motionState.yaw
          avatarRig.position.x = motionState.avatarX
          avatarRig.position.y = motionState.avatarY
          avatarRig.scale.setScalar(motionState.avatarScale)
          if (avatarMaterial) avatarMaterial.rotation = motionState.avatarRoll
          glowGroup.position.x = motionState.avatarX
          glowGroup.position.y = motionState.avatarY
          glowActors.forEach(({ definition, sprite }) => {
            const breath = 1 + Math.sin(
              animationSeconds * 0.45 + definition.pulseOffset,
            ) * 0.018
            sprite.scale.set(
              definition.scale[0] * activeProfile.glowScale * breath,
              definition.scale[1] * activeProfile.glowScale * breath,
              1,
            )
          })
          particleField.rotation.x = animationSeconds * 0.006
          particleField.rotation.y = animationSeconds * -0.012
          renderer.render(scene, camera)
        }

        const resize = () => {
          if (disposed || !renderer) return
          const nextProfile = getOrbitalSceneProfile({
            coarsePointer: coarsePointerQuery.matches,
            width: window.innerWidth,
          })
          if (nextProfile !== activeProfile) finishDrag(false)
          applySceneProfile(nextProfile)
          syncInteractionListeners()
          const width = Math.max(1, container.clientWidth)
          const height = Math.max(1, container.clientHeight)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height, false)
          if (
            sceneReady &&
            (prefersReducedMotion || (frameId === null && shouldAnimate()))
          ) {
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

          resetFrameClock()
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
            syncInteractionListeners()
            refreshLoop()
          } catch {
            failScene()
          }
        }
        const handlePointerDown = (event: PointerEvent) => {
          if (!canInteract() || !event.isPrimary || activeDrag) return

          const coarsePointer =
            coarsePointerQuery.matches || event.pointerType === 'touch'
          cancelMomentum = false
          releaseAfterFrame = false
          activeDrag = {
            intent: coarsePointer ? 'pending' : 'scene',
            lastX: event.clientX,
            lastY: event.clientY,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            startX: event.clientX,
            startY: event.clientY,
          }
          dragging = !coarsePointer
          activeDragHasCapture = false
          try {
            if (container.setPointerCapture) {
              container.setPointerCapture(event.pointerId)
              activeDragHasCapture = true
            }
          } catch {
            // Interaction can continue even when capture is unavailable.
          }
          if (!coarsePointer && event.pointerType !== 'touch') {
            container.style.cursor = 'grabbing'
          }
        }
        const handlePointerMove = (event: PointerEvent) => {
          if (!canInteract()) return

          try {
            const bounds = container.getBoundingClientRect()
            const width = Math.max(1, bounds.width)
            const height = Math.max(1, bounds.height)
            const drag = activeDrag
            if (drag && drag.pointerId === event.pointerId) {
              const coarsePointer =
                coarsePointerQuery.matches || drag.pointerType === 'touch'
              drag.intent = resolveOrbitalDragIntent({
                coarsePointer,
                deltaX: event.clientX - drag.startX,
                deltaY: event.clientY - drag.startY,
              })
              if (drag.intent === 'scroll') {
                finishDrag(false)
                return
              }
              if (drag.intent === 'scene') {
                dragDeltaX += (event.clientX - drag.lastX) / width
                dragDeltaY += (event.clientY - drag.lastY) / height
                drag.lastX = event.clientX
                drag.lastY = event.clientY
                dragging = true
                event.preventDefault()
              }
              return
            }

            if (
              drag ||
              !activeProfile.allowPointerParallax ||
              !finePointerQuery.matches ||
              coarsePointerQuery.matches ||
              event.pointerType === 'touch'
            ) {
              return
            }
            pointer.x = Math.min(
              1,
              Math.max(-1, ((event.clientX - bounds.left) / width - 0.5) * 2),
            )
            pointer.y = Math.min(
              1,
              Math.max(-1, ((event.clientY - bounds.top) / height - 0.5) * 2),
            )
          } catch {
            failScene()
          }
        }
        const handlePointerUp = (event: PointerEvent) => {
          if (activeDrag?.pointerId !== event.pointerId) return
          finishDrag(activeDrag.intent === 'scene')
        }
        const handlePointerCancel = (event: PointerEvent) => {
          if (activeDrag?.pointerId !== event.pointerId) return
          finishDrag(false)
        }
        const handleLostPointerCapture = (event: PointerEvent) => {
          if (activeDrag?.pointerId !== event.pointerId) return
          finishDrag(false)
        }
        const handlePointerLeave = () => {
          if (activeDrag && !activeDragHasCapture) {
            finishDrag(false)
          } else if (!activeDrag) {
            pointer.x = 0
            pointer.y = 0
          }
        }
        const interactionHandlers: Array<readonly [string, EventListener]> = [
          ['pointerdown', handlePointerDown as EventListener],
          ['pointermove', handlePointerMove as EventListener],
          ['pointerup', handlePointerUp as EventListener],
          ['pointercancel', handlePointerCancel as EventListener],
          ['lostpointercapture', handleLostPointerCapture as EventListener],
          ['pointerleave', handlePointerLeave as EventListener],
        ]
        syncInteractionListeners = () => {
          if (canInteract()) {
            if (!interactionListenersAttached) {
              interactionHandlers.forEach(([type, handler]) =>
                container.addEventListener(type, handler),
              )
              interactionListenersAttached = true
            }
            container.style.pointerEvents = 'auto'
            container.style.touchAction = 'pan-y'
            if (!activeDrag) {
              container.style.cursor =
                finePointerQuery.matches && !coarsePointerQuery.matches
                  ? 'grab'
                  : 'default'
            }
            return
          }

          if (interactionListenersAttached) {
            interactionHandlers.forEach(([type, handler]) =>
              container.removeEventListener(type, handler),
            )
            interactionListenersAttached = false
          }
          finishDrag(false)
          pointer.x = 0
          pointer.y = 0
          container.style.pointerEvents = 'none'
          container.style.touchAction = ''
          container.style.cursor = ''
        }
        const handleReducedMotionChange = (event: MediaQueryListEvent) => {
          try {
            finishDrag(false)
            prefersReducedMotion = event.matches
            syncInteractionListeners()
            if (prefersReducedMotion) {
              motionState = createOrbitalMotionState()
              pointer.x = 0
              pointer.y = 0
              dragDeltaX = 0
              dragDeltaY = 0
              dragging = false
              cancelMomentum = false
              resetFrameClock()
            }
            refreshLoop()
            if (prefersReducedMotion) renderFrame(0)
          } catch {
            failScene()
          }
        }
        const handleFinePointerChange = () => {
          try {
            finishDrag(false)
            syncInteractionListeners()
          } catch {
            failScene()
          }
        }
        const handleCoarsePointerChange = () => {
          finishDrag(false)
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

        avatarMaterial = new THREE.SpriteMaterial({
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
        syncInteractionListeners()

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(safelyResize)
          resizeObserver.observe(container)
        }
        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver((entries) => {
            try {
              intersectsViewport = entries.some((entry) => entry.isIntersecting)
              syncInteractionListeners()
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
