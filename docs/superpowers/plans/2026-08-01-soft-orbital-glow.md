# Soft Orbital Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible purple circle behind the avatar with the approved soft, edge-free purple glow while preserving the orbital depth, particle field, responsive profiles, fallback, and reduced-motion behavior.

**Architecture:** Generate one small deterministic RGBA radial texture in a pure helper and reuse it across two additive Three.js sprites placed behind the avatar. Extend the existing scene profiles with glow scale and intensity so the same actors adapt without allocation on resize. Keep the core and atmosphere meshes only at near-invisible opacity, move the breathing motion to the glow layers, and mirror the result in the CSS fallback without adding post-processing or another dependency.

**Tech Stack:** React 19, TypeScript, Three.js, Vitest, Testing Library, Tailwind/global CSS, Vite

---

## File map

- Create `src/components/orbitalGlow.ts`: deterministic radial texture bytes and immutable glow-layer definitions.
- Create `src/components/orbitalGlow.test.ts`: texture falloff, symmetry, and layer-definition tests.
- Modify `src/components/orbitalAvatarGeometry.ts`: add responsive glow scale and intensity to the existing scene profiles.
- Modify `src/components/orbitalAvatarGeometry.test.ts`: verify glow strength decreases from desktop to tablet to mobile/coarse pointer.
- Modify `src/components/OrbitalAvatar.tsx`: create, profile, animate, and dispose the two shared-texture glow sprites; suppress the visible shell.
- Modify `src/components/OrbitalAvatar.test.tsx`: extend the Three.js mock and cover layering, shell opacity, pulse, reduced motion, profile changes, and cleanup.
- Modify `src/index.css`: make the persistent avatar fallback use the same edge-free diffused glow.
- Modify `src/index.test.ts`: guard against reintroducing a border, hard shadow, or non-blurred fallback disc.

### Task 1: Define the deterministic glow model

**Files:**
- Create: `src/components/orbitalGlow.ts`
- Create: `src/components/orbitalGlow.test.ts`
- Modify: `src/components/orbitalAvatarGeometry.ts`
- Test: `src/components/orbitalAvatarGeometry.test.ts`

- [ ] **Step 1: Write the failing texture and profile tests**

Create `src/components/orbitalGlow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  GLOW_LAYERS,
  createRadialGlowTextureData,
} from './orbitalGlow'

const alphaAt = (data: Uint8Array, size: number, x: number, y: number) =>
  data[(y * size + x) * 4 + 3]

describe('orbital glow', () => {
  it('creates a symmetric radial texture with an opaque center and transparent edge', () => {
    const size = 5
    const data = createRadialGlowTextureData(size)

    expect(data).toHaveLength(size * size * 4)
    expect(alphaAt(data, size, 2, 2)).toBe(255)
    expect(alphaAt(data, size, 0, 0)).toBe(0)
    expect(alphaAt(data, size, 4, 4)).toBe(0)
    expect(alphaAt(data, size, 1, 2)).toBe(alphaAt(data, size, 3, 2))
    expect(alphaAt(data, size, 2, 1)).toBe(alphaAt(data, size, 2, 3))
    expect(alphaAt(data, size, 1, 2)).toBeLessThan(255)
    expect(alphaAt(data, size, 1, 2)).toBeGreaterThan(0)
  })

  it('defines two offset, low-opacity glow layers with no hard-edge geometry', () => {
    expect(GLOW_LAYERS).toHaveLength(2)
    expect(GLOW_LAYERS.every((layer) => layer.opacity < 0.25)).toBe(true)
    expect(GLOW_LAYERS[1].scale[0]).toBeGreaterThan(GLOW_LAYERS[0].scale[0])
    expect(GLOW_LAYERS[1].scale[1]).toBeGreaterThan(GLOW_LAYERS[0].scale[1])
    expect(GLOW_LAYERS[0].pulseOffset).not.toBe(GLOW_LAYERS[1].pulseOffset)
  })
})
```

Extend the existing responsive-profile test in `src/components/orbitalAvatarGeometry.test.ts`:

```ts
expect(desktop).toMatchObject({ glowIntensity: 1, glowScale: 1 })
expect(tablet.glowIntensity).toBeLessThan(desktop.glowIntensity)
expect(mobile.glowIntensity).toBeLessThan(tablet.glowIntensity)
expect(tablet.glowScale).toBeLessThan(desktop.glowScale)
expect(mobile.glowScale).toBeLessThan(tablet.glowScale)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm test -- src/components/orbitalGlow.test.ts src/components/orbitalAvatarGeometry.test.ts
```

Expected: FAIL because `orbitalGlow.ts`, `glowIntensity`, and `glowScale` do not exist.

- [ ] **Step 3: Implement the pure glow helper and responsive values**

Create `src/components/orbitalGlow.ts`:

```ts
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

export function createRadialGlowTextureData(size = GLOW_TEXTURE_SIZE): Uint8Array {
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
```

Add these fields to `OrbitalSceneProfile` in `src/components/orbitalAvatarGeometry.ts`:

```ts
readonly glowIntensity: number
readonly glowScale: number
```

Add the exact values to the existing frozen profiles:

```ts
// Desktop
glowIntensity: 1,
glowScale: 1,

// Tablet
glowIntensity: 0.84,
glowScale: 0.92,

// Mobile/coarse
glowIntensity: 0.7,
glowScale: 0.84,
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
npm test -- src/components/orbitalGlow.test.ts src/components/orbitalAvatarGeometry.test.ts
```

Expected: 2 test files pass; the new texture and profile assertions are green.

- [ ] **Step 5: Commit the pure model**

```powershell
git add src/components/orbitalGlow.ts src/components/orbitalGlow.test.ts src/components/orbitalAvatarGeometry.ts src/components/orbitalAvatarGeometry.test.ts
git commit -m "feat: define soft orbital glow"
```

### Task 2: Render and animate two edge-free Three.js glow layers

**Files:**
- Modify: `src/components/OrbitalAvatar.tsx`
- Test: `src/components/OrbitalAvatar.test.tsx`

- [ ] **Step 1: Extend the Three.js mock and write failing behavior tests**

Extend the hoisted state in `src/components/OrbitalAvatar.test.tsx`:

```ts
dataTextures: [] as Array<{
  data: Uint8Array
  dispose: ReturnType<typeof vi.fn>
  generateMipmaps: boolean
  height: number
  magFilter: unknown
  minFilter: unknown
  needsUpdate: boolean
  width: number
}>,
materials: [] as Array<{
  dispose: ReturnType<typeof vi.fn>
  opacity: number
  options: Record<string, unknown>
}>,
sprites: [] as Array<{
  material: {
    opacity: number
    options: Record<string, unknown>
  }
  position: { set: ReturnType<typeof vi.fn> }
  renderOrder: number
  scale: { set: ReturnType<typeof vi.fn> }
}>,
```

Replace the existing `materials` and `sprites` state declarations with these expanded forms rather than declaring duplicate keys.

Add `opacity` to `DisposableMaterial`, expose `RGBAFormat`, implement `DataTexture`, and retain sprite transform calls:

```ts
class DisposableMaterial {
  dispose = vi.fn()
  opacity: number

  constructor(public options: Record<string, unknown> = {}) {
    this.opacity = Number(options.opacity ?? 1)
    three.materials.push(this)
  }
}

// Add to the mocked Three.js exports.
RGBAFormat: 'rgba',
LinearFilter: 'linear',
DataTexture: class {
  dispose = vi.fn()
  generateMipmaps = true
  magFilter: unknown = null
  minFilter: unknown = null
  needsUpdate = false

  constructor(
    public data: Uint8Array,
    public width: number,
    public height: number,
  ) {
    three.dataTextures.push(this)
  }
},

Sprite: class {
  position = { set: vi.fn() }
  renderOrder = 0
  scale = { set: vi.fn() }

  constructor(public material: {
    opacity: number
    options: Record<string, unknown>
  }) {
    three.sprites.push(this)
  }
},
```

Reset `three.dataTextures.length = 0` in `beforeEach`, then add:

```ts
it('renders two additive radial glows behind the avatar without a visible shell', async () => {
  installControlledBrowser()
  render(<OrbitalAvatar />)

  await waitFor(() => expect(three.sprites).toHaveLength(3))

  const glowSprites = three.sprites.slice(0, 2)
  expect(three.dataTextures).toHaveLength(1)
  expect(three.dataTextures[0].magFilter).toBe('linear')
  expect(three.dataTextures[0].minFilter).toBe('linear')
  expect(three.dataTextures[0].generateMipmaps).toBe(false)
  expect(glowSprites.every((sprite) => sprite.renderOrder === 0)).toBe(true)
  expect(glowSprites.every((sprite) => sprite.material.options.map === three.dataTextures[0])).toBe(true)
  expect(glowSprites.every((sprite) => sprite.material.options.blending === 2)).toBe(true)
  expect(glowSprites.every((sprite) => sprite.material.options.depthWrite === false)).toBe(true)

  const shellMaterials = three.materials.slice(0, 2)
  expect(shellMaterials.every((material) => material.opacity <= 0.005)).toBe(true)
})

it('breathes the glow only during normal motion', async () => {
  const browser = installControlledBrowser()
  render(<OrbitalAvatar />)

  await waitFor(() => expect(three.sprites).toHaveLength(3))
  const glow = three.sprites[0]
  glow.scale.set.mockClear()

  const [frameId, frame] = [...browser.pendingFrames.entries()][0]
  browser.pendingFrames.delete(frameId)
  act(() => frame(2500))

  expect(glow.scale.set).toHaveBeenCalled()
  const [width, height] = glow.scale.set.mock.calls.at(-1) ?? []
  expect(width).not.toBe(2.85)
  expect(height).not.toBe(2.38)
})

it('keeps the glow static and schedules no loop for reduced motion', async () => {
  const browser = installControlledBrowser({ reducedMotion: true })
  render(<OrbitalAvatar />)

  await waitFor(() => expect(three.sprites).toHaveLength(3))
  const glow = three.sprites[0]
  const [width, height] = glow.scale.set.mock.calls.at(-1) ?? []

  expect(width).toBe(2.85)
  expect(height).toBe(2.38)
  expect(browser.pendingFrames).toHaveLength(0)
})
```

Extend the existing cleanup assertion so the single procedural texture and loaded avatar texture are both disposed:

```ts
expect(three.dataTextures[0].dispose).toHaveBeenCalledTimes(1)
expect(three.textures.every((texture) =>
  texture.dispose.mock.calls.length === 1,
)).toBe(true)
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```powershell
npm test -- src/components/OrbitalAvatar.test.tsx
```

Expected: FAIL because the scene creates only the avatar sprite, no `DataTexture`, and the shell opacities are `0.09` and `0.055`.

- [ ] **Step 3: Implement shared-texture glow actors and resource cleanup**

Import the glow model:

```ts
import {
  GLOW_LAYERS,
  GLOW_TEXTURE_SIZE,
  createRadialGlowTextureData,
} from './orbitalGlow'
```

Replace the single texture variable with a tracked texture collection:

```ts
const textures: Array<{ dispose: () => void }> = []
```

In `disposeScene`, replace the old single-texture disposal with:

```ts
textures.splice(0).forEach((sceneTexture) =>
  disposeSafely(() => sceneTexture.dispose()),
)
```

Lower the two shell material opacities so neither mesh can read as a disc:

```ts
// coreMaterial
opacity: 0.003,

// atmosphereMaterial
opacity: 0.004,
```

Immediately after the existing core and atmosphere actors are created, construct one shared procedural texture and two glow sprites:

```ts
const glowTexture = new THREE.DataTexture(
  createRadialGlowTextureData(),
  GLOW_TEXTURE_SIZE,
  GLOW_TEXTURE_SIZE,
  THREE.RGBAFormat,
)
glowTexture.needsUpdate = true
glowTexture.magFilter = THREE.LinearFilter
glowTexture.minFilter = THREE.LinearFilter
glowTexture.generateMipmaps = false
textures.push(glowTexture)

const glowActors = GLOW_LAYERS.map((definition) => {
  const material = new THREE.SpriteMaterial({
    blending: THREE.AdditiveBlending,
    color: definition.color,
    depthTest: true,
    depthWrite: false,
    map: glowTexture,
    opacity: definition.opacity,
    transparent: true,
  })
  materials.push(material)

  const sprite = new THREE.Sprite(material)
  sprite.position.set(0, 0, definition.z)
  sprite.renderOrder = 0
  root.add(sprite)

  return { definition, material, sprite }
})
```

In `applySceneProfile`, update intensity and base size without allocating new actors:

```ts
glowActors.forEach(({ definition, material, sprite }) => {
  material.opacity = definition.opacity * activeProfile.glowIntensity
  sprite.scale.set(
    definition.scale[0] * activeProfile.glowScale,
    definition.scale[1] * activeProfile.glowScale,
    1,
  )
})
```

Move the breathing effect from the visible atmosphere shell to the two soft sprites in `renderFrame`:

```ts
atmosphere.scale.setScalar(1)
glowActors.forEach(({ definition, sprite }) => {
  const breath = 1 + Math.sin(
    animationTime * 0.00045 + definition.pulseOffset,
  ) * 0.018

  sprite.scale.set(
    definition.scale[0] * activeProfile.glowScale * breath,
    definition.scale[1] * activeProfile.glowScale * breath,
    1,
  )
})
```

Track the texture request immediately so failure or unmount during loading still disposes it:

```ts
const loadedTexture = await new Promise<import('three').Texture>(
  (resolve, reject) => {
    const requestedTexture = new THREE.TextureLoader().load(
      AVATAR_TEXTURE,
      resolve,
      undefined,
      reject,
    )
    textures.push(requestedTexture)
  },
)

if (cancelled || disposed) return
loadedTexture.colorSpace = THREE.SRGBColorSpace
```

Use `loadedTexture` as the avatar material map. Remove the old conditional single-texture disposal branch because the request is already owned by `textures` and `disposeScene` is the only disposal path.

- [ ] **Step 4: Run the component and geometry tests and verify GREEN**

Run:

```powershell
npm test -- src/components/OrbitalAvatar.test.tsx src/components/orbitalGlow.test.ts src/components/orbitalAvatarGeometry.test.ts
```

Expected: all focused tests pass, including cleanup and reduced-motion coverage.

- [ ] **Step 5: Commit the Three.js glow**

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "feat: render layered orbital glow"
```

### Task 3: Match the persistent CSS fallback to the soft glow

**Files:**
- Modify: `src/index.css`
- Test: `src/index.test.ts`

- [ ] **Step 1: Write the failing fallback-style test**

Add a helper and test to `src/index.test.ts`:

```ts
const findStyleRule = (selector: string) =>
  Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText === selector,
    )

it('uses blurred edge-free gradients for the avatar fallback', () => {
  const innerGlow = findStyleRule('.hero-avatar-fallback-motion::before')
  const outerGlow = findStyleRule('.hero-avatar-fallback-motion::after')

  expect(innerGlow).toBeDefined()
  expect(outerGlow).toBeDefined()
  expect(innerGlow?.style.getPropertyValue('border')).toMatch(/^(|0|none)$/)
  expect(innerGlow?.style.getPropertyValue('box-shadow')).toMatch(/^(|none)$/)
  expect(innerGlow?.style.getPropertyValue('filter')).toContain('blur')
  expect(innerGlow?.style.getPropertyValue('background')).toContain('radial-gradient')
  expect(outerGlow?.style.getPropertyValue('filter')).toContain('blur')
  expect(outerGlow?.style.getPropertyValue('background')).toContain('radial-gradient')
})
```

- [ ] **Step 2: Run the CSS test and verify RED**

Run:

```powershell
npm test -- src/index.test.ts
```

Expected: FAIL because `::before` still has a border and inset box-shadow and does not use blur.

- [ ] **Step 3: Replace the circular fallback shell with two diffused gradients**

Replace the current `::before` and `::after` declarations in `src/index.css` with:

```css
.hero-avatar-fallback-motion::before {
  background: radial-gradient(
    ellipse at 50% 52%,
    rgba(168, 85, 247, 0.28) 0%,
    rgba(126, 34, 206, 0.14) 34%,
    rgba(76, 29, 149, 0.06) 52%,
    rgba(76, 29, 149, 0) 74%
  );
  border: 0;
  box-shadow: none;
  filter: blur(18px);
  inset: 10% 4%;
  opacity: 0.86;
  transform: scale(1.08, 0.92);
}

.hero-avatar-fallback-motion::after {
  background: radial-gradient(
    ellipse at center,
    rgba(147, 51, 234, 0.16) 0%,
    rgba(109, 40, 217, 0.08) 38%,
    rgba(88, 28, 135, 0) 72%
  );
  filter: blur(34px);
  inset: 4% -4%;
  opacity: 0.68;
  transform: scale(1.18, 0.94);
}
```

Keep the shared pseudo-element positioning, pointer-events, and negative stacking rules. Keep the existing reduced-motion behavior.

- [ ] **Step 4: Run the CSS and hero tests and verify GREEN**

Run:

```powershell
npm test -- src/index.test.ts src/sections/HeroSection.test.tsx
```

Expected: both files pass and the fallback remains accessible through the existing avatar image.

- [ ] **Step 5: Commit the fallback glow**

```powershell
git add src/index.css src/index.test.ts
git commit -m "fix: soften avatar fallback glow"
```

### Task 4: Verify the complete refinement

**Files:**
- Verify only; tune only `src/components/orbitalGlow.ts` or `src/index.css` if visual QA exposes a hard edge or excessive intensity.

- [ ] **Step 1: Run all automated checks from a clean worktree**

Run:

```powershell
npm test -- --run
npm run build
git diff --check 1c7dd51...HEAD
git status --short
```

Expected:

- Vitest reports all files and tests passing.
- TypeScript and Vite production build succeed.
- Three.js remains in its separate async chunk; the existing size warning is acceptable.
- Diff check prints nothing.
- Worktree status prints nothing.

- [ ] **Step 2: Perform desktop visual QA at 1440×900**

Open `http://127.0.0.1:4174/`, reload, and verify:

- The avatar has a soft purple radiance behind it, not a filled disc or visible spherical perimeter.
- Both glow layers fade into the black page before their outer edges.
- The avatar remains the highest-contrast element.
- Orbit lines still pass in front and behind, particles remain subtle, and no horizontal overflow appears.
- Browser console has no warnings or errors.

- [ ] **Step 3: Perform tablet and mobile visual QA**

Verify at `900×900` and `390×844`:

- Glow size and intensity reduce progressively.
- The glow never clips into a hard rectangle or circle.
- Heading, subtitle, avatar, and orbit field remain readable without horizontal overflow.
- Mobile still uses five visible orbit actors and no pointer parallax, as covered by the existing tests.

- [ ] **Step 4: Verify reduced motion through automated evidence**

Re-run these focused tests:

```powershell
npm test -- src/components/OrbitalAvatar.test.tsx src/components/FadeIn.test.tsx src/index.test.ts
```

Expected: reduced motion produces a static glow, schedules no continuous orbital frame, and removes CSS transitions.

- [ ] **Step 5: Request final code and spec review**

Review `1c7dd51...HEAD` against:

- `docs/superpowers/specs/2026-07-31-orbital-hero-services-contributions-design.md`
- this implementation plan

Expected: no Critical or Important findings before returning to branch integration.
