import { describe, expect, it } from 'vitest'

import './index.css'

function findCssStyleRule(selector: string): CSSStyleRule | undefined {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule &&
        normalizeCssWhitespace(rule.selectorText) ===
          normalizeCssWhitespace(selector),
    )
}

function normalizeCssWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function styleValue(rule: CSSStyleRule | undefined, property: string): string {
  return normalizeCssWhitespace(rule?.style.getPropertyValue(property) ?? '')
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

    expect(styleValue(beforeRule, 'border')).toBe('0px')
    expect(styleValue(beforeRule, 'box-shadow')).toBe('none')
    expect(styleValue(beforeRule, 'background')).toBe(
      'radial-gradient(at 50% 52%, rgba(168, 85, 247, 0.28) 0%, rgba(126, 34, 206, 0.14) 34%, rgba(76, 29, 149, 0.06) 52%, rgba(76, 29, 149, 0) 74%)',
    )
    expect(styleValue(beforeRule, 'filter')).toBe('blur(18px)')
    expect(styleValue(beforeRule, 'inset')).toBe('10% 4%')
    expect(styleValue(beforeRule, 'opacity')).toBe('0.86')
    expect(styleValue(beforeRule, 'transform')).toBe('scale(1.08, 0.92)')

    expect(styleValue(afterRule, 'background')).toBe(
      'radial-gradient(rgba(147, 51, 234, 0.16) 0%, rgba(109, 40, 217, 0.08) 38%, rgba(88, 28, 135, 0) 72%)',
    )
    expect(styleValue(afterRule, 'filter')).toBe('blur(34px)')
    expect(styleValue(afterRule, 'inset')).toBe('4% -4%')
    expect(styleValue(afterRule, 'opacity')).toBe('0.68')
    expect(styleValue(afterRule, 'transform')).toBe('scale(1.18, 0.94)')

    expect(['""', "''"]).toContain(
      sharedRule?.style.getPropertyValue('content'),
    )
    expect(sharedRule?.style.getPropertyValue('pointer-events')).toBe('none')
    expect(sharedRule?.style.getPropertyValue('position')).toBe('absolute')
    expect(sharedRule?.style.getPropertyValue('z-index')).toBe('-1')
    expect(sharedRule?.style.getPropertyValue('border-radius')).toBe('50%')
  })
})
