import { type ReactNode, useCallback, useEffect, useRef } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const NARROW_VIEWPORT_QUERY = '(max-width: 639px)'
const NEUTRAL_VALUES = Object.freeze({
  '--spotlight-x': '50%',
  '--spotlight-y': '50%',
  '--spotlight-tilt-x': '0deg',
  '--spotlight-tilt-y': '0deg',
  '--spotlight-lift': '0px',
})

function observeMediaChange(mediaQuery: MediaQueryList, callback: () => void) {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', callback)
    return () => mediaQuery.removeEventListener('change', callback)
  }
  mediaQuery.addListener(callback)
  return () => mediaQuery.removeListener(callback)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function format(value: number) {
  return Number(value.toFixed(3))
}

function writeNeutralValues(card: HTMLElement) {
  Object.entries(NEUTRAL_VALUES).forEach(([property, value]) =>
    card.style.setProperty(property, value),
  )
  card.removeAttribute('data-spotlight-active')
}

interface SpotlightCardProps {
  children: ReactNode
  className?: string
}

export default function SpotlightCard({ children, className }: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const canTrackRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const resetCardMotion = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    latestPointerRef.current = null
    if (cardRef.current) writeNeutralValues(cardRef.current)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
    const finePointer = window.matchMedia(FINE_POINTER_QUERY)
    const narrowViewport = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const updateTracking = () => {
      canTrackRef.current =
        !reducedMotion.matches &&
        finePointer.matches &&
        !narrowViewport.matches
      if (!canTrackRef.current) resetCardMotion()
    }

    resetCardMotion()
    updateTracking()
    const removeReduced = observeMediaChange(reducedMotion, updateTracking)
    const removeFine = observeMediaChange(finePointer, updateTracking)
    const removeNarrow = observeMediaChange(narrowViewport, updateTracking)
    return () => {
      resetCardMotion()
      removeReduced()
      removeFine()
      removeNarrow()
    }
  }, [resetCardMotion])

  const schedulePointerFrame = (clientX: number, clientY: number) => {
    latestPointerRef.current = { clientX, clientY }
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const card = cardRef.current
      const pointer = latestPointerRef.current
      if (!card || !pointer || !canTrackRef.current) return
      const rect = card.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        resetCardMotion()
        return
      }
      const x = clamp((pointer.clientX - rect.left) / rect.width, 0, 1)
      const y = clamp((pointer.clientY - rect.top) / rect.height, 0, 1)
      const tiltX = format((0.5 - y) * 6)
      const tiltY = format((x - 0.5) * 6)
      const distance = clamp(Math.hypot(x - 0.5, y - 0.5) * Math.SQRT2, 0, 1)

      card.style.setProperty('--spotlight-x', `${format(x * 100)}%`)
      card.style.setProperty('--spotlight-y', `${format(y * 100)}%`)
      card.style.setProperty('--spotlight-tilt-x', `${tiltX}deg`)
      card.style.setProperty('--spotlight-tilt-y', `${tiltY}deg`)
      card.style.setProperty('--spotlight-lift', `${format(-4 * distance)}px`)
      card.setAttribute('data-spotlight-active', 'true')
    })
  }

  return (
    <article
      ref={cardRef}
      className={['spotlight-card', className].filter(Boolean).join(' ')}
      onPointerMove={(event) => {
        if (!canTrackRef.current || event.pointerType === 'touch') return
        schedulePointerFrame(event.clientX, event.clientY)
      }}
      onPointerLeave={resetCardMotion}
      onPointerCancel={resetCardMotion}
    >
      {children}
    </article>
  )
}
