import { describe, expect, it } from 'vitest'

import './index.css'

function collectStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule]
    if ('cssRules' in rule) {
      return collectStyleRules((rule as CSSGroupingRule).cssRules)
    }
    return []
  })
}

function allStyleRules(): CSSStyleRule[] {
  return Array.from(document.styleSheets).flatMap((sheet) =>
    collectStyleRules(sheet.cssRules),
  )
}

function findCssStyleRule(selector: string): CSSStyleRule | undefined {
  return allStyleRules().find(
    (rule) =>
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

  it('composes service card tilt from bounded custom properties', () => {
    const cardRule = allStyleRules().find(
      (rule) => rule.selectorText === '.spotlight-card',
    )
    const pseudoElementBaseRule = allStyleRules().find(
      (rule) =>
        rule.selectorText.includes('.spotlight-card::before') &&
        rule.selectorText.includes('.spotlight-card::after'),
    )
    const beforeRule = allStyleRules().find(
      (rule) => rule.selectorText === '.spotlight-card::before',
    )
    const afterRule = allStyleRules().find(
      (rule) => rule.selectorText === '.spotlight-card::after',
    )

    expect(styleValue(cardRule, 'transform')).toContain(
      'var(--spotlight-lift)',
    )
    expect(styleValue(cardRule, 'transform')).toContain(
      'var(--spotlight-tilt-x)',
    )
    expect(styleValue(cardRule, 'transform')).toContain(
      'var(--spotlight-tilt-y)',
    )
    expect(styleValue(beforeRule, 'background')).toContain('radial-gradient')
    expect(styleValue(afterRule, 'background')).toContain('radial-gradient')
    expect(styleValue(pseudoElementBaseRule, 'pointer-events')).toBe('none')
  })

  it('keeps service orbit layers decorative and behind content', () => {
    const childRule = allStyleRules().find(
      (rule) => rule.selectorText === '.spotlight-card > *',
    )
    const orbitRule = allStyleRules().find(
      (rule) => rule.selectorText === '.service-orbit',
    )
    const trackRule = allStyleRules().find(
      (rule) => rule.selectorText === '.service-orbit__track',
    )
    const nodeRule = allStyleRules().find(
      (rule) => rule.selectorText === '.service-orbit__node',
    )
    const contentRule = allStyleRules().find(
      (rule) => rule.selectorText === '.service-card__content',
    )

    expect(styleValue(childRule, 'position')).toBe('relative')
    expect(Number(styleValue(childRule, 'z-index'))).toBeGreaterThan(0)
    expect(styleValue(orbitRule, 'position')).toBe('absolute')
    expect(styleValue(orbitRule, 'pointer-events')).toBe('none')
    expect(styleValue(trackRule, 'border-radius')).toBe('50%')
    expect(styleValue(nodeRule, 'left')).toBe('var(--service-node-x)')
    expect(styleValue(nodeRule, 'top')).toBe('var(--service-node-y)')
    expect(styleValue(contentRule, 'position')).toBe('relative')
    expect(Number(styleValue(contentRule, 'z-index'))).toBeGreaterThan(0)
  })

  it('stops service tilt and node motion for reduced motion', () => {
    const reducedRule = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .find(
        (rule): rule is CSSMediaRule =>
          rule instanceof CSSMediaRule &&
          rule.conditionText === '(prefers-reduced-motion: reduce)',
      )
    const nestedRules = reducedRule
      ? collectStyleRules(reducedRule.cssRules)
      : []
    const cardRule = nestedRules.find(
      (rule) => rule.selectorText === '.spotlight-card',
    )
    const nodeRule = nestedRules.find(
      (rule) => rule.selectorText === '.service-orbit__node > span',
    )

    expect(styleValue(cardRule, 'transform')).toBe('none')
    expect(styleValue(cardRule, 'transition')).toBe('none')
    expect(styleValue(nodeRule, 'animation')).toBe('none')
  })

  it('enables service motion only above the mobile breakpoint', () => {
    const motionRule = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .find(
        (rule): rule is CSSMediaRule =>
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes('(min-width: 640px)') &&
          rule.conditionText.includes('(pointer: fine)') &&
          rule.conditionText.includes(
            '(prefers-reduced-motion: no-preference)',
          ),
      )
    const nestedRules = motionRule
      ? collectStyleRules(motionRule.cssRules)
      : []
    const cardRule = nestedRules.find(
      (rule) => rule.selectorText === '.spotlight-card',
    )
    const nodeRule = nestedRules.find(
      (rule) => rule.selectorText === '.service-orbit__node > span',
    )
    const activeLightRule = nestedRules.find(
      (rule) =>
        rule.selectorText ===
        ".spotlight-card.spotlight-card--light[data-spotlight-active='true']",
    )

    expect(styleValue(cardRule, 'transition')).toContain('transform')
    expect(styleValue(nodeRule, 'animation')).toContain(
      'service-orbit-node-drift',
    )
    expect(styleValue(activeLightRule, 'border-color')).toBe(
      'rgba(126, 34, 206, 0.34)',
    )
  })
})
