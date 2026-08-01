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

const ROTATION_STIFFNESS = 16
const ROTATION_DAMPING = 7.5
const AVATAR_STIFFNESS = 12
const AVATAR_DAMPING = 7

const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const stepSpring = (
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  deltaSeconds: number,
) => {
  if (deltaSeconds === 0) return [value, velocity] as const

  const acceleration = (target - value) * stiffness - velocity * damping
  const nextVelocity = velocity + acceleration * deltaSeconds
  return [value + nextVelocity * deltaSeconds, nextVelocity] as const
}

export const createOrbitalMotionState = (): OrbitalMotionState => Object.freeze({
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

export const stepOrbitalMotion = (
  state: OrbitalMotionState,
  input: OrbitalMotionInput,
): OrbitalMotionState => {
  const deltaSeconds = clamp(finiteOrZero(input.deltaMs), 0, ORBITAL_MOTION_LIMITS.maxDeltaMs) / 1000
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
    ;[pitch, pitchVelocity] = stepSpring(
      pitch, pitchVelocity, targetPitch, ROTATION_STIFFNESS, ROTATION_DAMPING, deltaSeconds,
    )
    ;[yaw, yawVelocity] = stepSpring(
      yaw, yawVelocity, targetYaw, ROTATION_STIFFNESS, ROTATION_DAMPING, deltaSeconds,
    )
    pitch = clamp(pitch, -ORBITAL_MOTION_LIMITS.maxPitch, ORBITAL_MOTION_LIMITS.maxPitch)
    yaw = clamp(yaw, -ORBITAL_MOTION_LIMITS.maxYaw, ORBITAL_MOTION_LIMITS.maxYaw)
    pitchVelocity = clamp(
      pitchVelocity,
      -ORBITAL_MOTION_LIMITS.maxPitchVelocity,
      ORBITAL_MOTION_LIMITS.maxPitchVelocity,
    )
    yawVelocity = clamp(
      yawVelocity,
      -ORBITAL_MOTION_LIMITS.maxYawVelocity,
      ORBITAL_MOTION_LIMITS.maxYawVelocity,
    )
  }

  const normalizedYaw = clamp(yaw / ORBITAL_MOTION_LIMITS.maxYaw, -1, 1)
  const normalizedPitch = clamp(-pitch / ORBITAL_MOTION_LIMITS.maxPitch, -1, 1)
  const targetAvatarX = normalizedYaw * ORBITAL_MOTION_LIMITS.maxAvatarX
  const targetAvatarY = normalizedPitch * ORBITAL_MOTION_LIMITS.maxAvatarY
  const targetAvatarRoll = -normalizedYaw * ORBITAL_MOTION_LIMITS.maxAvatarRoll
  const avatarXVelocity = input.cancelMomentum ? 0 : state.avatarXVelocity
  const avatarYVelocity = input.cancelMomentum ? 0 : state.avatarYVelocity
  const avatarRollVelocity = input.cancelMomentum ? 0 : state.avatarRollVelocity
  let [avatarX, nextAvatarXVelocity] = stepSpring(
    state.avatarX, avatarXVelocity, targetAvatarX, AVATAR_STIFFNESS, AVATAR_DAMPING, deltaSeconds,
  )
  let [avatarY, nextAvatarYVelocity] = stepSpring(
    state.avatarY, avatarYVelocity, targetAvatarY, AVATAR_STIFFNESS, AVATAR_DAMPING, deltaSeconds,
  )
  let [avatarRoll, nextAvatarRollVelocity] = stepSpring(
    state.avatarRoll, avatarRollVelocity, targetAvatarRoll, AVATAR_STIFFNESS, AVATAR_DAMPING, deltaSeconds,
  )
  const elapsedSeconds = state.elapsedSeconds + deltaSeconds

  avatarX = clamp(avatarX, -ORBITAL_MOTION_LIMITS.maxAvatarX, ORBITAL_MOTION_LIMITS.maxAvatarX)
  avatarY = clamp(avatarY, -ORBITAL_MOTION_LIMITS.maxAvatarY, ORBITAL_MOTION_LIMITS.maxAvatarY)
  avatarRoll = clamp(avatarRoll, -ORBITAL_MOTION_LIMITS.maxAvatarRoll, ORBITAL_MOTION_LIMITS.maxAvatarRoll)

  return Object.freeze({
    elapsedSeconds,
    pitch,
    yaw,
    pitchVelocity,
    yawVelocity,
    avatarX,
    avatarY,
    avatarXVelocity: nextAvatarXVelocity,
    avatarYVelocity: nextAvatarYVelocity,
    avatarRoll,
    avatarRollVelocity: nextAvatarRollVelocity,
    avatarScale: 1 + Math.sin(elapsedSeconds * 0.45) * 0.008,
  })
}
