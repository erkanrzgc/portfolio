import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface AnimatedTextProps {
  text: string
  className?: string
}

export default function AnimatedText({ text, className = '' }: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  })

  const words = text.split(' ')

  return (
    <p ref={containerRef} className={className}>
      {words.map((word, wordIndex) => {
        const chars = word.split('')
        const start = wordIndex / words.length
        const end = (wordIndex + 1) / words.length

        return (
          <span key={wordIndex} className="inline-block mr-[0.25em]">
            {chars.map((char, charIndex) => {
              const charStart = start + (charIndex / chars.length) * (end - start)
              const charEnd = start + ((charIndex + 1) / chars.length) * (end - start)

              return (
                <span key={charIndex} className="relative inline-block">
                  <span className="opacity-50">{char}</span>
                  <motion.span
                    className="absolute left-0 top-0"
                    style={{
                      opacity: useTransform(
                        scrollYProgress,
                        [charStart, charEnd],
                        [0.5, 1]
                      ),
                    }}
                  >
                    {char}
                  </motion.span>
                </span>
              )
            })}
          </span>
        )
      })}
    </p>
  )
}
