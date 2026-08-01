import { describe, expect, it } from 'vitest'
import {
  ORBITAL_MOTION_LIMITS,
  createOrbitalMotionState,
  stepOrbitalMotion,
} from './orbitalAvatarMotion'

describe('orbital avatar motion', () => {
  it('is deterministic and does not mutate frozen state or input', () => {
    const state = createOrbitalMotionState()
    const input = {
      cancelMomentum: false,
      deltaMs: 16,
      dragDeltaX: 0.1,
      dragDeltaY: -0.05,
      dragging: true,
      pointerX: 0.4,
      pointerY: -0.2,
    }
    const originalInput = { ...input }

    expect(Object.isFrozen(state)).toBe(true)
    expect(stepOrbitalMotion(state, input)).toEqual(stepOrbitalMotion(state, input))
    expect(state).toEqual(createOrbitalMotionState())
    expect(input).toEqual(originalInput)
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
})
