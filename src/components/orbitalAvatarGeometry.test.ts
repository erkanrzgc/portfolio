import { describe, expect, it } from 'vitest'
import {
  createOrbitPoints,
  getOrbitDefinitions,
} from './orbitalAvatarGeometry'

describe('orbital avatar geometry', () => {
  it('uses eight desktop orbits and five mobile orbits', () => {
    expect(getOrbitDefinitions(false)).toHaveLength(8)
    expect(getOrbitDefinitions(true)).toHaveLength(5)
  })

  it('creates deterministic closed ellipses with front and back depth', () => {
    const orbit = getOrbitDefinitions(false)[1]
    const first = createOrbitPoints(orbit, 64)
    const second = createOrbitPoints(orbit, 64)
    const depth = Array.from(first).filter((_, index) => index % 3 === 2)

    expect(first).toEqual(second)
    expect(first).toHaveLength((64 + 1) * 3)
    expect(Array.from(first.slice(0, 3))).toEqual(Array.from(first.slice(-3)))
    expect(Math.min(...depth)).toBeLessThan(0)
    expect(Math.max(...depth)).toBeGreaterThan(0)
  })
})
