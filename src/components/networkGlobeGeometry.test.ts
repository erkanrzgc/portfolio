import { describe, expect, it } from 'vitest'
import {
  createConnectionSegments,
  createSpherePoints,
} from './networkGlobeGeometry'

describe('createSpherePoints', () => {
  it('creates deterministic points on a sphere', () => {
    const first = createSpherePoints(32, 1.6)
    const second = createSpherePoints(32, 1.6)

    expect(first).toEqual(second)
    expect(first).toHaveLength(32)

    for (const point of first) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1.6)
    }
  })
})

describe('createConnectionSegments', () => {
  it('creates a bounded set of connection endpoint coordinates', () => {
    const points = createSpherePoints(48, 1.6)
    const segments = createConnectionSegments(points, 0.9, 80)

    expect(segments).toBeInstanceOf(Float32Array)
    expect(segments.length).toBeGreaterThan(0)
    expect(segments.length % 6).toBe(0)
    expect(segments.length / 6).toBeLessThanOrEqual(80)
  })

  it('returns no connections when the maximum is zero', () => {
    const points = createSpherePoints(2, 1.6)

    expect(createConnectionSegments(points, 4, 0)).toHaveLength(0)
  })
})
