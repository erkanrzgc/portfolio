import { useEffect, useRef, useState, type ReactNode } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getPrefersReducedMotion() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  )

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    setPrefersReducedMotion(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return prefersReducedMotion
}

interface MagnetProps {
  children: ReactNode
  padding?: number
  strength?: number
  activeTransition?: string
  inactiveTransition?: string
  className?: string
}

export default function Magnet({
  children,
  padding = 150,
  strength = 3,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out',
  className = '',
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('translate3d(0px, 0px, 0px)')
  const [transition, setTransition] = useState(inactiveTransition)
  const shouldReduceMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!shouldReduceMotion) {
      setTransition(inactiveTransition)
      return
    }

    setTransform('translate3d(0px, 0px, 0px)')
    setTransition('none')
  }, [inactiveTransition, shouldReduceMotion])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || shouldReduceMotion) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    const distance = Math.sqrt(distX * distX + distY * distY)
    const maxDistance = Math.max(rect.width, rect.height) / 2 + padding

    if (distance < maxDistance) {
      setTransform(
        `translate3d(${distX / strength}px, ${distY / strength}px, 0px)`
      )
      setTransition(activeTransition)
    } else {
      setTransform('translate3d(0px, 0px, 0px)')
      setTransition(inactiveTransition)
    }
  }

  const handleMouseLeave = () => {
    setTransform('translate3d(0px, 0px, 0px)')
    setTransition(inactiveTransition)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ transform, transition, willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
