import { useEffect, useRef } from 'react'
import type { BufferGeometry, Material, WebGLRenderer } from 'three'
import {
  createConnectionSegments,
  createSpherePoints,
} from './networkGlobeGeometry'

interface NetworkGlobeProps {
  className?: string
}

export default function NetworkGlobe({ className = '' }: NetworkGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let dispose: (() => void) | undefined

    const initialize = async () => {
      let THREE: typeof import('three')

      try {
        THREE = await import('three')
      } catch {
        return
      }

      if (cancelled) return

      const mobileQuery = window.matchMedia?.('(max-width: 767px)')
      const reducedMotionQuery = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      )
      const isMobile = mobileQuery?.matches ?? window.innerWidth < 768
      let prefersReducedMotion = reducedMotionQuery?.matches ?? false
      let renderer: WebGLRenderer

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: !isMobile,
        })
      } catch {
        return
      }

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      const globe = new THREE.Group()
      const disposableGeometries: BufferGeometry[] = []
      const disposableMaterials: Material[] = []
      const canvas = renderer.domElement

      camera.position.z = 5.2
      scene.add(globe)

      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6),
      )
      canvas.setAttribute('aria-hidden', 'true')
      canvas.style.display = 'block'
      canvas.style.height = '100%'
      canvas.style.opacity = '1'
      canvas.style.transition = 'opacity 120ms linear'
      canvas.style.width = '100%'
      container.appendChild(canvas)

      const points = createSpherePoints(isMobile ? 44 : 78, 1.6)
      const pointGeometry = new THREE.BufferGeometry()
      pointGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          points.flatMap(({ x, y, z }) => [x, y, z]),
          3,
        ),
      )
      const pointMaterial = new THREE.PointsMaterial({
        color: 0x91adc2,
        depthWrite: false,
        opacity: 0.72,
        size: isMobile ? 0.045 : 0.04,
        sizeAttenuation: true,
        transparent: true,
      })
      globe.add(new THREE.Points(pointGeometry, pointMaterial))
      disposableGeometries.push(pointGeometry)
      disposableMaterials.push(pointMaterial)

      const connectionGeometry = new THREE.BufferGeometry()
      connectionGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
          createConnectionSegments(
            points,
            isMobile ? 0.94 : 0.82,
            isMobile ? 55 : 120,
          ),
          3,
        ),
      )
      const connectionMaterial = new THREE.LineBasicMaterial({
        color: 0x668da8,
        depthWrite: false,
        opacity: 0.2,
        transparent: true,
      })
      globe.add(new THREE.LineSegments(connectionGeometry, connectionMaterial))
      disposableGeometries.push(connectionGeometry)
      disposableMaterials.push(connectionMaterial)

      const shellGeometry = new THREE.SphereGeometry(
        1.62,
        isMobile ? 20 : 28,
        isMobile ? 14 : 20,
      )
      const shellMaterial = new THREE.MeshBasicMaterial({
        color: 0x527793,
        depthWrite: false,
        opacity: 0.07,
        transparent: true,
        wireframe: true,
      })
      globe.add(new THREE.Mesh(shellGeometry, shellMaterial))
      disposableGeometries.push(shellGeometry)
      disposableMaterials.push(shellMaterial)

      const glowGeometry = new THREE.SphereGeometry(
        1.72,
        isMobile ? 20 : 28,
        isMobile ? 14 : 20,
      )
      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0x4d7794,
        depthWrite: false,
        opacity: 0.055,
        side: THREE.BackSide,
        transparent: true,
      })
      globe.add(new THREE.Mesh(glowGeometry, glowMaterial))
      disposableGeometries.push(glowGeometry)
      disposableMaterials.push(glowMaterial)

      let animationFrame = 0
      let disposed = false
      let isIntersecting = true
      let isDocumentVisible = !document.hidden
      let lastFrameTime = 0
      let targetRotationX = 0
      let targetRotationY = 0
      let pointerRotationX = 0
      let pointerRotationY = 0
      let baseRotationY = 0

      const render = (time = 0) => {
        if (disposed) return

        const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 50) : 16
        lastFrameTime = time
        pointerRotationX += (targetRotationX - pointerRotationX) * 0.045
        pointerRotationY += (targetRotationY - pointerRotationY) * 0.045

        if (!prefersReducedMotion) {
          baseRotationY += elapsed * 0.00008
        }

        globe.rotation.x = pointerRotationX
        globe.rotation.y = baseRotationY + pointerRotationY
        renderer.render(scene, camera)

        if (!prefersReducedMotion && isIntersecting && isDocumentVisible) {
          animationFrame = window.requestAnimationFrame(render)
        } else {
          animationFrame = 0
        }
      }

      const refreshAnimation = () => {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame)
          animationFrame = 0
        }
        lastFrameTime = 0

        if (!prefersReducedMotion && isIntersecting && isDocumentVisible) {
          animationFrame = window.requestAnimationFrame(render)
        } else {
          render()
        }
      }

      const resize = () => {
        const { width, height } = container.getBoundingClientRect()
        const nextWidth = Math.max(
          1,
          Math.round(width || container.clientWidth),
        )
        const nextHeight = Math.max(
          1,
          Math.round(height || container.clientHeight),
        )

        camera.aspect = nextWidth / nextHeight
        camera.updateProjectionMatrix()
        renderer.setSize(nextWidth, nextHeight, false)

        if (prefersReducedMotion || !animationFrame)
          renderer.render(scene, camera)
      }

      const handlePointerMove = (event: PointerEvent) => {
        targetRotationY = (event.clientX / window.innerWidth - 0.5) * 0.24
        targetRotationX = (event.clientY / window.innerHeight - 0.5) * 0.14
      }

      const handleScroll = () => {
        const hero = container.closest('section')
        if (!hero) return

        const bounds = hero.getBoundingClientRect()
        const progress = Math.min(1, Math.max(0, -bounds.top / bounds.height))
        canvas.style.opacity = String(1 - progress)
      }

      const handleVisibilityChange = () => {
        isDocumentVisible = !document.hidden
        refreshAnimation()
      }

      const handleReducedMotionChange = (event: MediaQueryListEvent) => {
        prefersReducedMotion = event.matches
        refreshAnimation()
      }

      const resizeObserver =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(resize)
      const intersectionObserver =
        typeof IntersectionObserver === 'undefined'
          ? undefined
          : new IntersectionObserver(([entry]) => {
              isIntersecting = entry.isIntersecting
              refreshAnimation()
            })

      resizeObserver?.observe(container)
      intersectionObserver?.observe(container)
      window.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      })
      window.addEventListener('resize', resize, { passive: true })
      window.addEventListener('scroll', handleScroll, { passive: true })
      document.addEventListener('visibilitychange', handleVisibilityChange)
      reducedMotionQuery?.addEventListener?.(
        'change',
        handleReducedMotionChange,
      )

      resize()
      handleScroll()
      refreshAnimation()

      dispose = () => {
        disposed = true
        if (animationFrame) window.cancelAnimationFrame(animationFrame)
        resizeObserver?.disconnect()
        intersectionObserver?.disconnect()
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('resize', resize)
        window.removeEventListener('scroll', handleScroll)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        reducedMotionQuery?.removeEventListener?.(
          'change',
          handleReducedMotionChange,
        )
        disposableGeometries.forEach((geometry) => geometry.dispose())
        disposableMaterials.forEach((material) => material.dispose())
        renderer.dispose()
        canvas.remove()
      }

      if (cancelled) {
        dispose()
        dispose = undefined
      }
    }

    void initialize()

    return () => {
      cancelled = true
      dispose?.()
      dispose = undefined
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`.trim()}
    />
  )
}
