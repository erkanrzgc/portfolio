import { type ReactNode, useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
}

export default function SpotlightCard({ children, className }: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const [canTrackPointer, setCanTrackPointer] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
    const finePointer = window.matchMedia(FINE_POINTER_QUERY)
    const updateTracking = () => setCanTrackPointer(!reducedMotion.matches && finePointer.matches)

    updateTracking()
    reducedMotion.addEventListener('change', updateTracking)
    finePointer.addEventListener('change', updateTracking)

    return () => {
      reducedMotion.removeEventListener('change', updateTracking)
      finePointer.removeEventListener('change', updateTracking)
    }
  }, [])

  return (
    <article
      ref={cardRef}
      className={['spotlight-card', className].filter(Boolean).join(' ')}
      onPointerMove={(event) => {
        if (!canTrackPointer) return

        const card = cardRef.current
        if (!card) return

        const rect = card.getBoundingClientRect()

        card.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
        card.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
      }}
    >
      {children}
    </article>
  )
}
