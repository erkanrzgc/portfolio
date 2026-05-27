import { motion, type Transition } from 'framer-motion'
import type { ReactNode, ElementType } from 'react'

interface FadeInProps {
  children: ReactNode
  as?: ElementType
  delay?: number
  duration?: number
  x?: number
  y?: number
  className?: string
}

export default function FadeIn({
  children,
  as: Component = 'div',
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className = '',
}: FadeInProps) {
  const MotionComponent = motion.create(Component)

  const transition: Transition = {
    duration,
    delay,
    ease: [0.25, 0.1, 0.25, 1],
  }

  return (
    <MotionComponent
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={transition}
      className={className}
    >
      {children}
    </MotionComponent>
  )
}
