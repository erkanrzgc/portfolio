import { describe, expect, it } from 'vitest'
import {
  createOrbitPosition,
  createOrbitPoints,
  getOrbitDefinitions,
  type OrbitDefinition,
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

  it('rotates ellipse positions in standard X, Y, Z order', () => {
    const orbit: OrbitDefinition = {
      radiusX: 2,
      radiusY: 3,
      rotation: [0, 0, 0],
      speed: 0,
      phase: 0,
      direction: 1,
      color: 0,
    }
    const angleOnPositiveY = Math.PI / 2
    const withRotation = (
      rotation: OrbitDefinition['rotation'],
    ): OrbitDefinition => ({ ...orbit, rotation })
    const expectPosition = (
      rotation: OrbitDefinition['rotation'],
      angle: number,
      expected: readonly [number, number, number],
    ) => {
      createOrbitPosition(withRotation(rotation), angle).forEach((coordinate, index) => {
        expect(coordinate).toBeCloseTo(expected[index])
      })
    }

    expectPosition([0, 0, 0], 0, [2, 0, 0])
    expectPosition([Math.PI / 2, 0, 0], angleOnPositiveY, [0, 0, 3])
    expectPosition([0, Math.PI / 2, 0], 0, [0, 0, -2])
    expectPosition([0, 0, Math.PI / 2], 0, [0, 2, 0])
    expectPosition(
      [Math.PI / 2, Math.PI / 2, Math.PI / 2],
      angleOnPositiveY,
      [0, 3, 0],
    )
  })
})
