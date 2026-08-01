import { describe, expect, it } from 'vitest'

import './index.css'

describe('global scroll container styles', () => {
  it('positions the document root for target-based scroll measurements', () => {
    const positionedValues = ['relative', 'absolute', 'fixed', 'sticky']

    expect(positionedValues).toContain(
      getComputedStyle(document.documentElement).position
    )
  })
})
