import { describe, expect, it } from 'vitest'
import {
  createConnectionSegments,
  createSpherePoints,
  type GlobePoint,
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
  const points: GlobePoint[] = [
    { x: 0, y: 0, z: 0 },
    { x: 0.5, y: 0, z: 0 },
    { x: 0, y: 0.5, z: 0 },
    { x: 10, y: 0, z: 0 },
  ]

  it('emits only nearby pairs in deterministic iteration order', () => {
    const segments = createConnectionSegments(points, 0.8, 80)

    expect(segments).toBeInstanceOf(Float32Array)
    expect(segments).toEqual(
      new Float32Array([
        0, 0, 0, 0.5, 0, 0,
        0, 0, 0, 0, 0.5, 0,
        0.5, 0, 0, 0, 0.5, 0,
      ]),
    )
  })

  it('stops at the maximum connection count', () => {
    expect(createConnectionSegments(points, 0.8, 2)).toEqual(
      new Float32Array([
        0, 0, 0, 0.5, 0, 0,
        0, 0, 0, 0, 0.5, 0,
      ]),
    )
  })

  it('returns no connections when the maximum is zero', () => {
    expect(createConnectionSegments(points, 4, 0)).toHaveLength(0)
  })
})
