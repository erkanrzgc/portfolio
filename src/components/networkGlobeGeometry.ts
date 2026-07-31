export interface GlobePoint {
  x: number
  y: number
  z: number
}

export function createSpherePoints(count: number, radius: number): GlobePoint[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / count
    const radialDistance = Math.sqrt(1 - y * y)
    const angle = index * goldenAngle

    return {
      x: Math.cos(angle) * radialDistance * radius,
      y: y * radius,
      z: Math.sin(angle) * radialDistance * radius,
    }
  })
}

export function createConnectionSegments(
  points: GlobePoint[],
  maxDistance: number,
  maxConnections: number,
): Float32Array {
  if (maxConnections <= 0) {
    return new Float32Array()
  }

  const coordinates: number[] = []
  let connectionCount = 0

  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    const first = points[firstIndex]

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex += 1
    ) {
      const second = points[secondIndex]
      const distance = Math.hypot(
        first.x - second.x,
        first.y - second.y,
        first.z - second.z,
      )

      if (distance <= maxDistance) {
        coordinates.push(
          first.x,
          first.y,
          first.z,
          second.x,
          second.y,
          second.z,
        )
        connectionCount += 1

        if (connectionCount >= maxConnections) {
          return new Float32Array(coordinates)
        }
      }
    }
  }

  return new Float32Array(coordinates)
}
