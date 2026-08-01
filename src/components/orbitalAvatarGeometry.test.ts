import { describe, expect, it } from 'vitest'
import {
  createParticlePositions,
  createOrbitPosition,
  createOrbitPoints,
  getOrbitDefinitions,
  getOrbitalSceneProfile,
  writeOrbitPosition,
  type OrbitDefinition,
} from './orbitalAvatarGeometry'

describe('orbital avatar geometry', () => {
  it('orders eleven desktop orbits for six mobile and nine tablet priorities', () => {
    const orbits = getOrbitDefinitions()
    expect(orbits).toHaveLength(11)
    expect(getOrbitalSceneProfile({ coarsePointer: false, width: 1440 }).orbitCount).toBe(11)
    expect(getOrbitalSceneProfile({ coarsePointer: false, width: 900 }).orbitCount).toBe(9)
    expect(getOrbitalSceneProfile({ coarsePointer: false, width: 390 }).orbitCount).toBe(6)
    expect(getOrbitalSceneProfile({ coarsePointer: true, width: 1440 }).orbitCount).toBe(6)
  })

  it('keeps added desktop density quieter than the core orbit set', () => {
    const orbits = getOrbitDefinitions()
    expect(orbits.slice(0, 8).every((orbit) => orbit.visualWeight === 1)).toBe(true)
    expect(orbits.slice(8).map((orbit) => orbit.visualWeight)).toEqual([0.84, 0.78, 0.72])
    expect(orbits.filter((orbit) => orbit.color === 0x86efac)).toHaveLength(2)
  })

  it('writes an orbit position into a reusable target', () => {
    const target = { x: 99, y: 99, z: 99 }
    const orbit = getOrbitDefinitions()[8]
    const returned = writeOrbitPosition(orbit, Math.PI / 3, target)
    const allocated = createOrbitPosition(orbit, Math.PI / 3)
    expect(returned).toBe(target)
    expect([target.x, target.y, target.z]).toEqual(allocated)
  })

  it('keeps every added orbit closed with front and back depth', () => {
    getOrbitDefinitions().slice(8).forEach((orbit) => {
      const points = createOrbitPoints(orbit, 96)
      const zValues = Array.from({ length: 97 }, (_, index) => points[index * 3 + 2])
      expect(Array.from(points.slice(0, 3))).toEqual(Array.from(points.slice(-3)))
      expect(Math.max(...zValues)).toBeGreaterThan(0)
      expect(Math.min(...zValues)).toBeLessThan(0)
    })
  })

  it('selects progressively lighter responsive scene profiles', () => {
    const desktop = getOrbitalSceneProfile({
      coarsePointer: false,
      width: 1440,
    })
    const tablet = getOrbitalSceneProfile({
      coarsePointer: false,
      width: 900,
    })
    const mobile = getOrbitalSceneProfile({
      coarsePointer: false,
      width: 390,
    })

    expect(desktop).toMatchObject({
      allowPointerParallax: true,
      glowIntensity: 1,
      glowScale: 1,
      orbitCount: 11,
      orbitScale: 1,
      tier: 'desktop',
    })
    expect(tablet).toMatchObject({
      allowPointerParallax: true,
      glowIntensity: 0.84,
      glowScale: 0.92,
      orbitCount: 9,
      tier: 'tablet',
    })
    expect(mobile).toMatchObject({
      allowPointerParallax: false,
      glowIntensity: 0.7,
      glowScale: 0.84,
      orbitCount: 6,
      tier: 'mobile',
    })
    expect(tablet.orbitScale).toBeLessThan(desktop.orbitScale)
    expect(mobile.orbitScale).toBeLessThan(tablet.orbitScale)
    expect(tablet.glowIntensity).toBeLessThan(desktop.glowIntensity)
    expect(mobile.glowIntensity).toBeLessThan(tablet.glowIntensity)
    expect(tablet.glowScale).toBeLessThan(desktop.glowScale)
    expect(mobile.glowScale).toBeLessThan(tablet.glowScale)
    expect(tablet.orbitSegments).toBeLessThan(desktop.orbitSegments)
    expect(mobile.orbitSegments).toBeLessThan(tablet.orbitSegments)
    expect(tablet.particleCount).toBeLessThan(desktop.particleCount)
    expect(mobile.particleCount).toBeLessThan(tablet.particleCount)
    expect(tablet.pixelRatioCap).toBeLessThan(desktop.pixelRatioCap)
    expect(mobile.pixelRatioCap).toBeLessThan(tablet.pixelRatioCap)
  })

  it('uses the mobile workload for a coarse pointer at any width', () => {
    const coarseDesktop = getOrbitalSceneProfile({
      coarsePointer: true,
      width: 1440,
    })
    const mobile = getOrbitalSceneProfile({
      coarsePointer: false,
      width: 390,
    })

    expect(coarseDesktop).toEqual(mobile)
  })

  it('creates deterministic particles throughout the orbital volume', () => {
    const first = createParticlePositions(32)
    const second = createParticlePositions(32)
    const radii = Array.from({ length: 32 }, (_, index) => {
      const x = first[index * 3]
      const y = first[index * 3 + 1]
      const z = first[index * 3 + 2]
      return Math.hypot(x, y, z)
    })
    const depth = Array.from(first).filter((_, index) => index % 3 === 2)

    expect(first).toEqual(second)
    expect(first).toHaveLength(32 * 3)
    expect(Math.min(...radii)).toBeGreaterThan(1.2)
    expect(Math.max(...radii)).toBeLessThan(2.2)
    expect(Math.min(...depth)).toBeLessThan(0)
    expect(Math.max(...depth)).toBeGreaterThan(0)
  })

  it('creates deterministic closed ellipses with front and back depth', () => {
    const orbit = getOrbitDefinitions()[1]
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
      visualWeight: 1,
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
