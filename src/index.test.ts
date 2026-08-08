import { describe, expect, it } from 'vitest'

import './index.css'

interface ContextualStyleRule {
  media: string[]
  rule: CSSStyleRule
}

function normalizeCssWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function collectStyleRules(
  rules: CSSRuleList,
  media: string[] = [],
): ContextualStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [{ media, rule }]

    if (rule instanceof CSSMediaRule) {
      return collectStyleRules(rule.cssRules, [
        ...media,
        normalizeCssWhitespace(rule.conditionText),
      ])
    }

    if ('cssRules' in rule) {
      return collectStyleRules((rule as CSSGroupingRule).cssRules, media)
    }

    return []
  })
}

function allStyleRules(): ContextualStyleRule[] {
  return Array.from(document.styleSheets).flatMap((sheet) =>
    collectStyleRules(sheet.cssRules),
  )
}

function animationValue(rule: CSSStyleRule): string {
  return normalizeCssWhitespace(rule.style.getPropertyValue('animation'))
}

describe('legacy hero global styles', () => {
  it('positions the html scroll measurement container', () => {
    const positionedHtmlRule = allStyleRules().find(
      ({ media, rule }) =>
        media.length === 0 &&
        rule.selectorText
          .split(',')
          .map((selector) => selector.trim())
          .includes('html') &&
        rule.style.getPropertyValue('position') === 'relative',
    )

    expect(positionedHtmlRule).toBeDefined()
  })

  it('animates the floating avatar only for touch or coarse pointers', () => {
    const floatAnimationRules = allStyleRules().filter(
      ({ rule }) =>
        rule.selectorText.includes('.hero-avatar-float') &&
        animationValue(rule) !== '' &&
        animationValue(rule) !== 'none',
    )

    expect(floatAnimationRules.length).toBeGreaterThan(0)
    floatAnimationRules.forEach(({ media }) => {
      expect(media).toContain('(hover: none), (pointer: coarse)')
    })
  })

  it('disables floating avatar animation for reduced motion', () => {
    const reducedMotionRule = allStyleRules().find(
      ({ media, rule }) =>
        media.includes('(prefers-reduced-motion: reduce)') &&
        rule.selectorText.includes('.hero-avatar-float') &&
        animationValue(rule) === 'none',
    )

    expect(reducedMotionRule).toBeDefined()
  })

  it('ships none of the orbital hero or spotlight service selectors', () => {
    const selectors = allStyleRules()
      .map(({ rule }) => rule.selectorText)
      .join('\n')

    expect(selectors).not.toContain('hero-orbital-avatar')
    expect(selectors).not.toContain('spotlight-card')
    expect(selectors).not.toContain('service-orbit')
  })
})
