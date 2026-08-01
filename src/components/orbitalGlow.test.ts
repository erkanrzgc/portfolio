import { describe, expect, it } from 'vitest'
import {
  createRadialGlowTextureData,
  GLOW_LAYERS,
} from './orbitalGlow'

describe('orbital glow model', () => {
  it('creates a symmetric soft radial RGBA texture', () => {
    const size = 5
    const texture = createRadialGlowTextureData(size)
    const alphaAt = (x: number, y: number) => texture[(y * size + x) * 4 + 3]

    expect(texture).toHaveLength(size * size * 4)
    expect(alphaAt(2, 2)).toBe(255)
    expect(alphaAt(0, 0)).toBe(0)
    expect(alphaAt(3, 2)).toBe(48)
    expect(alphaAt(3, 2)).toBeGreaterThan(0)
    expect(alphaAt(3, 2)).toBeLessThan(255)

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        expect(alphaAt(x, y)).toBe(alphaAt(size - 1 - x, y))
        expect(alphaAt(x, y)).toBe(alphaAt(x, size - 1 - y))
      }
    }
  })

  it('defines two low-opacity glow layers with distinct pulses', () => {
    expect(GLOW_LAYERS).toHaveLength(2)
    expect(Object.isFrozen(GLOW_LAYERS[0].scale)).toBe(true)
    expect(Object.isFrozen(GLOW_LAYERS[1].scale)).toBe(true)
    expect(GLOW_LAYERS.every((layer) => layer.opacity < 0.25)).toBe(true)
    expect(GLOW_LAYERS[1].scale[0]).toBeGreaterThan(GLOW_LAYERS[0].scale[0])
    expect(GLOW_LAYERS[1].scale[1]).toBeGreaterThan(GLOW_LAYERS[0].scale[1])
    expect(GLOW_LAYERS[1].pulseOffset).not.toBe(GLOW_LAYERS[0].pulseOffset)
  })

  it.each([
    ['NaN', Number.NaN, 128],
    ['positive infinity', Number.POSITIVE_INFINITY, 128],
    ['negative infinity', Number.NEGATIVE_INFINITY, 128],
    ['negative size', -4, 2],
    ['fractional size', 5.9, 5],
    ['excessive size', 900, 512],
  ])('normalizes %s texture sizes safely', (_, requestedSize, dimension) => {
    expect(createRadialGlowTextureData(requestedSize)).toHaveLength(
      dimension * dimension * 4,
    )
  })
})
