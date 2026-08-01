export const GLOW_TEXTURE_SIZE = 128

export interface GlowLayerDefinition {
  readonly color: number
  readonly opacity: number
  readonly pulseOffset: number
  readonly scale: readonly [number, number]
  readonly z: number
}

export const GLOW_LAYERS: readonly GlowLayerDefinition[] = Object.freeze([
  Object.freeze({
    color: 0xa855f7,
    opacity: 0.2,
    pulseOffset: 0,
    scale: [2.85, 2.38] as const,
    z: -0.42,
  }),
  Object.freeze({
    color: 0x7e22ce,
    opacity: 0.11,
    pulseOffset: Math.PI,
    scale: [3.5, 2.88] as const,
    z: -0.58,
  }),
])

export function createRadialGlowTextureData(
  size = GLOW_TEXTURE_SIZE,
): Uint8Array {
  const dimension = Math.max(2, Math.floor(size))
  const data = new Uint8Array(dimension * dimension * 4)
  const center = (dimension - 1) / 2
  const radius = Math.max(1, center)

  for (let y = 0; y < dimension; y += 1) {
    for (let x = 0; x < dimension; x += 1) {
      const normalizedRadius = Math.hypot(
        (x - center) / radius,
        (y - center) / radius,
      )
      const falloff = normalizedRadius >= 1
        ? 0
        : Math.pow(1 - normalizedRadius, 2.4)
      const offset = (y * dimension + x) * 4
      data[offset] = 255
      data[offset + 1] = 255
      data[offset + 2] = 255
      data[offset + 3] = Math.round(falloff * 255)
    }
  }

  return data
}
