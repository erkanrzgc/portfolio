# Kinetic Orbital Rig and Orbital Echo Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the hero into an 11/9/6-orbit physics-driven scene with pointer and touch drag, then carry its visual language into the existing white Services bento without changing site content or semantics.

**Architecture:** Keep Three.js lifecycle ownership in `OrbitalAvatar`, but move all numerical motion into a pure immutable module and split the scene into avatar, interaction, glow, and per-orbit rigs. Extend `SpotlightCard` with one-frame pointer batching and bounded CSS variables while keeping Services-specific orbit decoration inside `ServicesSection` and CSS.

**Tech Stack:** React 18, TypeScript, Three.js, Vitest, Testing Library, Tailwind CSS, hand-written CSS, Vite.

---

## Working Context

- Worktree: `C:\Users\erkanrzgc\Desktop\portfolio\.worktrees\kinetic-orbital-services`
- Branch: `feature/kinetic-orbital-services`
- Approved spec: `docs/superpowers/specs/2026-08-01-kinetic-orbital-services-design.md`
- Baseline: 11 Vitest files and 70 tests passing at `dedcc2f`
- Do not run `npm audit fix`; dependency remediation is outside this feature.

## File Responsibility Map

### Create

- `src/components/orbitalAvatarMotion.ts` — immutable physics state, gesture intent, and deterministic per-orbit response.
- `src/components/orbitalAvatarMotion.test.ts` — numerical contracts independent of Three.js and the DOM.

### Modify

- `src/components/orbitalAvatarGeometry.ts` — 11 ordered orbit definitions, visual weights, 11/9/6 profiles, and allocation-free position writes.
- `src/components/orbitalAvatarGeometry.test.ts` — orbit ordering, workload, depth, visual-weight, and mutable-target contracts.
- `src/components/OrbitalAvatar.tsx` — scene rigs, one-loop physics integration, canvas-local pointer/touch lifecycle, pause/reset behavior, and resource cleanup.
- `src/components/OrbitalAvatar.test.tsx` — named Three.js mock rigs, actor counts, physics application, gestures, pause/resume, and cleanup.
- `src/sections/ServicesSection.tsx` — Services-only decorative metadata and accessible Orbital Echo markup.
- `src/sections/ServicesSection.test.tsx` — semantic preservation plus decoration variants and accessibility.
- `src/components/SpotlightCard.tsx` — RAF-batched coordinates, bounded tilt, and one reset path.
- `src/components/SpotlightCard.test.tsx` — batching, bounds, leave/cancel, capability changes, and unmount cleanup.
- `src/index.css` — dual card lighting, orbit/node styling, composed tilt transform, and motion fallbacks.
- `src/index.test.ts` — CSS invariants without serializer-fragile exact selector whitespace.

### Verify without changing unless a regression is found

- `src/sections/HeroSection.test.tsx`
- `src/components/FadeIn.test.tsx`
- `src/components/orbitalGlow.test.ts`
- `src/components/GithubContributions.test.tsx`
- `src/sections/ProjectsSection.test.tsx`

---

### Task 1: Expand deterministic orbit geometry and responsive profiles

**Files:**
- Modify: `src/components/orbitalAvatarGeometry.ts:1-137`
- Test: `src/components/orbitalAvatarGeometry.test.ts:1-145`

- [ ] **Step 1: Write failing count, weight, and mutable-target tests**

Replace the old 8/5 count expectations and add these focused contracts:

```ts
import {
  createOrbitPoints,
  createOrbitPosition,
  createParticlePositions,
  getOrbitDefinitions,
  getOrbitalSceneProfile,
  writeOrbitPosition,
} from './orbitalAvatarGeometry'

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
  expect(orbits.slice(8).map((orbit) => orbit.visualWeight)).toEqual([
    0.84,
    0.78,
    0.72,
  ])
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
```

- [ ] **Step 2: Run the geometry test to verify RED**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarGeometry.test.ts
```

Expected: FAIL because `writeOrbitPosition` and `visualWeight` do not exist and profile counts are still 8/8/5.

- [ ] **Step 3: Add visual weights, 11/9/6 profiles, and allocation-free writes**

Use this public shape and ordered data in `orbitalAvatarGeometry.ts`:

```ts
export interface OrbitDefinition {
  readonly radiusX: number
  readonly radiusY: number
  readonly rotation: readonly [number, number, number]
  readonly speed: number
  readonly phase: number
  readonly direction: 1 | -1
  readonly color: number
  readonly visualWeight: number
}

export interface MutableOrbitPosition {
  x: number
  y: number
  z: number
}

const DESKTOP_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'desktop',
  allowPointerParallax: true,
  glowIntensity: 1,
  glowScale: 1,
  orbitCount: 11,
  orbitScale: 1,
  orbitSegments: 96,
  particleCount: 96,
  pixelRatioCap: 1.6,
})

const TABLET_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'tablet',
  allowPointerParallax: true,
  glowIntensity: 0.84,
  glowScale: 0.92,
  orbitCount: 9,
  orbitScale: 0.88,
  orbitSegments: 72,
  particleCount: 56,
  pixelRatioCap: 1.35,
})

const MOBILE_PROFILE: OrbitalSceneProfile = Object.freeze({
  tier: 'mobile',
  allowPointerParallax: false,
  glowIntensity: 0.7,
  glowScale: 0.84,
  orbitCount: 6,
  orbitScale: 0.76,
  orbitSegments: 56,
  particleCount: 28,
  pixelRatioCap: 1.15,
})

const ORBITS: readonly OrbitDefinition[] = Object.freeze([
  { radiusX: 1.95, radiusY: 0.56, rotation: [1.12, 0.08, 0.02], speed: 0.00018, phase: 0.1, direction: 1, color: 0xd8b4fe, visualWeight: 1 },
  { radiusX: 1.82, radiusY: 0.68, rotation: [0.94, 0.51, 0.62], speed: 0.00023, phase: 0.7, direction: -1, color: 0xc084fc, visualWeight: 1 },
  { radiusX: 1.7, radiusY: 0.82, rotation: [1.25, -0.44, 1.18], speed: 0.00015, phase: 1.4, direction: 1, color: 0x86efac, visualWeight: 1 },
  { radiusX: 1.58, radiusY: 1.04, rotation: [0.82, 0.65, 1.72], speed: 0.00027, phase: 2.1, direction: -1, color: 0xe9d5ff, visualWeight: 1 },
  { radiusX: 2.06, radiusY: 0.48, rotation: [1.34, -0.21, 2.25], speed: 0.00012, phase: 2.8, direction: 1, color: 0xa78bfa, visualWeight: 1 },
  { radiusX: 1.5, radiusY: 1.18, rotation: [1.03, -0.76, 2.82], speed: 0.00021, phase: 3.5, direction: -1, color: 0x7dd3fc, visualWeight: 1 },
  { radiusX: 1.88, radiusY: 0.61, rotation: [0.73, 0.39, 3.34], speed: 0.00016, phase: 4.2, direction: 1, color: 0x86efac, visualWeight: 1 },
  { radiusX: 1.66, radiusY: 0.9, rotation: [1.41, -0.57, 3.91], speed: 0.00025, phase: 5, direction: -1, color: 0xd8b4fe, visualWeight: 1 },
  { radiusX: 2.14, radiusY: 0.72, rotation: [1.18, 0.72, 4.42], speed: 0.00014, phase: 5.6, direction: 1, color: 0xc4b5fd, visualWeight: 0.84 },
  { radiusX: 1.74, radiusY: 1.12, rotation: [0.66, -0.58, 5.08], speed: 0.00019, phase: 0.45, direction: -1, color: 0xb794f4, visualWeight: 0.78 },
  { radiusX: 2.2, radiusY: 0.42, rotation: [1.46, 0.27, 5.61], speed: 0.00011, phase: 1.9, direction: 1, color: 0xe9d5ff, visualWeight: 0.72 },
])

export function getOrbitDefinitions(): readonly OrbitDefinition[] {
  return ORBITS
}

export function writeOrbitPosition(
  orbit: OrbitDefinition,
  angle: number,
  target: MutableOrbitPosition,
): MutableOrbitPosition {
  const x = orbit.radiusX * Math.cos(angle)
  const y = orbit.radiusY * Math.sin(angle)
  const [xRotation, yRotation, zRotation] = orbit.rotation
  const xCos = Math.cos(xRotation)
  const xSin = Math.sin(xRotation)
  const yAfterX = y * xCos
  const zAfterX = y * xSin
  const yCos = Math.cos(yRotation)
  const ySin = Math.sin(yRotation)
  const xAfterY = x * yCos + zAfterX * ySin
  const zAfterY = -x * ySin + zAfterX * yCos
  const zCos = Math.cos(zRotation)
  const zSin = Math.sin(zRotation)

  target.x = xAfterY * zCos - yAfterX * zSin
  target.y = xAfterY * zSin + yAfterX * zCos
  target.z = zAfterY
  return target
}

export function createOrbitPosition(
  orbit: OrbitDefinition,
  angle: number,
): readonly [number, number, number] {
  const target = writeOrbitPosition(orbit, angle, { x: 0, y: 0, z: 0 })
  return [target.x, target.y, target.z]
}

export function createOrbitPoints(
  orbit: OrbitDefinition,
  segments: number,
): Float32Array {
  const safeSegments = Number.isFinite(segments)
    ? Math.max(3, Math.floor(segments))
    : 3
  const points = new Float32Array((safeSegments + 1) * 3)
  const target = { x: 0, y: 0, z: 0 }

  for (let index = 0; index <= safeSegments; index += 1) {
    const angle = index === safeSegments
      ? 0
      : (index / safeSegments) * Math.PI * 2
    writeOrbitPosition(orbit, angle, target)
    points[index * 3] = target.x
    points[index * 3 + 1] = target.y
    points[index * 3 + 2] = target.z
  }

  return points
}
```

Keep `getOrbitalSceneProfile` thresholds and `createParticlePositions` behavior unchanged. Remove the old array-returning private `rotatePoint` after all callers use `writeOrbitPosition`.

- [ ] **Step 4: Run geometry tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarGeometry.test.ts
```

Expected: PASS with every geometry/profile test green.

- [ ] **Step 5: Commit the geometry slice**

```powershell
git add src/components/orbitalAvatarGeometry.ts src/components/orbitalAvatarGeometry.test.ts
git commit -m "feat: expand responsive orbit profiles"
```

---

### Task 2: Add the immutable core motion physics

**Files:**
- Create: `src/components/orbitalAvatarMotion.ts`
- Create: `src/components/orbitalAvatarMotion.test.ts`

- [ ] **Step 1: Write failing core physics tests**

Create `orbitalAvatarMotion.test.ts` with these initial tests:

```ts
import { describe, expect, it } from 'vitest'

import {
  ORBITAL_MOTION_LIMITS,
  createOrbitalMotionState,
  stepOrbitalMotion,
} from './orbitalAvatarMotion'

describe('orbital avatar motion', () => {
  it('returns deterministic immutable state', () => {
    const state = Object.freeze(createOrbitalMotionState())
    const input = Object.freeze({
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.1,
      dragDeltaY: -0.05,
      dragging: true,
      pointerX: 0.4,
      pointerY: -0.2,
    })

    expect(stepOrbitalMotion(state, input)).toEqual(stepOrbitalMotion(state, input))
    expect(state).toEqual(createOrbitalMotionState())
    expect(input.dragDeltaX).toBe(0.1)
  })

  it('caps rotation and angular velocity under extreme drag', () => {
    const next = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 50,
      dragDeltaY: -50,
      dragging: true,
      pointerX: 50,
      pointerY: -50,
    })

    expect(Math.abs(next.pitch)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxPitch)
    expect(Math.abs(next.yaw)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxYaw)
    expect(Math.abs(next.pitchVelocity)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxPitchVelocity)
    expect(Math.abs(next.yawVelocity)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxYawVelocity)
  })

  it('keeps release momentum in the drag direction while damping it', () => {
    const dragged = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.08,
      dragDeltaY: 0,
      dragging: true,
      pointerX: 0,
      pointerY: 0,
    })
    const released = stepOrbitalMotion(dragged, {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0,
      dragDeltaY: 0,
      dragging: false,
      pointerX: 0,
      pointerY: 0,
    })

    expect(Math.sign(released.yawVelocity)).toBe(Math.sign(dragged.yawVelocity))
    expect(Math.abs(released.yawVelocity)).toBeLessThan(Math.abs(dragged.yawVelocity))
    expect(released.yaw).toBeGreaterThan(dragged.yaw)
  })

  it('damps neutral angular velocity monotonically before it changes direction', () => {
    let state = Object.freeze({
      ...createOrbitalMotionState(),
      yawVelocity: 1,
    })
    const speeds = [Math.abs(state.yawVelocity)]

    for (let index = 0; index < 8; index += 1) {
      state = stepOrbitalMotion(state, {
        cancelMomentum: false,
        deltaMs: 16,
        dragDeltaX: 0,
        dragDeltaY: 0,
        dragging: false,
        pointerX: 0,
        pointerY: 0,
      })
      speeds.push(Math.abs(state.yawVelocity))
    }

    expect(speeds.every((speed, index) =>
      index === 0 || speed < speeds[index - 1],
    )).toBe(true)
  })

  it('returns an offset pose over many frames without snapping on the first', () => {
    let state = Object.freeze({
      ...createOrbitalMotionState(),
      yaw: 0.3,
    })
    const neutralInput = {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0,
      dragDeltaY: 0,
      dragging: false,
      pointerX: 0,
      pointerY: 0,
    }

    const first = stepOrbitalMotion(state, neutralInput)
    expect(first.yaw).not.toBe(0)
    expect(Math.abs(first.yaw)).toBeLessThan(Math.abs(state.yaw))

    state = first
    for (let index = 0; index < 120; index += 1) {
      state = stepOrbitalMotion(state, neutralInput)
    }
    expect(Math.abs(state.yaw)).toBeLessThan(0.01)
  })

  it('moves the avatar on the first interaction frame but keeps it behind the rig', () => {
    const next = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.1,
      dragDeltaY: 0,
      dragging: true,
      pointerX: 0,
      pointerY: 0,
    })
    const rigProgress = Math.abs(next.yaw / ORBITAL_MOTION_LIMITS.maxYaw)
    const avatarProgress = Math.abs(
      next.avatarX / ORBITAL_MOTION_LIMITS.maxAvatarX,
    )

    expect(avatarProgress).toBeGreaterThan(0)
    expect(avatarProgress).toBeLessThan(rigProgress)
  })

  it('treats a ten-second frame like the maximum safe frame delta', () => {
    const state = createOrbitalMotionState()
    const baseInput = {
      cancelMomentum: false,
      dragDeltaX: 0,
      dragDeltaY: 0,
      dragging: false,
      pointerX: 1,
      pointerY: 1,
    }

    expect(stepOrbitalMotion(state, { ...baseInput, deltaMs: 10_000 })).toEqual(
      stepOrbitalMotion(state, {
        ...baseInput,
        deltaMs: ORBITAL_MOTION_LIMITS.maxDeltaMs,
      }),
    )
  })

  it('keeps avatar translation roll and scale inside their limits', () => {
    let state = createOrbitalMotionState()

    for (let index = 0; index < 180; index += 1) {
      state = stepOrbitalMotion(state, {
        cancelMomentum: false,
        deltaMs: 16,
        dragDeltaX: 0.2,
        dragDeltaY: -0.2,
        dragging: index < 20,
        pointerX: 1,
        pointerY: -1,
      })
    }

    expect(Math.abs(state.avatarX)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarX)
    expect(Math.abs(state.avatarY)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarY)
    expect(Math.abs(state.avatarRoll)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarRoll)
    expect(state.avatarScale).toBeGreaterThanOrEqual(0.992)
    expect(state.avatarScale).toBeLessThanOrEqual(1.008)
  })

  it('cancels velocity without snapping the current pose', () => {
    const moving = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.1,
      dragDeltaY: 0.05,
      dragging: true,
      pointerX: 0,
      pointerY: 0,
    })
    const cancelled = stepOrbitalMotion(moving, {
      cancelMomentum: true,
      deltaMs: 0,
      dragDeltaX: 0,
      dragDeltaY: 0,
      dragging: false,
      pointerX: 0,
      pointerY: 0,
    })

    expect(cancelled.pitch).toBe(moving.pitch)
    expect(cancelled.yaw).toBe(moving.yaw)
    expect(cancelled.pitchVelocity).toBe(0)
    expect(cancelled.yawVelocity).toBe(0)
  })
})
```

- [ ] **Step 2: Run the motion test to verify RED**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarMotion.test.ts
```

Expected: FAIL because `orbitalAvatarMotion.ts` does not exist.

- [ ] **Step 3: Implement the bounded spring/damping model**

Create `orbitalAvatarMotion.ts` with this complete core:

```ts
export const ORBITAL_MOTION_LIMITS = Object.freeze({
  maxDeltaMs: 40,
  maxPitch: Math.PI / 10,
  maxYaw: Math.PI / 6,
  parallaxPitch: Math.PI / 45,
  parallaxYaw: Math.PI / 30,
  maxPitchVelocity: Math.PI / 2,
  maxYawVelocity: Math.PI * 0.75,
  maxAvatarX: 0.09,
  maxAvatarY: 0.06,
  maxAvatarRoll: Math.PI / 60,
})

export interface OrbitalMotionState {
  readonly elapsedSeconds: number
  readonly pitch: number
  readonly yaw: number
  readonly pitchVelocity: number
  readonly yawVelocity: number
  readonly avatarX: number
  readonly avatarY: number
  readonly avatarXVelocity: number
  readonly avatarYVelocity: number
  readonly avatarRoll: number
  readonly avatarRollVelocity: number
  readonly avatarScale: number
}

export interface OrbitalMotionInput {
  readonly deltaMs: number
  readonly pointerX: number
  readonly pointerY: number
  readonly dragDeltaX: number
  readonly dragDeltaY: number
  readonly dragging: boolean
  readonly cancelMomentum: boolean
}

interface SpringResult {
  readonly value: number
  readonly velocity: number
}

const ROTATION_STIFFNESS = 16
const ROTATION_DAMPING = 7.5
const AVATAR_STIFFNESS = 12
const AVATAR_DAMPING = 7

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function stepSpring(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  deltaSeconds: number,
): SpringResult {
  if (deltaSeconds === 0) return { value, velocity }
  const acceleration = (target - value) * stiffness - velocity * damping
  const nextVelocity = velocity + acceleration * deltaSeconds
  return {
    value: value + nextVelocity * deltaSeconds,
    velocity: nextVelocity,
  }
}

export function createOrbitalMotionState(): OrbitalMotionState {
  return Object.freeze({
    elapsedSeconds: 0,
    pitch: 0,
    yaw: 0,
    pitchVelocity: 0,
    yawVelocity: 0,
    avatarX: 0,
    avatarY: 0,
    avatarXVelocity: 0,
    avatarYVelocity: 0,
    avatarRoll: 0,
    avatarRollVelocity: 0,
    avatarScale: 1,
  })
}

export function stepOrbitalMotion(
  state: OrbitalMotionState,
  input: OrbitalMotionInput,
): OrbitalMotionState {
  const deltaMs = clamp(
    finiteOrZero(input.deltaMs),
    0,
    ORBITAL_MOTION_LIMITS.maxDeltaMs,
  )
  const deltaSeconds = deltaMs / 1000
  const pointerX = clamp(finiteOrZero(input.pointerX), -1, 1)
  const pointerY = clamp(finiteOrZero(input.pointerY), -1, 1)
  const dragDeltaX = finiteOrZero(input.dragDeltaX)
  const dragDeltaY = finiteOrZero(input.dragDeltaY)
  const targetPitch = pointerY * ORBITAL_MOTION_LIMITS.parallaxPitch
  const targetYaw = pointerX * ORBITAL_MOTION_LIMITS.parallaxYaw

  let pitch = state.pitch
  let yaw = state.yaw
  let pitchVelocity = input.cancelMomentum ? 0 : state.pitchVelocity
  let yawVelocity = input.cancelMomentum ? 0 : state.yawVelocity

  if (input.dragging) {
    pitch = clamp(
      pitch + dragDeltaY * ORBITAL_MOTION_LIMITS.maxPitch * 1.2,
      -ORBITAL_MOTION_LIMITS.maxPitch,
      ORBITAL_MOTION_LIMITS.maxPitch,
    )
    yaw = clamp(
      yaw + dragDeltaX * ORBITAL_MOTION_LIMITS.maxYaw * 1.2,
      -ORBITAL_MOTION_LIMITS.maxYaw,
      ORBITAL_MOTION_LIMITS.maxYaw,
    )
    if (deltaSeconds > 0 && !input.cancelMomentum) {
      pitchVelocity = clamp(
        dragDeltaY * ORBITAL_MOTION_LIMITS.maxPitch / deltaSeconds,
        -ORBITAL_MOTION_LIMITS.maxPitchVelocity,
        ORBITAL_MOTION_LIMITS.maxPitchVelocity,
      )
      yawVelocity = clamp(
        dragDeltaX * ORBITAL_MOTION_LIMITS.maxYaw / deltaSeconds,
        -ORBITAL_MOTION_LIMITS.maxYawVelocity,
        ORBITAL_MOTION_LIMITS.maxYawVelocity,
      )
    }
  } else if (deltaSeconds > 0) {
    const nextPitch = stepSpring(
      pitch,
      pitchVelocity,
      targetPitch,
      ROTATION_STIFFNESS,
      ROTATION_DAMPING,
      deltaSeconds,
    )
    const nextYaw = stepSpring(
      yaw,
      yawVelocity,
      targetYaw,
      ROTATION_STIFFNESS,
      ROTATION_DAMPING,
      deltaSeconds,
    )
    pitch = clamp(
      nextPitch.value,
      -ORBITAL_MOTION_LIMITS.maxPitch,
      ORBITAL_MOTION_LIMITS.maxPitch,
    )
    yaw = clamp(
      nextYaw.value,
      -ORBITAL_MOTION_LIMITS.maxYaw,
      ORBITAL_MOTION_LIMITS.maxYaw,
    )
    pitchVelocity = clamp(
      nextPitch.velocity,
      -ORBITAL_MOTION_LIMITS.maxPitchVelocity,
      ORBITAL_MOTION_LIMITS.maxPitchVelocity,
    )
    yawVelocity = clamp(
      nextYaw.velocity,
      -ORBITAL_MOTION_LIMITS.maxYawVelocity,
      ORBITAL_MOTION_LIMITS.maxYawVelocity,
    )
  }

  const targetAvatarX = clamp(
    yaw / ORBITAL_MOTION_LIMITS.maxYaw,
    -1,
    1,
  ) * ORBITAL_MOTION_LIMITS.maxAvatarX
  const targetAvatarY = clamp(
    -pitch / ORBITAL_MOTION_LIMITS.maxPitch,
    -1,
    1,
  ) * ORBITAL_MOTION_LIMITS.maxAvatarY
  const targetAvatarRoll = clamp(
    -yaw / ORBITAL_MOTION_LIMITS.maxYaw,
    -1,
    1,
  ) * ORBITAL_MOTION_LIMITS.maxAvatarRoll
  const avatarX = stepSpring(
    state.avatarX,
    input.cancelMomentum ? 0 : state.avatarXVelocity,
    targetAvatarX,
    AVATAR_STIFFNESS,
    AVATAR_DAMPING,
    deltaSeconds,
  )
  const avatarY = stepSpring(
    state.avatarY,
    input.cancelMomentum ? 0 : state.avatarYVelocity,
    targetAvatarY,
    AVATAR_STIFFNESS,
    AVATAR_DAMPING,
    deltaSeconds,
  )
  const avatarRoll = stepSpring(
    state.avatarRoll,
    input.cancelMomentum ? 0 : state.avatarRollVelocity,
    targetAvatarRoll,
    AVATAR_STIFFNESS,
    AVATAR_DAMPING,
    deltaSeconds,
  )
  const elapsedSeconds = state.elapsedSeconds + deltaSeconds

  return Object.freeze({
    elapsedSeconds,
    pitch,
    yaw,
    pitchVelocity,
    yawVelocity,
    avatarX: clamp(avatarX.value, -ORBITAL_MOTION_LIMITS.maxAvatarX, ORBITAL_MOTION_LIMITS.maxAvatarX),
    avatarY: clamp(avatarY.value, -ORBITAL_MOTION_LIMITS.maxAvatarY, ORBITAL_MOTION_LIMITS.maxAvatarY),
    avatarXVelocity: avatarX.velocity,
    avatarYVelocity: avatarY.velocity,
    avatarRoll: clamp(avatarRoll.value, -ORBITAL_MOTION_LIMITS.maxAvatarRoll, ORBITAL_MOTION_LIMITS.maxAvatarRoll),
    avatarRollVelocity: avatarRoll.velocity,
    avatarScale: 1 + Math.sin(elapsedSeconds * 0.45) * 0.008,
  })
}
```

- [ ] **Step 4: Run the core motion tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarMotion.test.ts
```

Expected: PASS with nine core physics tests, including damping, no-snap convergence, and first-frame avatar lag.

- [ ] **Step 5: Commit the core physics slice**

```powershell
git add src/components/orbitalAvatarMotion.ts src/components/orbitalAvatarMotion.test.ts
git commit -m "feat: add orbital motion physics"
```

---

### Task 3: Add gesture intent and deterministic per-orbit response

**Files:**
- Modify: `src/components/orbitalAvatarMotion.ts`
- Modify: `src/components/orbitalAvatarMotion.test.ts`

- [ ] **Step 1: Write failing intent and orbit-response tests**

Add the geometry import and these tests:

```ts
import { getOrbitDefinitions } from './orbitalAvatarGeometry'
import {
  getOrbitMotionResponse,
  getOrbitRigRotation,
  resolveOrbitalDragIntent,
} from './orbitalAvatarMotion'

it('prefers native scrolling for coarse vertical intent', () => {
  expect(resolveOrbitalDragIntent({ coarsePointer: false, deltaX: 0, deltaY: 0 })).toBe('scene')
  expect(resolveOrbitalDragIntent({ coarsePointer: true, deltaX: 4, deltaY: 2 })).toBe('pending')
  expect(resolveOrbitalDragIntent({ coarsePointer: true, deltaX: 18, deltaY: 6 })).toBe('scene')
  expect(resolveOrbitalDragIntent({ coarsePointer: true, deltaX: 8, deltaY: 20 })).toBe('scroll')
  expect(resolveOrbitalDragIntent({ coarsePointer: true, deltaX: 12, deltaY: 12 })).toBe('scroll')
})

it('creates stable bounded physical responses for all eleven orbits', () => {
  const first = getOrbitDefinitions().map(getOrbitMotionResponse)
  const second = getOrbitDefinitions().map(getOrbitMotionResponse)

  expect(first).toEqual(second)
  expect(first).toHaveLength(11)
  first.forEach((response) => {
    expect(response.precessionRate).toBeGreaterThanOrEqual(0.08)
    expect(response.precessionRate).toBeLessThanOrEqual(0.18)
    expect(response.precessionAmplitude).toBeGreaterThanOrEqual(0.01)
    expect(response.precessionAmplitude).toBeLessThanOrEqual(0.035)
    expect(response.lag).toBeGreaterThanOrEqual(0.35)
    expect(response.lag).toBeLessThanOrEqual(0.8)
    expect(response.velocityInfluence).toBeGreaterThanOrEqual(0.012)
    expect(response.velocityInfluence).toBeLessThanOrEqual(0.035)
  })
})

it('keeps secondary orbit rotation alive and below five degrees', () => {
  const response = getOrbitMotionResponse(getOrbitDefinitions()[4], 4)
  const first = getOrbitRigRotation(response, 0, 0, 0)
  const later = getOrbitRigRotation(response, 8, 0.4, -0.3)
  const limit = Math.PI / 36

  expect(later).not.toEqual(first)
  expect(Math.abs(later.x)).toBeLessThanOrEqual(limit)
  expect(Math.abs(later.y)).toBeLessThanOrEqual(limit)
  expect(Math.abs(later.z)).toBeLessThanOrEqual(limit)
})
```

- [ ] **Step 2: Run the motion test to verify RED**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarMotion.test.ts
```

Expected: FAIL because drag-intent and orbit-response exports are missing.

- [ ] **Step 3: Add gesture and orbit-response exports**

Append these definitions to `orbitalAvatarMotion.ts`:

```ts
export type OrbitalDragIntent = 'pending' | 'scene' | 'scroll'

export interface OrbitalDragIntentInput {
  readonly coarsePointer: boolean
  readonly deltaX: number
  readonly deltaY: number
}

export interface OrbitMotionSeed {
  readonly radiusX: number
  readonly radiusY: number
  readonly speed: number
  readonly phase: number
  readonly direction: 1 | -1
}

export interface OrbitMotionResponse {
  readonly phase: number
  readonly direction: 1 | -1
  readonly precessionRate: number
  readonly precessionAmplitude: number
  readonly lag: number
  readonly velocityInfluence: number
}

export interface OrbitRigRotation {
  readonly x: number
  readonly y: number
  readonly z: number
}

const DRAG_DEAD_ZONE = 8
const MAX_SECONDARY_ROTATION = Math.PI / 36

export function resolveOrbitalDragIntent(
  input: OrbitalDragIntentInput,
): OrbitalDragIntent {
  if (!input.coarsePointer) return 'scene'
  const deltaX = Math.abs(finiteOrZero(input.deltaX))
  const deltaY = Math.abs(finiteOrZero(input.deltaY))
  if (Math.max(deltaX, deltaY) < DRAG_DEAD_ZONE) return 'pending'
  return deltaX > deltaY ? 'scene' : 'scroll'
}

export function getOrbitMotionResponse(
  orbit: OrbitMotionSeed,
  index: number,
): OrbitMotionResponse {
  const safeIndex = Math.max(0, Math.floor(finiteOrZero(index)))
  return Object.freeze({
    phase: orbit.phase + safeIndex * 0.73 + orbit.radiusX * 0.11,
    direction: orbit.direction,
    precessionRate: 0.08 + (safeIndex % 6) * 0.018,
    precessionAmplitude: 0.01 + (safeIndex % 5) * 0.006,
    lag: 0.35 + (safeIndex % 6) * 0.09,
    velocityInfluence: 0.012 + (safeIndex % 5) * 0.005,
  })
}

export function getOrbitRigRotation(
  response: OrbitMotionResponse,
  elapsedSeconds: number,
  pitchVelocity: number,
  yawVelocity: number,
): OrbitRigRotation {
  const elapsed = Math.max(0, finiteOrZero(elapsedSeconds))
  const phase = response.phase + elapsed * response.precessionRate * response.direction
  const x = Math.sin(phase) * response.precessionAmplitude +
    finiteOrZero(yawVelocity) * response.velocityInfluence
  const y = Math.cos(phase * 0.73) * response.precessionAmplitude * response.lag +
    finiteOrZero(pitchVelocity) * response.velocityInfluence
  const z = Math.sin(phase * 0.47) * response.precessionAmplitude * 0.5

  return Object.freeze({
    x: clamp(x, -MAX_SECONDARY_ROTATION, MAX_SECONDARY_ROTATION),
    y: clamp(y, -MAX_SECONDARY_ROTATION, MAX_SECONDARY_ROTATION),
    z: clamp(z, -MAX_SECONDARY_ROTATION, MAX_SECONDARY_ROTATION),
  })
}
```

- [ ] **Step 4: Run motion and geometry tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarMotion.test.ts src/components/orbitalAvatarGeometry.test.ts
```

Expected: PASS with all pure geometry and motion tests.

- [ ] **Step 5: Commit gesture/orbit response**

```powershell
git add src/components/orbitalAvatarMotion.ts src/components/orbitalAvatarMotion.test.ts
git commit -m "feat: model orbital gesture response"
```

---

### Task 4: Split the Three.js scene into named reusable rigs

**Files:**
- Modify: `src/components/OrbitalAvatar.tsx:3-15,137-294,298-355,549-560`
- Modify: `src/components/OrbitalAvatar.test.tsx:56-257,499-572,692-812`

- [ ] **Step 1: Upgrade the Three.js test doubles and write failing topology tests**

Make vectors and scales record their values, then give groups stable names and visibility:

```ts
const createPosition = () => {
  const position = {
    x: 0,
    y: 0,
    z: 0,
    set: vi.fn((x: number, y: number, z: number) => {
      position.x = x
      position.y = y
      position.z = z
    }),
  }
  return position
}

const createScale = () => {
  const scale = {
    x: 1,
    y: 1,
    z: 1,
    set: vi.fn((x: number, y: number, z: number) => {
      scale.x = x
      scale.y = y
      scale.z = z
    }),
    setScalar: vi.fn((value: number) => {
      scale.x = value
      scale.y = value
      scale.z = value
    }),
  }
  return scale
}
```

Apply `createScale()` to Group, Mesh, Points, and Sprite mocks. Add `rotation = 0` to `DisposableMaterial`. Replace the Group mock with:

```ts
Group: class {
  children: unknown[] = []
  name = ''
  visible = true
  add = vi.fn((child: unknown) => this.children.push(child))
  position = createPosition()
  rotation = { x: 0, y: 0, z: 0 }
  scale = createScale()

  constructor() {
    three.groups.push(this)
  }
},
```

Add a helper and topology tests after the successful scene test:

```ts
function getGroup(name: string) {
  const group = three.groups.find((candidate) => candidate.name === name)
  expect(group).toBeDefined()
  return group!
}

it('creates named avatar interaction glow and eleven orbit rigs', async () => {
  installControlledBrowser()
  render(<OrbitalAvatar />)

  await waitFor(() => expect(three.lines).toHaveLength(11))

  const root = getGroup('root')
  const avatarRig = getGroup('avatarRig')
  const interactionRig = getGroup('interactionRig')
  const orbitalGroup = getGroup('orbitalGroup')
  const glowGroup = getGroup('glowGroup')
  const orbitRigs = three.groups.filter((group) => group.name.startsWith('orbitRig-'))

  expect(orbitRigs).toHaveLength(11)
  expect(root.add).toHaveBeenCalledWith(avatarRig)
  expect(root.add).toHaveBeenCalledWith(interactionRig)
  expect(interactionRig.add).toHaveBeenCalledWith(orbitalGroup)
  expect(three.scenes[0].add).toHaveBeenCalledWith(glowGroup)
  orbitRigs.forEach((rig, index) => {
    expect(orbitalGroup.add).toHaveBeenCalledWith(rig)
    expect(rig.add).toHaveBeenCalledWith(three.lines[index])
    expect(rig.add).toHaveBeenCalledWith(three.meshes[index + 2])
  })
})

it('reuses eleven rigs while profiles reveal eleven nine and six', async () => {
  installControlledBrowser({ finePointer: true })
  render(<OrbitalAvatar />)
  await waitFor(() => expect(three.lines).toHaveLength(11))

  const visibleRigs = () => three.groups.filter(
    (group) => group.name.startsWith('orbitRig-') && group.visible,
  )
  expect(visibleRigs()).toHaveLength(11)

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 })
  act(() => window.dispatchEvent(new Event('resize')))
  expect(visibleRigs()).toHaveLength(9)

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  act(() => window.dispatchEvent(new Event('orientationchange')))
  expect(visibleRigs()).toHaveLength(6)
  expect(three.lines).toHaveLength(11)
})

it('uses orbit visual weight for quiet line and satellite actors', async () => {
  installControlledBrowser()
  render(<OrbitalAvatar />)
  await waitFor(() => expect(three.lines).toHaveLength(11))

  expect(three.lines[8].material.options.opacity).toBeCloseTo(0.3 * 0.84)
  expect(three.meshes[10].scale.setScalar).toHaveBeenCalledWith(0.84)
  expect(three.lines[10].material.options.opacity).toBeCloseTo(0.3 * 0.72)
  expect(three.meshes[12].scale.setScalar).toHaveBeenCalledWith(0.72)
})
```

Update old exact expectations to 11 lines and 13 meshes, and replace positional `three.groups[1]` assertions with `getGroup('interactionRig')` or `getGroup('orbitalGroup')`.

- [ ] **Step 2: Run the component test to verify RED**

Run:

```powershell
npm test -- --run src/components/OrbitalAvatar.test.tsx
```

Expected: FAIL because only three unnamed groups and eight orbit actors exist.

- [ ] **Step 3: Build the named hierarchy and one rig per orbit**

Update imports:

```ts
import {
  createOrbitPoints,
  createParticlePositions,
  getOrbitDefinitions,
  getOrbitalSceneProfile,
  type OrbitalSceneProfile,
} from './orbitalAvatarGeometry'
import { getOrbitMotionResponse } from './orbitalAvatarMotion'
```

Replace scene-group creation with:

```ts
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
camera.position.z = 5.4
const root = new THREE.Group()
root.name = 'root'
const avatarRig = new THREE.Group()
avatarRig.name = 'avatarRig'
const interactionRig = new THREE.Group()
interactionRig.name = 'interactionRig'
const orbitalGroup = new THREE.Group()
orbitalGroup.name = 'orbitalGroup'
const glowGroup = new THREE.Group()
glowGroup.name = 'glowGroup'
scene.add(root)
scene.add(glowGroup)
root.add(avatarRig)
root.add(interactionRig)
interactionRig.add(orbitalGroup)
```

Add `core` and `atmosphere` to `avatarRig`, not `root`. Replace orbit actor creation with:

```ts
const orbits = getOrbitDefinitions()
const orbitActors = orbits.map((orbit, index) => {
  const rig = new THREE.Group()
  rig.name = `orbitRig-${index}`
  orbitalGroup.add(rig)

  const orbitGeometry = new THREE.BufferGeometry()
  geometries.push(orbitGeometry)
  const orbitPosition = new THREE.Float32BufferAttribute(
    createOrbitPoints(orbit, MAX_SCENE_PROFILE.orbitSegments),
    3,
  )
  orbitGeometry.setAttribute('position', orbitPosition)
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: orbit.color,
    depthTest: true,
    depthWrite: false,
    opacity: 0.3 * orbit.visualWeight,
    transparent: true,
  })
  materials.push(orbitMaterial)
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
  orbitLine.renderOrder = 2
  rig.add(orbitLine)

  const satelliteGeometry = new THREE.SphereGeometry(0.04, 10, 8)
  geometries.push(satelliteGeometry)
  const satelliteMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: orbit.color,
    depthTest: true,
    depthWrite: false,
    transparent: true,
  })
  materials.push(satelliteMaterial)
  const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial)
  satellite.renderOrder = 2
  satellite.scale.setScalar(orbit.visualWeight)
  rig.add(satellite)

  return {
    geometry: orbitGeometry,
    line: orbitLine,
    mesh: satellite,
    motion: getOrbitMotionResponse(orbit, index),
    orbit,
    position: orbitPosition,
    rig,
    scratchPosition: { x: 0, y: 0, z: 0 },
  }
})
```

Add `particleField` directly to `interactionRig`. In `applySceneProfile`, replace direct line/mesh visibility and the old group scale with:

```ts
interactionRig.scale.setScalar(activeProfile.orbitScale)
orbitActors.forEach((actor, index) => {
  actor.rig.visible = index < activeProfile.orbitCount
  if (changed) {
    const nextPositions = createOrbitPoints(
      actor.orbit,
      activeProfile.orbitSegments,
    )
    actor.position.array.fill(0)
    actor.position.array.set(nextPositions)
    actor.position.needsUpdate = true
  }
  actor.geometry.setDrawRange(0, activeProfile.orbitSegments + 1)
})
```

When the avatar sprite is created, use:

```ts
avatarRig.add(avatar)
```

- [ ] **Step 4: Run topology, geometry, and glow tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/OrbitalAvatar.test.tsx src/components/orbitalAvatarGeometry.test.ts src/components/orbitalGlow.test.ts
```

Expected: PASS with 11 actors, 16 named groups, profile reuse, and existing glow contracts intact.

- [ ] **Step 5: Commit the scene topology**

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "refactor: split orbital scene rigs"
```

---

### Task 5: Integrate physics, avatar lag, precession, and pause-safe time

**Files:**
- Modify: `src/components/OrbitalAvatar.tsx:90-102,296-450,514-560`
- Modify: `src/components/OrbitalAvatar.test.tsx:548-664,986-1027,1109-1152`

- [ ] **Step 1: Write failing layered-motion and resume tests**

Add tests that address groups by name:

```ts
it('applies layered motion while the avatar follows the interaction rig with lag', async () => {
  const browser = installControlledBrowser({ finePointer: true })
  const rendered = render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))

  const wrapper = rendered.container.firstElementChild as HTMLDivElement
  wrapper.getBoundingClientRect = vi.fn(() => ({
    bottom: 600, height: 400, left: 100, right: 700,
    top: 200, width: 600, x: 100, y: 200, toJSON: vi.fn(),
  }))
  const interactionRig = getGroup('interactionRig')
  const avatarRig = getGroup('avatarRig')
  const glowGroup = getGroup('glowGroup')
  const orbitRig = getGroup('orbitRig-0')
  const initialGlowRotation = { ...glowGroup.rotation }
  const initialOrbitRotation = { ...orbitRig.rotation }
  const runNextFrame = (time: number) => {
    const [frameId, frame] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(frameId)
    act(() => frame(time))
  }

  runNextFrame(1000)
  act(() => window.dispatchEvent(
    new MouseEvent('pointermove', { clientX: 700, clientY: 400 }),
  ))
  runNextFrame(1016)

  expect(interactionRig.rotation.y).not.toBe(0)
  expect(Math.abs(avatarRig.position.x)).toBeGreaterThan(0)
  expect(Math.abs(avatarRig.position.x)).toBeLessThan(
    Math.abs(interactionRig.rotation.y),
  )
  expect(orbitRig.rotation).not.toEqual(initialOrbitRotation)
  expect(glowGroup.position.x).toBe(avatarRig.position.x)
  expect(glowGroup.position.y).toBe(avatarRig.position.y)
  expect(glowGroup.rotation).toEqual(initialGlowRotation)
  expect(browser.pendingFrames).toHaveLength(1)
})

it('uses the first resumed frame only to reset its clock', async () => {
  const browser = installControlledBrowser()
  render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))

  const runNextFrame = (time: number) => {
    const [id, callback] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(id)
    act(() => callback(time))
  }
  runNextFrame(1000)
  const satellite = three.meshes[2]
  const beforePause = { ...satellite.position }

  act(() => browser.intersectionObservers[0].callback(
    [{ isIntersecting: false } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  ))
  act(() => browser.intersectionObservers[0].callback(
    [{ isIntersecting: true } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  ))
  runNextFrame(10_000)

  expect(satellite.position).toMatchObject(beforePause)
})

it('keeps the reduced-motion avatar and glow static', async () => {
  const browser = installControlledBrowser({ reducedMotion: true })
  render(<OrbitalAvatar />)
  await waitFor(() => expect(three.renderers[0]?.render).toHaveBeenCalled())

  const avatarRig = getGroup('avatarRig')
  const glowGroup = getGroup('glowGroup')
  expect(avatarRig.position).toMatchObject({ x: 0, y: 0 })
  expect(avatarRig.scale.setScalar).toHaveBeenLastCalledWith(1)
  expect(glowGroup.position).toMatchObject({ x: 0, y: 0 })
  expect(browser.requestAnimationFrame).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the component test to verify RED**

Run:

```powershell
npm test -- --run src/components/OrbitalAvatar.test.tsx
```

Expected: FAIL because the render loop still writes direct root rotation from raw pointer/time and does not move named rigs.

- [ ] **Step 3: Integrate the pure state into the single render loop**

Add imports:

```ts
import {
  createOrbitalMotionState,
  getOrbitRigRotation,
  stepOrbitalMotion,
  type OrbitalMotionState,
} from './orbitalAvatarMotion'
```

Also add `writeOrbitPosition` to the existing `orbitalAvatarGeometry` import from Task 4.

Near the current scene state, add:

```ts
let motionState: OrbitalMotionState = createOrbitalMotionState()
let lastFrameTime: number | null = null
let dragDeltaX = 0
let dragDeltaY = 0
let dragging = false
let cancelMomentum = false
const pointer = { x: 0, y: 0 }
let avatarMaterial: import('three').SpriteMaterial | null = null

const resetFrameClock = () => {
  lastFrameTime = null
}
```

Replace direct root rotation and raw timestamp animation in `renderFrame` with:

```ts
const renderFrame = (time: number) => {
  if (disposed || !renderer) return
  const deltaMs = prefersReducedMotion || lastFrameTime === null
    ? 0
    : Math.max(0, time - lastFrameTime)
  lastFrameTime = prefersReducedMotion ? null : time
  motionState = stepOrbitalMotion(motionState, {
    cancelMomentum,
    deltaMs,
    dragDeltaX,
    dragDeltaY,
    dragging,
    pointerX: pointer.x,
    pointerY: pointer.y,
  })
  dragDeltaX = 0
  dragDeltaY = 0
  cancelMomentum = false
  const animationSeconds = motionState.elapsedSeconds

  orbitActors.forEach((actor, index) => {
    if (index >= activeProfile.orbitCount) return
    writeOrbitPosition(
      actor.orbit,
      actor.orbit.phase +
        animationSeconds * 1000 * actor.orbit.speed * actor.orbit.direction,
      actor.scratchPosition,
    )
    actor.mesh.position.set(
      actor.scratchPosition.x,
      actor.scratchPosition.y,
      actor.scratchPosition.z,
    )
    const rotation = getOrbitRigRotation(
      actor.motion,
      animationSeconds,
      motionState.pitchVelocity,
      motionState.yawVelocity,
    )
    actor.rig.rotation.x = rotation.x
    actor.rig.rotation.y = rotation.y
    actor.rig.rotation.z = rotation.z
  })

  interactionRig.rotation.x = 0.04 + motionState.pitch
  interactionRig.rotation.y = animationSeconds * 0.025 + motionState.yaw
  avatarRig.position.x = motionState.avatarX
  avatarRig.position.y = motionState.avatarY
  avatarRig.scale.setScalar(motionState.avatarScale)
  if (avatarMaterial) avatarMaterial.rotation = motionState.avatarRoll
  glowGroup.position.x = motionState.avatarX
  glowGroup.position.y = motionState.avatarY

  glowActors.forEach(({ definition, sprite }) => {
    const breath = 1 + Math.sin(
      animationSeconds * 0.45 + definition.pulseOffset,
    ) * 0.018
    sprite.scale.set(
      definition.scale[0] * activeProfile.glowScale * breath,
      definition.scale[1] * activeProfile.glowScale * breath,
      1,
    )
  })
  particleField.rotation.x = animationSeconds * 0.006
  particleField.rotation.y = animationSeconds * -0.012
  renderer.render(scene, camera)
}
```

Assign the loaded avatar material to the existing nullable variable:

```ts
avatarMaterial = new THREE.SpriteMaterial({
  alphaTest: 0.02,
  depthTest: true,
  depthWrite: true,
  map: loadedTexture,
  transparent: true,
})
materials.push(avatarMaterial)
const avatar = new THREE.Sprite(avatarMaterial)
```

Call `resetFrameClock()` whenever animation stops and before capability changes that invalidate elapsed time. The stopped branch already resets the clock, so do not reset it again for every scheduled frame. In `refreshLoop`, use:

```ts
if (shouldAnimate()) {
  if (frameId === null) {
    frameId = requestAnimationFrame(animate)
  }
  return
}

resetFrameClock()
if (frameId !== null) {
  cancelAnimationFrame(frameId)
  frameId = null
}
```

- [ ] **Step 4: Run motion, component, glow, and fallback tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/orbitalAvatarMotion.test.ts src/components/OrbitalAvatar.test.tsx src/components/orbitalGlow.test.ts src/sections/HeroSection.test.tsx
```

Expected: PASS with one RAF, pause-safe active time, aligned avatar/glow translation, and static reduced motion.

- [ ] **Step 5: Commit layered animation**

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "feat: animate layered orbital rigs"
```

---

### Task 6: Add desktop drag, mobile intent, capture, and cleanup

**Files:**
- Modify: `src/components/OrbitalAvatar.tsx:90-102,357-533,562-632,669-674`
- Modify: `src/components/OrbitalAvatar.test.tsx:320-416,894-984,1154-1191`

- [ ] **Step 1: Add pointer helpers and failing interaction tests**

Add this JSDOM-safe event helper to the component test:

```ts
function createPointerEvent(
  type: string,
  init: {
    clientX: number
    clientY: number
    pointerId: number
    pointerType: string
    isPrimary?: boolean
  },
): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    clientX: { value: init.clientX },
    clientY: { value: init.clientY },
    isPrimary: { value: init.isPrimary ?? true },
    pointerId: { value: init.pointerId },
    pointerType: { value: init.pointerType },
  })
  return event as PointerEvent
}
```

Add tests for the complete gesture contract:

```ts
it('captures mouse drag and preserves release momentum', async () => {
  const browser = installControlledBrowser({ finePointer: true })
  const rendered = render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
  const wrapper = rendered.container.firstElementChild as HTMLDivElement
  wrapper.getBoundingClientRect = vi.fn(() => ({
    bottom: 600, height: 400, left: 100, right: 700,
    top: 200, width: 600, x: 100, y: 200, toJSON: vi.fn(),
  }))
  wrapper.setPointerCapture = vi.fn()
  wrapper.releasePointerCapture = vi.fn()
  wrapper.hasPointerCapture = vi.fn(() => true)

  const runFrame = (time: number) => {
    const [id, callback] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(id)
    act(() => callback(time))
  }
  runFrame(1000)

  act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
    clientX: 400, clientY: 400, pointerId: 7, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointermove', {
    clientX: 520, clientY: 360, pointerId: 7, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointerup', {
    clientX: 520, clientY: 360, pointerId: 7, pointerType: 'mouse',
  })))
  runFrame(1016)
  const draggedYaw = getGroup('interactionRig').rotation.y
  runFrame(1032)
  const releaseDelta = getGroup('interactionRig').rotation.y - draggedYaw
  const idleDelta = 0.016 * 0.025

  expect(wrapper.setPointerCapture).toHaveBeenCalledWith(7)
  expect(wrapper.releasePointerCapture).toHaveBeenCalledWith(7)
  expect(releaseDelta).toBeGreaterThan(idleDelta)
})

it('uses horizontal touch drag while vertical intent remains native scroll', async () => {
  const browser = installControlledBrowser({ coarsePointer: true })
  const rendered = render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
  const wrapper = rendered.container.firstElementChild as HTMLDivElement
  wrapper.getBoundingClientRect = vi.fn(() => ({
    bottom: 600, height: 400, left: 100, right: 700,
    top: 200, width: 600, x: 100, y: 200, toJSON: vi.fn(),
  }))
  wrapper.setPointerCapture = vi.fn()
  wrapper.releasePointerCapture = vi.fn()
  wrapper.hasPointerCapture = vi.fn(() => true)
  const runFrame = (time: number) => {
    const [id, callback] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(id)
    act(() => callback(time))
  }
  runFrame(1000)

  const down = createPointerEvent('pointerdown', {
    clientX: 300, clientY: 400, pointerId: 8, pointerType: 'touch',
  })
  const vertical = createPointerEvent('pointermove', {
    clientX: 306, clientY: 440, pointerId: 8, pointerType: 'touch',
  })
  act(() => wrapper.dispatchEvent(down))
  act(() => wrapper.dispatchEvent(vertical))
  const beforeVerticalYaw = getGroup('interactionRig').rotation.y
  runFrame(1016)
  const verticalDelta = getGroup('interactionRig').rotation.y - beforeVerticalYaw

  expect(vertical.defaultPrevented).toBe(false)
  expect(wrapper.releasePointerCapture).toHaveBeenCalledWith(8)
  expect(verticalDelta).toBeCloseTo(0.016 * 0.025, 8)

  const horizontalDown = createPointerEvent('pointerdown', {
    clientX: 300, clientY: 400, pointerId: 9, pointerType: 'touch',
  })
  const horizontalMove = createPointerEvent('pointermove', {
    clientX: 350, clientY: 406, pointerId: 9, pointerType: 'touch',
  })
  act(() => wrapper.dispatchEvent(horizontalDown))
  act(() => wrapper.dispatchEvent(horizontalMove))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointerup', {
    clientX: 350, clientY: 406, pointerId: 9, pointerType: 'touch',
  })))
  runFrame(1032)
  const draggedYaw = getGroup('interactionRig').rotation.y
  runFrame(1048)

  expect(horizontalMove.defaultPrevented).toBe(true)
  expect(getGroup('interactionRig').rotation.y - draggedYaw).toBeGreaterThan(
    0.016 * 0.025,
  )
})

it('clears stale cancellation when a new drag starts before the next frame', async () => {
  const browser = installControlledBrowser({ finePointer: true })
  const rendered = render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
  const wrapper = rendered.container.firstElementChild as HTMLDivElement
  wrapper.getBoundingClientRect = vi.fn(() => ({
    bottom: 600, height: 400, left: 100, right: 700,
    top: 200, width: 600, x: 100, y: 200, toJSON: vi.fn(),
  }))
  wrapper.setPointerCapture = vi.fn()
  wrapper.releasePointerCapture = vi.fn()
  wrapper.hasPointerCapture = vi.fn(() => true)
  const runFrame = (time: number) => {
    const [id, callback] = [...browser.pendingFrames.entries()][0]
    browser.pendingFrames.delete(id)
    act(() => callback(time))
  }
  runFrame(1000)

  act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
    clientX: 300, clientY: 400, pointerId: 12, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointercancel', {
    clientX: 300, clientY: 400, pointerId: 12, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
    clientX: 300, clientY: 400, pointerId: 13, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointermove', {
    clientX: 390, clientY: 400, pointerId: 13, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointerup', {
    clientX: 390, clientY: 400, pointerId: 13, pointerType: 'mouse',
  })))
  runFrame(1016)
  const draggedYaw = getGroup('interactionRig').rotation.y
  runFrame(1032)

  expect(getGroup('interactionRig').rotation.y - draggedYaw).toBeGreaterThan(
    0.016 * 0.025,
  )
})

it('cancels capture and momentum on cancel visibility and unmount', async () => {
  const browser = installControlledBrowser({ finePointer: true })
  const rendered = render(<OrbitalAvatar />)
  await waitFor(() => expect(browser.pendingFrames).toHaveLength(1))
  const wrapper = rendered.container.firstElementChild as HTMLDivElement
  wrapper.setPointerCapture = vi.fn()
  wrapper.releasePointerCapture = vi.fn()
  wrapper.hasPointerCapture = vi.fn(() => true)

  act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
    clientX: 100, clientY: 100, pointerId: 10, pointerType: 'mouse',
  })))
  act(() => wrapper.dispatchEvent(createPointerEvent('pointercancel', {
    clientX: 100, clientY: 100, pointerId: 10, pointerType: 'mouse',
  })))
  expect(wrapper.releasePointerCapture).toHaveBeenCalledWith(10)

  act(() => wrapper.dispatchEvent(createPointerEvent('pointerdown', {
    clientX: 100, clientY: 100, pointerId: 11, pointerType: 'mouse',
  })))
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(wrapper.releasePointerCapture).toHaveBeenCalledWith(11)

  rendered.unmount()
  expect(wrapper.style.pointerEvents).toBe('none')
})
```

Also assert a reduced-motion scene leaves `wrapper.style.pointerEvents === 'none'`, and a successful normal-motion scene sets `touchAction: 'pan-y'`.

- [ ] **Step 2: Run the component test to verify RED**

Run:

```powershell
npm test -- --run src/components/OrbitalAvatar.test.tsx
```

Expected: FAIL because the wrapper is non-interactive and has no capture/touch lifecycle.

- [ ] **Step 3: Replace global pointer tracking with one guarded surface lifecycle**

Import the intent resolver:

```ts
import {
  createOrbitalMotionState,
  getOrbitRigRotation,
  resolveOrbitalDragIntent,
  stepOrbitalMotion,
  type OrbitalDragIntent,
  type OrbitalMotionState,
} from './orbitalAvatarMotion'
```

Because this task removes the window listener used temporarily in Task 5, update that task's avatar-lag test to keep the same assertion while dispatching through the final surface lifecycle. After its initial `runNextFrame(1000)`, replace the `window.dispatchEvent(...)` block with:

```ts
act(() => wrapper.dispatchEvent(createPointerEvent('pointermove', {
  clientX: 700,
  clientY: 400,
  pointerId: 99,
  pointerType: 'mouse',
})))
```

Add this local state beside the existing motion variables:

```ts
interface ActiveDrag {
  readonly pointerId: number
  readonly pointerType: string
  readonly startX: number
  readonly startY: number
  lastX: number
  lastY: number
  intent: OrbitalDragIntent
}

let activeDrag: ActiveDrag | null = null
let releaseAfterFrame = false
let interactionListenersAttached = false
let syncInteractionListeners = () => undefined

const canInteract = () =>
  sceneReady &&
  !disposed &&
  !prefersReducedMotion &&
  intersectsViewport &&
  !document.hidden

const releaseCapture = (pointerId: number) => {
  try {
    if (container.hasPointerCapture?.(pointerId)) {
      container.releasePointerCapture(pointerId)
    }
  } catch {
    // Capture may already have been released by the browser.
  }
}

const finishDrag = (preserveMomentum: boolean) => {
  const pointerId = activeDrag?.pointerId
  activeDrag = null

  if (preserveMomentum) {
    const hasPendingDrag = dragDeltaX !== 0 || dragDeltaY !== 0
    releaseAfterFrame = hasPendingDrag
    dragging = hasPendingDrag
  } else {
    releaseAfterFrame = false
    dragging = false
    dragDeltaX = 0
    dragDeltaY = 0
    cancelMomentum = true
  }

  if (interactionListenersAttached) {
    container.style.cursor = finePointerQuery.matches ? 'grab' : 'default'
  }
  if (pointerId !== undefined) releaseCapture(pointerId)
}
```

Patch the Task 5 `renderFrame` immediately after its input has been consumed. This keeps a fast move-and-release gesture in the dragging state for exactly one frame, allowing that frame to derive velocity before momentum takes over:

```ts
dragDeltaX = 0
dragDeltaY = 0
cancelMomentum = false
if (releaseAfterFrame) {
  releaseAfterFrame = false
  dragging = false
}
const animationSeconds = motionState.elapsedSeconds
```

Replace the old global `handlePointerMove` with these surface handlers:

```ts
const handlePointerDown = (event: PointerEvent) => {
  if (!canInteract() || event.isPrimary === false || activeDrag) return
  const coarse = coarsePointerQuery.matches || event.pointerType === 'touch'
  cancelMomentum = false
  releaseAfterFrame = false
  activeDrag = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    intent: coarse ? 'pending' : 'scene',
  }
  dragging = !coarse
  container.setPointerCapture?.(event.pointerId)
  if (finePointerQuery.matches && event.pointerType !== 'touch') {
    container.style.cursor = 'grabbing'
  }
}

const handlePointerMove = (event: PointerEvent) => {
  if (!canInteract()) return
  const bounds = container.getBoundingClientRect()
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)

  if (activeDrag?.pointerId === event.pointerId) {
    const totalX = event.clientX - activeDrag.startX
    const totalY = event.clientY - activeDrag.startY
    activeDrag.intent = resolveOrbitalDragIntent({
      coarsePointer:
        coarsePointerQuery.matches || activeDrag.pointerType === 'touch',
      deltaX: totalX,
      deltaY: totalY,
    })
    if (activeDrag.intent === 'scroll') {
      finishDrag(false)
      return
    }
    if (activeDrag.intent === 'scene') {
      dragDeltaX += (event.clientX - activeDrag.lastX) / width
      dragDeltaY += (event.clientY - activeDrag.lastY) / height
      activeDrag.lastX = event.clientX
      activeDrag.lastY = event.clientY
      dragging = true
      event.preventDefault()
    }
    return
  }

  if (
    activeProfile.allowPointerParallax &&
    finePointerQuery.matches &&
    !coarsePointerQuery.matches &&
    event.pointerType !== 'touch'
  ) {
    pointer.x = Math.max(-1, Math.min(1,
      ((event.clientX - bounds.left) / width - 0.5) * 2,
    ))
    pointer.y = Math.max(-1, Math.min(1,
      ((event.clientY - bounds.top) / height - 0.5) * 2,
    ))
  }
}

const handlePointerUp = (event: PointerEvent) => {
  if (activeDrag?.pointerId !== event.pointerId) return
  finishDrag(activeDrag.intent === 'scene')
}

const handlePointerCancel = (event: PointerEvent) => {
  if (activeDrag?.pointerId === event.pointerId) finishDrag(false)
}

const handleLostPointerCapture = (event: PointerEvent) => {
  if (activeDrag?.pointerId === event.pointerId) finishDrag(false)
}

const handlePointerLeave = () => {
  if (activeDrag) return
  pointer.x = 0
  pointer.y = 0
}
```

Define one attach/remove pair and sync function:

```ts
const interactionHandlers: ReadonlyArray<
  readonly [keyof HTMLElementEventMap, EventListener]
> = [
  ['pointerdown', handlePointerDown as EventListener],
  ['pointermove', handlePointerMove as EventListener],
  ['pointerup', handlePointerUp as EventListener],
  ['pointercancel', handlePointerCancel as EventListener],
  ['lostpointercapture', handleLostPointerCapture as EventListener],
  ['pointerleave', handlePointerLeave as EventListener],
]

syncInteractionListeners = () => {
  const shouldListen = canInteract()
  if (shouldListen && !interactionListenersAttached) {
    interactionHandlers.forEach(([type, handler]) =>
      container.addEventListener(type, handler),
    )
    interactionListenersAttached = true
    container.style.pointerEvents = 'auto'
    container.style.touchAction = 'pan-y'
    container.style.cursor = finePointerQuery.matches ? 'grab' : 'default'
  } else if (!shouldListen && interactionListenersAttached) {
    interactionHandlers.forEach(([type, handler]) =>
      container.removeEventListener(type, handler),
    )
    interactionListenersAttached = false
    finishDrag(false)
    pointer.x = 0
    pointer.y = 0
    container.style.pointerEvents = 'none'
    container.style.cursor = ''
  }
}
```

Call `syncInteractionListeners()` only after the first successful scene frame. Replace all `syncPointerListener()` calls in resize, visibility, intersection, reduced-motion, fine-pointer, and coarse-pointer handlers. Before capability/profile changes, call `finishDrag(false)` when a drag is active. Add final cleanup:

```ts
removeListeners.push(() => {
  if (interactionListenersAttached) {
    interactionHandlers.forEach(([type, handler]) =>
      container.removeEventListener(type, handler),
    )
    interactionListenersAttached = false
  }
  finishDrag(false)
  container.style.pointerEvents = 'none'
  container.style.touchAction = ''
  container.style.cursor = ''
})
```

Remove the old `window.addEventListener('pointermove', ...)` branch and preserve the wrapper's `pointer-events-none` class as the pre-readiness/failure default.

- [ ] **Step 4: Run interaction, motion, fallback, and lifecycle tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/OrbitalAvatar.test.tsx src/components/orbitalAvatarMotion.test.ts src/sections/HeroSection.test.tsx
```

Expected: PASS for mouse drag, release inertia, horizontal touch intent, vertical scroll escape, reduced motion, hidden/offscreen reset, failure fallback, and exhaustive cleanup.

- [ ] **Step 5: Commit interaction lifecycle**

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "feat: add orbital drag interactions"
```

---

### Task 7: Add semantic Orbital Echo decoration to Services

**Files:**
- Modify: `src/sections/ServicesSection.tsx:1-148`
- Modify: `src/sections/ServicesSection.test.tsx:30-124`

- [ ] **Step 1: Write failing decoration and accessibility tests**

Keep the existing service content/order assertions and add:

```ts
it('adds one inaccessible orbital decoration to every service card', () => {
  render(<ServicesSection />)
  const articles = screen.getAllByRole('article')
  const decorations = articles.map((article) =>
    article.querySelector<HTMLElement>('[data-service-orbit]'),
  )

  expect(decorations).toHaveLength(6)
  expect(decorations.every(Boolean)).toBe(true)
  expect(decorations.map((decoration) => decoration?.dataset.orbitVariant)).toEqual([
    'featured',
    'sweep',
    'halo',
    'cross',
    'rise',
    'echo',
  ])
  expect(decorations.map((decoration) => decoration?.dataset.orbitAccent)).toEqual([
    'purple',
    'blue',
    'purple',
    'purple',
    'green',
    'purple',
  ])
  decorations.forEach((decoration, index) => {
    expect(decoration).toHaveAttribute('aria-hidden', 'true')
    expect(decoration).not.toHaveAttribute('role')
    expect(decoration).not.toHaveAttribute('tabindex')
    expect(decoration?.querySelectorAll('.service-orbit__node')).toHaveLength(1)
    expect(decoration?.querySelectorAll('.service-orbit__track')).toHaveLength(
      index === 0 ? 2 : 1,
    )
  })
})

it('keeps service content above decoration without adding fake controls', () => {
  render(<ServicesSection />)

  screen.getAllByRole('article').forEach((article) => {
    expect(article.querySelector('.service-card__content')).not.toBeNull()
    expect(article).not.toHaveAttribute('tabindex')
    expect(article).not.toHaveAttribute('role', 'button')
  })
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})
```

- [ ] **Step 2: Run Services tests to verify RED**

Run:

```powershell
npm test -- --run src/sections/ServicesSection.test.tsx
```

Expected: FAIL because no service orbit decoration exists.

- [ ] **Step 3: Add typed decoration metadata and markup**

Import `CSSProperties`, define the decoration types, and add the exact metadata:

```ts
import { type CSSProperties } from 'react'

type OrbitVariant = 'featured' | 'sweep' | 'halo' | 'cross' | 'rise' | 'echo'
type OrbitAccent = 'purple' | 'blue' | 'green'

interface ServiceDecoration {
  readonly variant: OrbitVariant
  readonly accent: OrbitAccent
  readonly node: readonly [`${number}%`, `${number}%`]
  readonly delay: `${number}s`
}

const serviceDecorations: readonly ServiceDecoration[] = Object.freeze([
  { variant: 'featured', accent: 'purple', node: ['78%', '24%'], delay: '-1.2s' },
  { variant: 'sweep', accent: 'blue', node: ['76%', '32%'], delay: '-2.8s' },
  { variant: 'halo', accent: 'purple', node: ['70%', '76%'], delay: '-4.1s' },
  { variant: 'cross', accent: 'purple', node: ['26%', '72%'], delay: '-1.9s' },
  { variant: 'rise', accent: 'green', node: ['78%', '68%'], delay: '-3.3s' },
  { variant: 'echo', accent: 'purple', node: ['30%', '25%'], delay: '-4.7s' },
])
```

Inside the existing `services.map`, define `const decoration = serviceDecorations[i]` by changing the callback body to braces. Render this as the first child of `SpotlightCard`:

```tsx
<div
  aria-hidden="true"
  className="service-orbit"
  data-service-orbit
  data-orbit-variant={decoration.variant}
  data-orbit-accent={decoration.accent}
  style={{
    '--service-node-x': decoration.node[0],
    '--service-node-y': decoration.node[1],
    '--service-node-delay': decoration.delay,
  } as CSSProperties}
>
  <span className="service-orbit__track service-orbit__track--primary" />
  {decoration.variant === 'featured' && (
    <span className="service-orbit__track service-orbit__track--secondary" />
  )}
  <span className="service-orbit__node">
    <span />
  </span>
</div>
```

Change the existing content wrapper to:

```tsx
<div className="service-card__content flex h-full flex-col">
```

Do not add new props to `SpotlightCard`, and do not change service names, descriptions, tags, indexes, icon semantics, order, or `cardSpans`.

- [ ] **Step 4: Run Services and FadeIn tests to verify GREEN**

Run:

```powershell
npm test -- --run src/sections/ServicesSection.test.tsx src/components/FadeIn.test.tsx
```

Expected: PASS with six semantic articles, the original content, and six inaccessible decoration layers.

- [ ] **Step 5: Commit Services markup**

```powershell
git add src/sections/ServicesSection.tsx src/sections/ServicesSection.test.tsx
git commit -m "feat: add orbital echo service markup"
```

---

### Task 8: Add RAF-batched spotlight tilt and one reset path

**Files:**
- Modify: `src/components/SpotlightCard.tsx:1-59`
- Modify: `src/components/SpotlightCard.test.tsx:1-196`

- [ ] **Step 1: Replace direct-coordinate tests with failing batching and reset tests**

Add a controlled RAF helper to the test file:

```ts
function installControlledFrames() {
  let frameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
  return frames
}

function runOnlyFrame(frames: Map<number, FrameRequestCallback>, time = 16) {
  expect(frames.size).toBe(1)
  const [id, callback] = [...frames.entries()][0]
  frames.delete(id)
  act(() => callback(time))
}
```

Replace old synchronous coordinate expectations with:

Extend the existing `installMatchMedia` test helper with a `narrowViewport` option keyed by `NARROW_VIEWPORT_QUERY = '(max-width: 639px)'`, using the same controllable `setMatches` mechanism as the fine-pointer and reduced-motion queries.

```ts
it('batches pointer moves into one frame and uses the latest point', () => {
  installMatchMedia({ finePointer: true })
  const frames = installControlledFrames()
  render(<SpotlightCard>Content</SpotlightCard>)
  const card = screen.getByRole('article')
  const rect = mockRect(card)

  fireEvent.pointerMove(card, { clientX: 30, clientY: 40, pointerType: 'mouse' })
  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  expect(frames.size).toBe(1)
  expect(rect).not.toHaveBeenCalled()

  runOnlyFrame(frames)

  expect(rect).toHaveBeenCalledTimes(1)
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('60%')
  expect(card.style.getPropertyValue('--spotlight-y')).toBe('80%')
  expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('-1.8deg')
  expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('0.6deg')
  expect(card).toHaveAttribute('data-spotlight-active', 'true')
})

it('caps corner tilt at three degrees and lift at four pixels', () => {
  installMatchMedia({ finePointer: true })
  const frames = installControlledFrames()
  render(<SpotlightCard>Content</SpotlightCard>)
  const card = screen.getByRole('article')
  mockRect(card)

  fireEvent.pointerMove(card, { clientX: 120, clientY: 30, pointerType: 'mouse' })
  runOnlyFrame(frames)

  expect(card.style.getPropertyValue('--spotlight-x')).toBe('100%')
  expect(card.style.getPropertyValue('--spotlight-y')).toBe('0%')
  expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('3deg')
  expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('3deg')
  expect(card.style.getPropertyValue('--spotlight-lift')).toBe('-4px')
})

it('cancels a pending frame and resets every value on leave', () => {
  installMatchMedia({ finePointer: true })
  const frames = installControlledFrames()
  render(<SpotlightCard>Content</SpotlightCard>)
  const card = screen.getByRole('article')
  mockRect(card)

  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  fireEvent.pointerLeave(card)

  expect(frames.size).toBe(0)
  expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('50%')
  expect(card.style.getPropertyValue('--spotlight-y')).toBe('50%')
  expect(card.style.getPropertyValue('--spotlight-tilt-x')).toBe('0deg')
  expect(card.style.getPropertyValue('--spotlight-tilt-y')).toBe('0deg')
  expect(card.style.getPropertyValue('--spotlight-lift')).toBe('0px')
  expect(card).not.toHaveAttribute('data-spotlight-active')
})

it('keeps a narrow fine-pointer viewport static and resets on entry', () => {
  const queries = installMatchMedia({ finePointer: true, narrowViewport: true })
  const frames = installControlledFrames()
  render(<SpotlightCard>Content</SpotlightCard>)
  const card = screen.getByRole('article')
  const rect = mockRect(card)

  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  expect(frames.size).toBe(0)
  expect(rect).not.toHaveBeenCalled()

  act(() => queries.get(NARROW_VIEWPORT_QUERY)?.setMatches(false))
  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  expect(frames.size).toBe(1)

  act(() => queries.get(NARROW_VIEWPORT_QUERY)?.setMatches(true))
  expect(frames.size).toBe(0)
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('50%')
})

it('resets and cancels work when capability changes or component unmounts', () => {
  const queries = installMatchMedia({ finePointer: true })
  const frames = installControlledFrames()
  const rendered = render(<SpotlightCard>Content</SpotlightCard>)
  const card = screen.getByRole('article')
  mockRect(card)

  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  act(() => queries.get(REDUCED_MOTION_QUERY)?.setMatches(true))
  expect(frames.size).toBe(0)
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('50%')

  act(() => queries.get(REDUCED_MOTION_QUERY)?.setMatches(false))
  fireEvent.pointerMove(card, { clientX: 80, clientY: 110, pointerType: 'mouse' })
  rendered.unmount()
  expect(frames.size).toBe(0)
})
```

Retain and adapt the existing reduced-motion, coarse-pointer, touch-pointer, modern-listener, legacy-listener, and semantic article tests. They should expect neutral variables and no RAF/layout read instead of empty values. Update listener cleanup expectations from two media queries to all three original callbacks.

- [ ] **Step 2: Run SpotlightCard tests to verify RED**

Run:

```powershell
npm test -- --run src/components/SpotlightCard.test.tsx
```

Expected: FAIL because updates are synchronous pixels, tilt variables do not exist, and leave/capability reset is absent.

- [ ] **Step 3: Replace `SpotlightCard` with the ref-based batched implementation**

Use this complete component:

```tsx
import { type ReactNode, useCallback, useEffect, useRef } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const NARROW_VIEWPORT_QUERY = '(max-width: 639px)'
const NEUTRAL_VALUES = Object.freeze({
  '--spotlight-x': '50%',
  '--spotlight-y': '50%',
  '--spotlight-tilt-x': '0deg',
  '--spotlight-tilt-y': '0deg',
  '--spotlight-lift': '0px',
})

function observeMediaChange(mediaQuery: MediaQueryList, callback: () => void) {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', callback)
    return () => mediaQuery.removeEventListener('change', callback)
  }
  mediaQuery.addListener(callback)
  return () => mediaQuery.removeListener(callback)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function format(value: number) {
  return Number(value.toFixed(3))
}

function writeNeutralValues(card: HTMLElement) {
  Object.entries(NEUTRAL_VALUES).forEach(([property, value]) =>
    card.style.setProperty(property, value),
  )
  card.removeAttribute('data-spotlight-active')
}

interface SpotlightCardProps {
  children: ReactNode
  className?: string
}

export default function SpotlightCard({ children, className }: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const canTrackRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const resetCardMotion = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    latestPointerRef.current = null
    if (cardRef.current) writeNeutralValues(cardRef.current)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
    const finePointer = window.matchMedia(FINE_POINTER_QUERY)
    const narrowViewport = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const updateTracking = () => {
      canTrackRef.current =
        !reducedMotion.matches &&
        finePointer.matches &&
        !narrowViewport.matches
      if (!canTrackRef.current) resetCardMotion()
    }

    updateTracking()
    const removeReduced = observeMediaChange(reducedMotion, updateTracking)
    const removeFine = observeMediaChange(finePointer, updateTracking)
    const removeNarrow = observeMediaChange(narrowViewport, updateTracking)
    return () => {
      resetCardMotion()
      removeReduced()
      removeFine()
      removeNarrow()
    }
  }, [resetCardMotion])

  const schedulePointerFrame = (clientX: number, clientY: number) => {
    latestPointerRef.current = { clientX, clientY }
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const card = cardRef.current
      const pointer = latestPointerRef.current
      if (!card || !pointer || !canTrackRef.current) return
      const rect = card.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        resetCardMotion()
        return
      }
      const x = clamp((pointer.clientX - rect.left) / rect.width, 0, 1)
      const y = clamp((pointer.clientY - rect.top) / rect.height, 0, 1)
      const tiltX = format((0.5 - y) * 6)
      const tiltY = format((x - 0.5) * 6)
      const distance = clamp(Math.hypot(x - 0.5, y - 0.5) * Math.SQRT2, 0, 1)

      card.style.setProperty('--spotlight-x', `${format(x * 100)}%`)
      card.style.setProperty('--spotlight-y', `${format(y * 100)}%`)
      card.style.setProperty('--spotlight-tilt-x', `${tiltX}deg`)
      card.style.setProperty('--spotlight-tilt-y', `${tiltY}deg`)
      card.style.setProperty('--spotlight-lift', `${format(-4 * distance)}px`)
      card.setAttribute('data-spotlight-active', 'true')
    })
  }

  return (
    <article
      ref={cardRef}
      className={['spotlight-card', className].filter(Boolean).join(' ')}
      onPointerMove={(event) => {
        if (!canTrackRef.current || event.pointerType === 'touch') return
        schedulePointerFrame(event.clientX, event.clientY)
      }}
      onPointerLeave={resetCardMotion}
      onPointerCancel={resetCardMotion}
    >
      {children}
    </article>
  )
}
```

- [ ] **Step 4: Run SpotlightCard and Services tests to verify GREEN**

Run:

```powershell
npm test -- --run src/components/SpotlightCard.test.tsx src/sections/ServicesSection.test.tsx
```

Expected: PASS with one RAF per active non-mobile card frame, bounded variables, complete three-query reset/cleanup, and unchanged semantics.

- [ ] **Step 5: Commit card motion behavior**

```powershell
git add src/components/SpotlightCard.tsx src/components/SpotlightCard.test.tsx
git commit -m "feat: add restrained service card tilt"
```

---

### Task 9: Style Orbital Echo lighting, orbit variants, and motion fallbacks

**Files:**
- Modify: `src/index.css:99-179`
- Modify: `src/index.test.ts:1-99`

- [ ] **Step 1: Write failing CSS invariant tests**

Add a recursive CSS rule helper and visual contracts that avoid exact serialized gradient strings:

```ts
function collectStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule]
    if ('cssRules' in rule) return collectStyleRules((rule as CSSGroupingRule).cssRules)
    return []
  })
}

function allStyleRules(): CSSStyleRule[] {
  return Array.from(document.styleSheets).flatMap((sheet) =>
    collectStyleRules(sheet.cssRules),
  )
}

it('composes service card tilt from bounded custom properties', () => {
  const cardRule = allStyleRules().find((rule) => rule.selectorText === '.spotlight-card')
  const pseudoElementBaseRule = allStyleRules().find((rule) =>
    rule.selectorText.includes('.spotlight-card::before') &&
    rule.selectorText.includes('.spotlight-card::after'),
  )
  const beforeRule = allStyleRules().find((rule) => rule.selectorText === '.spotlight-card::before')
  const afterRule = allStyleRules().find((rule) => rule.selectorText === '.spotlight-card::after')

  expect(styleValue(cardRule, 'transform')).toContain('var(--spotlight-lift)')
  expect(styleValue(cardRule, 'transform')).toContain('var(--spotlight-tilt-x)')
  expect(styleValue(cardRule, 'transform')).toContain('var(--spotlight-tilt-y)')
  expect(styleValue(beforeRule, 'background')).toContain('radial-gradient')
  expect(styleValue(afterRule, 'background')).toContain('radial-gradient')
  expect(styleValue(pseudoElementBaseRule, 'pointer-events')).toBe('none')
})

it('keeps service orbit layers decorative and behind content', () => {
  const orbitRule = allStyleRules().find((rule) => rule.selectorText === '.service-orbit')
  const trackRule = allStyleRules().find((rule) => rule.selectorText === '.service-orbit__track')
  const nodeRule = allStyleRules().find((rule) => rule.selectorText === '.service-orbit__node')
  const contentRule = allStyleRules().find((rule) => rule.selectorText === '.service-card__content')

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
  const nestedRules = reducedRule ? collectStyleRules(reducedRule.cssRules) : []
  const cardRule = nestedRules.find((rule) => rule.selectorText === '.spotlight-card')
  const nodeRule = nestedRules.find((rule) => rule.selectorText === '.service-orbit__node > span')

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
        rule.conditionText.includes('(prefers-reduced-motion: no-preference)'),
    )
  const nestedRules = motionRule ? collectStyleRules(motionRule.cssRules) : []
  const cardRule = nestedRules.find((rule) => rule.selectorText === '.spotlight-card')
  const nodeRule = nestedRules.find((rule) => rule.selectorText === '.service-orbit__node > span')

  expect(styleValue(cardRule, 'transition')).toContain('transform')
  expect(styleValue(nodeRule, 'animation')).toContain('service-orbit-node-drift')
})
```

- [ ] **Step 2: Run global CSS tests to verify RED**

Run:

```powershell
npm test -- --run src/index.test.ts
```

Expected: FAIL because second lighting, tilt variables, service orbit rules, and motion fallbacks do not exist.

- [ ] **Step 3: Replace the Spotlight block and add Orbital Echo CSS**

Use these base rules:

```css
.spotlight-card {
  --spotlight-x: 50%;
  --spotlight-y: 50%;
  --spotlight-tilt-x: 0deg;
  --spotlight-tilt-y: 0deg;
  --spotlight-lift: 0px;
  background: rgba(126, 74, 173, 0.12);
  border: 1px solid rgba(216, 180, 254, 0.16);
  isolation: isolate;
  overflow: hidden;
  position: relative;
  transform: perspective(900px) translate3d(0, var(--spotlight-lift), 0)
    rotateX(var(--spotlight-tilt-x)) rotateY(var(--spotlight-tilt-y));
  transform-style: preserve-3d;
}

.spotlight-card::before,
.spotlight-card::after {
  content: '';
  pointer-events: none;
  position: absolute;
  z-index: 0;
}

.spotlight-card::before {
  background: radial-gradient(
    320px circle at var(--spotlight-x) var(--spotlight-y),
    rgba(192, 132, 252, 0.25),
    rgba(168, 85, 247, 0.1) 38%,
    transparent 72%
  );
  inset: -1px;
  opacity: 0.64;
}

.spotlight-card::after {
  background: radial-gradient(
    110px circle at var(--spotlight-x) var(--spotlight-y),
    rgba(255, 255, 255, 0.42),
    rgba(216, 180, 254, 0.12) 44%,
    transparent 72%
  );
  inset: 0;
  opacity: 0;
}

.spotlight-card[data-spotlight-active='true']::after {
  opacity: 1;
}

.service-card__content {
  position: relative;
  z-index: 2;
}

.service-orbit {
  --service-orbit-color: rgba(168, 85, 247, 0.42);
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

.service-orbit[data-orbit-accent='blue'] {
  --service-orbit-color: rgba(56, 189, 248, 0.46);
}

.service-orbit[data-orbit-accent='green'] {
  --service-orbit-color: rgba(34, 197, 94, 0.42);
}

.service-orbit__track {
  border: 1px solid var(--service-orbit-color);
  border-radius: 50%;
  opacity: 0.38;
  position: absolute;
}

.service-orbit__node {
  height: 9px;
  left: var(--service-node-x);
  position: absolute;
  top: var(--service-node-y);
  width: 9px;
}

.service-orbit__node > span {
  background: var(--service-orbit-color);
  border-radius: 50%;
  box-shadow: 0 0 18px var(--service-orbit-color);
  display: block;
  height: 100%;
  width: 100%;
}

.service-orbit[data-orbit-variant='featured'] .service-orbit__track--primary {
  height: 30%;
  right: -7%;
  top: 24%;
  transform: rotate(-16deg);
  width: 62%;
}

.service-orbit[data-orbit-variant='featured'] .service-orbit__track--secondary {
  height: 23%;
  right: 4%;
  top: 39%;
  transform: rotate(29deg);
  width: 47%;
}

.service-orbit[data-orbit-variant='sweep'] .service-orbit__track,
.service-orbit[data-orbit-variant='echo'] .service-orbit__track {
  height: 24%;
  right: -14%;
  top: 29%;
  transform: rotate(-18deg);
  width: 62%;
}

.service-orbit[data-orbit-variant='halo'] .service-orbit__track {
  height: 48%;
  right: -18%;
  top: 18%;
  transform: rotate(18deg);
  width: 54%;
}

.service-orbit[data-orbit-variant='cross'] .service-orbit__track {
  height: 28%;
  left: -15%;
  top: 38%;
  transform: rotate(38deg);
  width: 65%;
}

.service-orbit[data-orbit-variant='rise'] .service-orbit__track {
  height: 58%;
  right: -11%;
  top: -10%;
  transform: rotate(62deg);
  width: 42%;
}
```

Add the motion rules without creating another continuous JavaScript loop:

```css
@keyframes service-orbit-node-drift {
  0%, 100% { transform: translate3d(-2px, 1px, 0) scale(0.92); }
  50% { transform: translate3d(3px, -3px, 0) scale(1.08); }
}

@media (min-width: 640px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .spotlight-card {
    transition: border-color 460ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 460ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 460ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .spotlight-card[data-spotlight-active='true'] {
    border-color: rgba(126, 34, 206, 0.34);
    box-shadow: 0 20px 48px rgba(44, 24, 86, 0.16);
    transition-duration: 90ms;
    will-change: transform;
  }

  .spotlight-card::before,
  .spotlight-card::after {
    transition: opacity 180ms ease;
  }

  .service-orbit__node > span {
    animation: service-orbit-node-drift 7s ease-in-out infinite;
    animation-delay: var(--service-node-delay);
  }
}

@media (pointer: coarse) {
  .spotlight-card {
    transform: none;
  }

  .service-orbit__node > span {
    animation: none;
  }
}
```

Extend the existing reduced-motion media block with:

```css
.spotlight-card {
  transform: none;
  transition: none;
}

.spotlight-card::before,
.spotlight-card::after {
  transition: none;
}

.service-orbit__node > span {
  animation: none;
}
```

Keep `.spotlight-card--light` as the white/lilac visual break. Remove obsolete hover-only `translateY(-3px)` rules so they cannot override the composed custom-property transform.

- [ ] **Step 4: Run CSS, Services, and Spotlight tests to verify GREEN**

Run:

```powershell
npm test -- --run src/index.test.ts src/sections/ServicesSection.test.tsx src/components/SpotlightCard.test.tsx src/components/FadeIn.test.tsx
```

Expected: PASS with dual edge-free lighting, visible decorative orbit layers, bounded composed tilt, and static coarse/reduced fallbacks.

- [ ] **Step 5: Commit Orbital Echo styles**

```powershell
git add src/index.css src/index.test.ts
git commit -m "feat: style orbital echo services"
```

---

### Task 10: Run cross-cutting verification and responsive interaction QA

**Files:**
- Verify: all files listed in the File Responsibility Map
- Modify only if verification exposes a defect, with a new failing test before each fix

- [ ] **Step 1: Run focused hero verification**

```powershell
npm test -- --run src/components/orbitalAvatarGeometry.test.ts src/components/orbitalAvatarMotion.test.ts src/components/OrbitalAvatar.test.tsx src/components/orbitalGlow.test.ts src/sections/HeroSection.test.tsx
```

Expected: PASS with 11/9/6 profiles, deterministic motion, one RAF, fallback safety, pause/resume safety, and exact cleanup.

- [ ] **Step 2: Run focused Services verification**

```powershell
npm test -- --run src/sections/ServicesSection.test.tsx src/components/SpotlightCard.test.tsx src/components/FadeIn.test.tsx src/index.test.ts
```

Expected: PASS with six semantic cards, inaccessible decoration, batched tilt, reset, and motion fallbacks.

- [ ] **Step 3: Run the full test suite and production build**

```powershell
npm test -- --run
npm run build
```

Expected: 0 failed tests and a successful `tsc && vite build`. Record the existing Three.js async chunk-size warning separately; do not treat it as a new failure unless its size materially increases from the baseline 734.52 kB minified / 189.60 kB gzip.

- [ ] **Step 4: Audit diff scope and whitespace**

```powershell
git diff --check dedcc2f...HEAD
git diff --name-only dedcc2f...HEAD
git status --short
```

Expected: no whitespace errors; only the approved spec status, this plan, hero physics/geometry/component/tests, Services/Spotlight/tests, and `src/index.css`/`src/index.test.ts` appear. No package or lockfile change is allowed.

- [ ] **Step 5: Start a local preview from this worktree**

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4175
```

Expected: preview responds at `http://127.0.0.1:4175/`. Run the long-lived preview in a hidden background process when using the desktop environment.

- [ ] **Step 6: Verify desktop at 1440 × 900**

Use the in-app browser and confirm all of the following:

- Eleven distinct paths are visible without forming a bright wire ball.
- The avatar remains readable and the glow has no hard circle or angled disc.
- Passive pointer motion eases smoothly.
- Mouse drag rotates the central scene, release momentum continues briefly, and the spring settles without flipping.
- The heading and navigation remain clickable because their higher layer is not covered.
- Services remains white; card 01 is 4×2; all six cards and all copy are visible.
- Only the active service card tilts, with no hard spotlight ring; leave resets it.

- [ ] **Step 7: Verify tablet at 900 × 900**

Confirm nine orbit paths, reduced scene scale/particle density, two-column Services, no horizontal overflow, no decoration covering copy/tags, and the same bounded drag behavior when a fine pointer is available.

- [ ] **Step 8: Verify mobile at 390 × 844**

Confirm six paths, one canvas, one-column Services, no horizontal overflow, and static card tilt. Exercise a horizontal touch/pen drag and verify the scene responds; then perform a vertical gesture over the interaction area and verify the page scrolls normally. If the browser surface cannot emit touch pointers, rely on the automated touch-intent/capture test for input semantics and still complete the visual/mobile scroll checks.

- [ ] **Step 9: Verify reduced motion and failure fallback**

With reduced-motion emulation enabled, confirm the hero and service node are static, no drag/parallax response occurs, and content remains visible. Force or mock the existing texture/WebGL failure path in the focused test suite and confirm the accessible static avatar remains available and the interaction surface stays non-blocking.

- [ ] **Step 10: Request final spec and code-quality review**

Dispatch a fresh reviewer for `dedcc2f...HEAD`, fix every Critical or Important finding with a failing regression test, rerun the relevant focused suite, then repeat Steps 1–4.

- [ ] **Step 11: Commit only verification-driven fixes**

If verification required code changes, commit the exact tested files with a narrow message such as:

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "fix: stabilize orbital interaction lifecycle"
```

If no fix was required, do not create an empty verification commit.

- [ ] **Step 12: Finish the development branch**

Invoke `superpowers:finishing-a-development-branch`, present merge/PR/keep/discard options, and do not merge or push without the user's explicit choice.

---
