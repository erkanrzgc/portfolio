import { describe, expect, it } from 'vitest'
import { getOrbitDefinitions } from './orbitalAvatarGeometry'
import {
  ORBITAL_MOTION_LIMITS,
  createOrbitalMotionState,
  getOrbitMotionResponse,
  getOrbitRigRotation,
  resolveOrbitalDragIntent,
  stepOrbitalMotion,
} from './orbitalAvatarMotion'

describe('orbital avatar motion', () => {
  it('is deterministic and does not mutate frozen state or input', () => {
    const state = createOrbitalMotionState()
    const input = Object.freeze({
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.1,
      dragDeltaY: -0.05,
      dragging: true,
      pointerX: 0.4,
      pointerY: -0.2,
    })
    const originalInput = { ...input }
    const first = stepOrbitalMotion(state, input)

    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first).toEqual(stepOrbitalMotion(state, input))
    expect(state).toEqual(createOrbitalMotionState())
    expect(input).toEqual(originalInput)
  })

  it('sanitizes invalid motion inputs and preserves pose for a zero-duration neutral frame', () => {
    const state = Object.freeze({
      ...createOrbitalMotionState(),
      elapsedSeconds: 2,
      pitch: 0.1,
      yaw: -0.2,
      pitchVelocity: 0.4,
      yawVelocity: -0.5,
    })
    const neutral = {
      cancelMomentum: false, deltaMs: 0, dragDeltaX: 0, dragDeltaY: 0,
      dragging: false, pointerX: 0, pointerY: 0,
    }
    const expectStationary = (input: typeof neutral) => {
      const { avatarScale: resultScale, ...resultPose } = stepOrbitalMotion(state, input)
      const { avatarScale: stateScale, ...statePose } = state

      expect(resultScale).toBe(1 + Math.sin(state.elapsedSeconds * 0.45) * 0.008)
      expect(stateScale).toBe(1)
      expect(resultPose).toEqual(statePose)
    }

    expectStationary(neutral)
    expectStationary({ ...neutral, deltaMs: -16, pointerX: 1, pointerY: -1 })
    expectStationary({
      ...neutral,
      deltaMs: Number.NaN,
      pointerX: Number.POSITIVE_INFINITY,
      pointerY: Number.NEGATIVE_INFINITY,
      dragDeltaX: Number.NaN,
      dragDeltaY: Number.POSITIVE_INFINITY,
    })
  })

  it('caps extreme drag pose and angular velocity', () => {
    const result = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 50, dragDeltaY: -50,
      dragging: true, pointerX: 50, pointerY: -50,
    })

    expect(Math.abs(result.pitch)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxPitch)
    expect(Math.abs(result.yaw)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxYaw)
    expect(Math.abs(result.pitchVelocity)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxPitchVelocity)
    expect(Math.abs(result.yawVelocity)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxYawVelocity)
  })

  it('carries a released horizontal drag forward while damping it', () => {
    const dragged = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 0.08, dragDeltaY: 0,
      dragging: true, pointerX: 0, pointerY: 0,
    })
    const released = stepOrbitalMotion(dragged, {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 0, dragDeltaY: 0,
      dragging: false, pointerX: 0, pointerY: 0,
    })

    expect(dragged.yawVelocity).toBeGreaterThan(0)
    expect(released.yawVelocity).toBeGreaterThan(0)
    expect(Math.abs(released.yawVelocity)).toBeLessThan(Math.abs(dragged.yawVelocity))
    expect(released.yaw).toBeGreaterThan(dragged.yaw)
  })

  it('monotonically damps yaw velocity over neutral frames before changing direction', () => {
    let state = { ...createOrbitalMotionState(), yawVelocity: 1 }
    const magnitudes: number[] = []

    for (let frame = 0; frame < 8; frame += 1) {
      state = stepOrbitalMotion(state, {
        cancelMomentum: false, deltaMs: 16, dragDeltaX: 0, dragDeltaY: 0,
        dragging: false, pointerX: 0, pointerY: 0,
      })
      magnitudes.push(Math.abs(state.yawVelocity))
    }

    magnitudes.slice(1).forEach((magnitude, index) => {
      expect(magnitude).toBeLessThan(magnitudes[index])
    })
  })

  it('settles a displaced yaw back toward neutral', () => {
    const first = stepOrbitalMotion({ ...createOrbitalMotionState(), yaw: 0.3 }, {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 0, dragDeltaY: 0,
      dragging: false, pointerX: 0, pointerY: 0,
    })
    let state = first

    for (let frame = 0; frame < 120; frame += 1) {
      state = stepOrbitalMotion(state, {
        cancelMomentum: false, deltaMs: 16, dragDeltaX: 0, dragDeltaY: 0,
        dragging: false, pointerX: 0, pointerY: 0,
      })
    }

    expect(Math.abs(first.yaw)).toBeGreaterThan(0)
    expect(Math.abs(first.yaw)).toBeLessThan(0.3)
    expect(Math.abs(state.yaw)).toBeLessThan(0.01)
  })

  it('moves avatar translation more gently than rig yaw on first drag', () => {
    const result = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 0.1, dragDeltaY: 0,
      dragging: true, pointerX: 0, pointerY: 0,
    })

    expect(result.avatarX).not.toBe(0)
    expect(Math.abs(result.avatarX / ORBITAL_MOTION_LIMITS.maxAvatarX)).toBeLessThan(
      Math.abs(result.yaw / ORBITAL_MOTION_LIMITS.maxYaw),
    )
  })

  it('caps large frame durations to the maximum delta', () => {
    const state = createOrbitalMotionState()
    const baseInput = {
      cancelMomentum: false, dragDeltaX: 0, dragDeltaY: 0,
      dragging: false, pointerX: 1, pointerY: 1,
    }

    expect(stepOrbitalMotion(state, { ...baseInput, deltaMs: 10_000 })).toEqual(
      stepOrbitalMotion(state, { ...baseInput, deltaMs: ORBITAL_MOTION_LIMITS.maxDeltaMs }),
    )
  })

  it('keeps avatar motion bounded during sustained drag and pointer movement', () => {
    let state = createOrbitalMotionState()

    for (let frame = 0; frame < 180; frame += 1) {
      state = stepOrbitalMotion(state, {
        cancelMomentum: false, deltaMs: 16,
        dragDeltaX: frame < 20 ? 0.2 : 0,
        dragDeltaY: frame < 20 ? -0.2 : 0,
        dragging: frame < 20, pointerX: 1, pointerY: -1,
      })
      expect(Math.abs(state.avatarX)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarX)
      expect(Math.abs(state.avatarY)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarY)
      expect(Math.abs(state.avatarRoll)).toBeLessThanOrEqual(ORBITAL_MOTION_LIMITS.maxAvatarRoll)
      expect(state.avatarScale).toBeGreaterThanOrEqual(0.992)
      expect(state.avatarScale).toBeLessThanOrEqual(1.008)
    }
  })

  it('cancels angular momentum without moving the current pose', () => {
    const moving = stepOrbitalMotion(createOrbitalMotionState(), {
      cancelMomentum: false, deltaMs: 16, dragDeltaX: 0.1, dragDeltaY: -0.05,
      dragging: true, pointerX: 0, pointerY: 0,
    })
    const cancelled = stepOrbitalMotion(moving, {
      cancelMomentum: true, deltaMs: 0, dragDeltaX: 0, dragDeltaY: 0,
      dragging: false, pointerX: 0, pointerY: 0,
    })

    expect(cancelled.pitch).toBe(moving.pitch)
    expect(cancelled.yaw).toBe(moving.yaw)
    expect(cancelled.pitchVelocity).toBe(0)
    expect(cancelled.yawVelocity).toBe(0)
  })

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
})
