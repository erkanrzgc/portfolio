import { describe, expect, it } from 'vitest'

import './index.css'

describe('global scroll container styles', () => {
  it('positions the document root for target-based scroll measurements', () => {
    const positionedValues = ['relative', 'absolute', 'fixed', 'sticky']

    expect(positionedValues).toContain(
      getComputedStyle(document.documentElement).position
    )
  })

  it('removes hero avatar opacity transitions for reduced motion', () => {
    const reducedMotionRule = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .find(
        (rule): rule is CSSMediaRule =>
          rule instanceof CSSMediaRule &&
          rule.conditionText === '(prefers-reduced-motion: reduce)',
      )

    expect(reducedMotionRule).toBeDefined()

    const heroTransitionRule = Array.from(
      reducedMotionRule?.cssRules ?? [],
    ).find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        rule.selectorText.includes('.hero-orbital-avatar > canvas') &&
        rule.selectorText.includes('[data-avatar-fallback]'),
    )

    expect(heroTransitionRule).toBeDefined()
    expect(heroTransitionRule?.style.getPropertyValue('transition')).toBe(
      'none',
    )
    expect(heroTransitionRule?.style.getPropertyPriority('transition')).toBe(
      'important',
    )
  })
})
