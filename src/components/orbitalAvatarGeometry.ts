export interface OrbitDefinition {
  readonly radiusX: number
  readonly radiusY: number
  readonly rotation: readonly [number, number, number]
  readonly speed: number
  readonly phase: number
  readonly direction: 1 | -1
  readonly color: number
}

export interface OrbitalSceneProfile {
  readonly tier: 'desktop' | 'tablet' | 'mobile'
  readonly allowPointerParallax: boolean
  readonly orbitCount: number
  readonly orbitScale: number
  readonly orbitSegments: number
  readonly particleCount: number
  readonly pixelRatioCap: number
}

export interface OrbitalSceneProfileInput {
  readonly coarsePointer: boolean
  readonly width: number
}

const DESKTOP_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'desktop',
  allowPointerParallax: true,
  orbitCount: 8,
  orbitScale: 1,
  orbitSegments: 96,
  particleCount: 96,
  pixelRatioCap: 1.6,
})

const TABLET_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'tablet',
  allowPointerParallax: true,
  orbitCount: 8,
  orbitScale: 0.88,
  orbitSegments: 72,
  particleCount: 56,
  pixelRatioCap: 1.35,
})

const MOBILE_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'mobile',
  allowPointerParallax: false,
  orbitCount: 5,
  orbitScale: 0.76,
  orbitSegments: 56,
  particleCount: 28,
  pixelRatioCap: 1.15,
})

const ORBITS: readonly OrbitDefinition[] = [
  { radiusX: 1.95, radiusY: 0.56, rotation: [1.12, 0.08, 0.02], speed: 0.00018, phase: 0.1, direction: 1, color: 0xd8b4fe },
  { radiusX: 1.82, radiusY: 0.68, rotation: [0.94, 0.51, 0.62], speed: 0.00023, phase: 0.7, direction: -1, color: 0xc084fc },
  { radiusX: 1.7, radiusY: 0.82, rotation: [1.25, -0.44, 1.18], speed: 0.00015, phase: 1.4, direction: 1, color: 0x86efac },
  { radiusX: 1.58, radiusY: 1.04, rotation: [0.82, 0.65, 1.72], speed: 0.00027, phase: 2.1, direction: -1, color: 0xe9d5ff },
  { radiusX: 2.06, radiusY: 0.48, rotation: [1.34, -0.21, 2.25], speed: 0.00012, phase: 2.8, direction: 1, color: 0xa78bfa },
  { radiusX: 1.5, radiusY: 1.18, rotation: [1.03, -0.76, 2.82], speed: 0.00021, phase: 3.5, direction: -1, color: 0x7dd3fc },
  { radiusX: 1.88, radiusY: 0.61, rotation: [0.73, 0.39, 3.34], speed: 0.00016, phase: 4.2, direction: 1, color: 0x86efac },
  { radiusX: 1.66, radiusY: 0.9, rotation: [1.41, -0.57, 3.91], speed: 0.00025, phase: 5, direction: -1, color: 0xd8b4fe },
]

export function getOrbitDefinitions(isMobile: boolean): readonly OrbitDefinition[] {
  return ORBITS.slice(0, isMobile ? 5 : 8)
}

export function getOrbitalSceneProfile({
  coarsePointer,
  width,
}: OrbitalSceneProfileInput): OrbitalSceneProfile {
  if (coarsePointer || width < 768) return MOBILE_PROFILE
  if (width < 1024) return TABLET_PROFILE
  return DESKTOP_PROFILE
}

export function createParticlePositions(count: number): Float32Array {
  const particleCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0
  const positions = new Float32Array(particleCount * 3)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let index = 0; index < particleCount; index += 1) {
    const vertical = 1 - (2 * (index + 0.5)) / particleCount
    const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical))
    const angle = index * goldenAngle
    const radiusStep =
      particleCount > 1
        ? ((index * 37) % particleCount) / (particleCount - 1)
        : 0
    const radius = 1.28 + radiusStep * 0.78

    positions[index * 3] = Math.cos(angle) * horizontal * radius
    positions[index * 3 + 1] = vertical * radius
    positions[index * 3 + 2] = Math.sin(angle) * horizontal * radius
  }

  return positions
}

export function createOrbitPosition(
  orbit: OrbitDefinition,
  angle: number,
): readonly [number, number, number] {
  return rotatePoint(
    [orbit.radiusX * Math.cos(angle), orbit.radiusY * Math.sin(angle), 0],
    orbit.rotation,
  )
}

export function createOrbitPoints(
  orbit: OrbitDefinition,
  segments: number,
): Float32Array {
  const points = new Float32Array((segments + 1) * 3)

  for (let index = 0; index <= segments; index += 1) {
    const angle = index === segments ? 0 : (index / segments) * Math.PI * 2
    const [x, y, z] = createOrbitPosition(orbit, angle)
    points[index * 3] = x
    points[index * 3 + 1] = y
    points[index * 3 + 2] = z
  }

  return points
}

function rotatePoint(
  point: readonly [number, number, number],
  rotation: readonly [number, number, number],
): readonly [number, number, number] {
  const [xRotation, yRotation, zRotation] = rotation
  const [x, y, z] = point

  const xCos = Math.cos(xRotation)
  const xSin = Math.sin(xRotation)
  const yAfterX = y * xCos - z * xSin
  const zAfterX = y * xSin + z * xCos

  const yCos = Math.cos(yRotation)
  const ySin = Math.sin(yRotation)
  const xAfterY = x * yCos + zAfterX * ySin
  const zAfterY = -x * ySin + zAfterX * yCos

  const zCos = Math.cos(zRotation)
  const zSin = Math.sin(zRotation)

  return [
    xAfterY * zCos - yAfterX * zSin,
    xAfterY * zSin + yAfterX * zCos,
    zAfterY,
  ]
}
