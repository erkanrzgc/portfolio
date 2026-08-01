import { describe, expect, it } from 'vitest'

import './index.css'

function findCssStyleRule(selector: string): CSSStyleRule | undefined {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText === selector,
    )
}

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

  it('uses blurred edge-free gradients for the avatar fallback', () => {
    const beforeRule = findCssStyleRule('.hero-avatar-fallback-motion::before')
    const afterRule = findCssStyleRule('.hero-avatar-fallback-motion::after')
    const sharedRule = findCssStyleRule(
      '.hero-avatar-fallback-motion::before,\n.hero-avatar-fallback-motion::after',
    )

    expect(beforeRule).toBeDefined()
    expect(afterRule).toBeDefined()
    expect(sharedRule).toBeDefined()

    const beforeBorder = beforeRule?.style.getPropertyValue('border').trim()
    expect(['', '0', '0px', 'none']).toContain(beforeBorder)
    expect(beforeRule?.style.getPropertyValue('box-shadow').trim()).toBe('none')

    for (const rule of [beforeRule, afterRule]) {
      const background = rule?.style.getPropertyValue('background').trim() ?? ''
      expect(background).toContain('radial-gradient')
      expect(background).toMatch(/^radial-gradient\(/)
      expect(rule?.style.getPropertyValue('filter')).toContain('blur')
    }

    expect(['""', "''"]).toContain(
      sharedRule?.style.getPropertyValue('content'),
    )
    expect(sharedRule?.style.getPropertyValue('pointer-events')).toBe('none')
    expect(sharedRule?.style.getPropertyValue('position')).toBe('absolute')
    expect(sharedRule?.style.getPropertyValue('z-index')).toBe('-1')
    expect(sharedRule?.style.getPropertyValue('border-radius')).toBe('50%')
  })
})
