# Orbital Portfolio Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat hero and Services presentation with a living orbital avatar and spotlight bento grid, then restyle GitHub Contributions with GitHub green.

**Architecture:** A new `OrbitalAvatar` owns the lazily loaded Three.js scene while `HeroSection` owns the accessible static fallback and readiness transition. Pure orbit helpers keep geometry deterministic. A local `SpotlightCard` adds pointer-relative CSS variables without a third-party runtime, and `ServicesSection` owns the semantic bento layout.

**Tech Stack:** React 18, TypeScript, Three.js, Framer Motion, Tailwind CSS, Vitest, Testing Library

---

## File Map

- Create `src/components/OrbitalAvatar.tsx`: Three.js renderer, scene lifecycle, reduced motion, visibility, and readiness callback.
- Create `src/components/OrbitalAvatar.test.tsx`: WebGL failure, successful readiness, cleanup, and reduced-motion behavior.
- Create `src/components/orbitalAvatarGeometry.ts`: deterministic orbit definitions and rotated ellipse coordinates.
- Create `src/components/orbitalAvatarGeometry.test.ts`: desktop/mobile density and front/back depth tests.
- Create `src/components/SpotlightCard.tsx`: pointer-relative spotlight wrapper.
- Create `src/components/SpotlightCard.test.tsx`: pointer and reduced-motion behavior.
- Create `src/sections/HeroSection.test.tsx`: accessible fallback and readiness transition.
- Create `src/sections/ServicesSection.test.tsx`: semantic six-card bento layout.
- Modify `src/sections/HeroSection.tsx`: replace `NetworkGlobe` and `Magnet` portrait with `OrbitalAvatar` plus fallback.
- Modify `src/sections/ServicesSection.tsx`: render the six services through `SpotlightCard` in a responsive bento grid.
- Modify `src/components/GithubContributions.tsx`: green chart URL and green visual accents.
- Modify `src/components/GithubContributions.test.tsx`: assert the green chart URL and preserved fallback.
- Modify `src/index.css`: glass fallback, hero fade, spotlight, and reduced-motion styles.
- Delete `src/components/NetworkGlobe.tsx`, `src/components/NetworkGlobe.test.tsx`, `src/components/NetworkGlobeMotion.test.tsx`, `src/components/networkGlobeGeometry.ts`, and `src/components/networkGlobeGeometry.test.ts` after replacements pass.

### Task 1: Deterministic orbital geometry

**Files:**
- Create: `src/components/orbitalAvatarGeometry.ts`
- Create: `src/components/orbitalAvatarGeometry.test.ts`

- [ ] **Step 1: Write the failing geometry tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  createOrbitPoints,
  getOrbitDefinitions,
} from './orbitalAvatarGeometry'

describe('orbital avatar geometry', () => {
  it('uses eight desktop orbits and five mobile orbits', () => {
    expect(getOrbitDefinitions(false)).toHaveLength(8)
    expect(getOrbitDefinitions(true)).toHaveLength(5)
  })

  it('creates deterministic closed ellipses with front and back depth', () => {
    const orbit = getOrbitDefinitions(false)[1]
    const first = createOrbitPoints(orbit, 64)
    const second = createOrbitPoints(orbit, 64)
    const depth = Array.from(first).filter((_, index) => index % 3 === 2)

    expect(first).toEqual(second)
    expect(first).toHaveLength((64 + 1) * 3)
    expect(Array.from(first.slice(0, 3))).toEqual(
      Array.from(first.slice(-3)),
    )
    expect(Math.min(...depth)).toBeLessThan(0)
    expect(Math.max(...depth)).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/orbitalAvatarGeometry.test.ts`

Expected: FAIL because `./orbitalAvatarGeometry` does not exist.

- [ ] **Step 3: Implement the deterministic orbit model**

Create the exported types and functions below. Keep the eight definitions as a frozen module constant so every render uses the same axes, speeds, and phases.

```ts
export interface OrbitDefinition {
  radiusX: number
  radiusY: number
  rotation: readonly [number, number, number]
  speed: number
  phase: number
  direction: 1 | -1
  color: number
}

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

export function createOrbitPosition(
  orbit: OrbitDefinition,
  angle: number,
): readonly [number, number, number] {
  const point: [number, number, number] = [
    Math.cos(angle) * orbit.radiusX,
    Math.sin(angle) * orbit.radiusY,
    0,
  ]
  return rotatePoint(point, orbit.rotation)
}

export function createOrbitPoints(
  orbit: OrbitDefinition,
  segments: number,
): Float32Array {
  const points: number[] = []
  for (let index = 0; index <= segments; index += 1) {
    points.push(...createOrbitPosition(orbit, (index / segments) * Math.PI * 2))
  }
  return new Float32Array(points)
}

function rotatePoint(
  [x, y, z]: readonly [number, number, number],
  [rotationX, rotationY, rotationZ]: readonly [number, number, number],
): readonly [number, number, number] {
  const x1 = x
  const y1 = y * Math.cos(rotationX) - z * Math.sin(rotationX)
  const z1 = y * Math.sin(rotationX) + z * Math.cos(rotationX)
  const x2 = x1 * Math.cos(rotationY) + z1 * Math.sin(rotationY)
  const y2 = y1
  const z2 = -x1 * Math.sin(rotationY) + z1 * Math.cos(rotationY)
  return [
    x2 * Math.cos(rotationZ) - y2 * Math.sin(rotationZ),
    x2 * Math.sin(rotationZ) + y2 * Math.cos(rotationZ),
    z2,
  ]
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/orbitalAvatarGeometry.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the geometry unit**

```powershell
git add src/components/orbitalAvatarGeometry.ts src/components/orbitalAvatarGeometry.test.ts
git commit -m "feat: define orbital avatar geometry"
```

### Task 2: Orbital scene lifecycle and fallback safety

**Files:**
- Create: `src/components/OrbitalAvatar.tsx`
- Create: `src/components/OrbitalAvatar.test.tsx`

- [ ] **Step 1: Write failing lifecycle tests**

Create a Three.js mock based on the current `NetworkGlobeMotion.test.tsx`, adding `CanvasTexture`, `CircleGeometry`, `Line`, `Sprite`, `SpriteMaterial`, `TextureLoader`, and `Vector3` test doubles. Add these assertions:

```tsx
function stubMedia({
  reducedMotion,
  mobile,
}: {
  reducedMotion: boolean
  mobile: boolean
}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches:
        (query === '(prefers-reduced-motion: reduce)' && reducedMotion) ||
        (query === '(max-width: 767px)' && mobile) ||
        (query === '(hover: hover) and (pointer: fine)' && !mobile),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia,
  )
}

it('keeps an empty decorative wrapper when renderer creation fails', async () => {
  const { container } = render(<OrbitalAvatar className="scene" />)
  await waitFor(() => expect(rendererConstruction).toHaveBeenCalledOnce())
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  expect(container.firstElementChild).toHaveClass('pointer-events-none', 'scene')
  expect(container.querySelector('canvas')).not.toBeInTheDocument()
})

it('renders once, announces readiness, and disposes on unmount', async () => {
  const onReady = vi.fn()
  const rendered = render(<OrbitalAvatar onReady={onReady} />)
  await waitFor(() => expect(onReady).toHaveBeenCalledOnce())
  expect(rendererRender).toHaveBeenCalled()
  expect(rendered.container.querySelectorAll('canvas')).toHaveLength(1)
  rendered.unmount()
  expect(rendererDispose).toHaveBeenCalledOnce()
})

it('renders one frame without a continuous loop for reduced motion', async () => {
  stubMedia({ reducedMotion: true, mobile: false })
  const requestAnimationFrame = vi.fn().mockReturnValue(1)
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  render(<OrbitalAvatar />)
  await waitFor(() => expect(rendererRender).toHaveBeenCalled())
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/OrbitalAvatar.test.tsx`

Expected: FAIL because `OrbitalAvatar` does not exist.

- [ ] **Step 3: Implement the scene**

Implement `OrbitalAvatar({ className, onReady })` with the lifecycle already proven by `NetworkGlobe`: asynchronous `import('three')`, guarded cancellation, renderer creation inside `try/catch`, resize/intersection/visibility observers, document and pointer listeners, and complete disposal.

Use these exact scene rules:

```ts
export interface OrbitalAvatarProps {
  className?: string
  onReady?: () => void
}

const AVATAR_TEXTURE = '/images/avatar-transparent.png'
const PURPLE = 0xa855f7
const MOBILE_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
```

After renderer creation:

```ts
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
camera.position.z = 5.4
renderer.setClearColor(0x000000, 0)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6))
```

Create the avatar sprite, transparent core, atmosphere, orbit lines, and satellites from `getOrbitDefinitions(isMobile)`. Set the avatar sprite map through `TextureLoader.load(AVATAR_TEXTURE, onLoad, undefined, onError)`. Only the successful texture callback may append the canvas, render the first frame, and call `onReady?.()`.

For each orbit, create a `BufferGeometry` from `createOrbitPoints(orbit, isMobile ? 56 : 96)`, a transparent `LineBasicMaterial`, one `Line`, and a small emissive satellite mesh. On each animated frame, update the satellite with:

```ts
const angle = orbit.phase + time * orbit.speed * orbit.direction
satellite.position.set(...createOrbitPosition(orbit, angle))
```

Use a transparent `SphereGeometry(1.08, mobile ? 24 : 36, mobile ? 18 : 28)` with a purple `MeshBasicMaterial` at opacity `0.09`, `depthWrite: false`, and no opaque backing mesh. Add a larger back-side atmosphere sphere at opacity `0.055` with additive blending. Use pointer values only when reduced motion is false and the pointer is fine.

The render loop must schedule another frame only when reduced motion is false, the hero intersects, and the document is visible. Disposal must cancel the frame, disconnect observers, remove listeners, dispose the loaded texture and all geometry/material instances, call `renderer.dispose()`, and remove the canvas.

- [ ] **Step 4: Run lifecycle and geometry tests**

Run: `npm test -- src/components/OrbitalAvatar.test.tsx src/components/orbitalAvatarGeometry.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit the scene unit**

```powershell
git add src/components/OrbitalAvatar.tsx src/components/OrbitalAvatar.test.tsx
git commit -m "feat: add living orbital avatar scene"
```

### Task 3: Hero integration with accessible glass fallback

**Files:**
- Create: `src/sections/HeroSection.test.tsx`
- Modify: `src/sections/HeroSection.tsx:1-69`
- Modify: `src/index.css`
- Delete: `src/components/NetworkGlobe.tsx`
- Delete: `src/components/NetworkGlobe.test.tsx`
- Delete: `src/components/NetworkGlobeMotion.test.tsx`
- Delete: `src/components/networkGlobeGeometry.ts`
- Delete: `src/components/networkGlobeGeometry.test.ts`

- [ ] **Step 1: Write the failing hero integration test**

Mock `FadeIn` as a transparent wrapper and `OrbitalAvatar` as a button that invokes `onReady`. Assert the accessible avatar exists before and after readiness while its visual fallback changes opacity.

```tsx
it('keeps accessible avatar text while fading the visual fallback after scene readiness', () => {
  render(<HeroSection />)
  const avatar = screen.getByRole('img', { name: 'Erkan avatar' })
  const fallback = avatar.closest('[data-avatar-fallback]')

  expect(fallback).toHaveClass('opacity-100')
  fireEvent.click(screen.getByTestId('orbital-ready'))
  expect(screen.getByRole('img', { name: 'Erkan avatar' })).toBeInTheDocument()
  expect(fallback).toHaveClass('opacity-0')
})
```

- [ ] **Step 2: Run the hero test and verify RED**

Run: `npm test -- src/sections/HeroSection.test.tsx`

Expected: FAIL because `HeroSection` does not render the new orbital readiness contract.

- [ ] **Step 3: Replace the hero portrait composition**

Remove `Magnet` and `NetworkGlobe` imports. Add `useState` and `OrbitalAvatar`. Render one centered scene wrapper below the heading:

```tsx
const [orbitalReady, setOrbitalReady] = useState(false)

<div className="absolute left-1/2 top-[62%] z-10 h-[min(92vw,780px)] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 sm:top-[64%]">
  <OrbitalAvatar
    className="absolute inset-0"
    onReady={() => setOrbitalReady(true)}
  />
  <div
    data-avatar-fallback
    className={`hero-avatar-fallback absolute left-1/2 top-1/2 w-[min(52vw,430px)] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${orbitalReady ? 'opacity-0' : 'opacity-100'}`}
  >
    <img
      src="/images/avatar-transparent.png"
      alt="Erkan avatar"
      className="relative z-10 w-full object-contain"
      loading="eager"
    />
  </div>
</div>
```

Add CSS for `.hero-avatar-fallback::before` using only transparent purple radial gradients, a thin purple border, blur, and glow. Do not set a black or opaque background color. Add a reduced-motion rule that removes fallback pulsing.

- [ ] **Step 4: Run hero and orbital tests**

Run: `npm test -- src/sections/HeroSection.test.tsx src/components/OrbitalAvatar.test.tsx src/components/orbitalAvatarGeometry.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Remove the superseded globe files and run the full suite**

```powershell
git rm src/components/NetworkGlobe.tsx src/components/NetworkGlobe.test.tsx src/components/NetworkGlobeMotion.test.tsx src/components/networkGlobeGeometry.ts src/components/networkGlobeGeometry.test.ts
npm test
```

Expected: 19 original tests minus the removed globe tests plus the new orbital/hero tests all PASS.

- [ ] **Step 6: Commit hero integration**

```powershell
git add src/sections/HeroSection.tsx src/sections/HeroSection.test.tsx src/index.css
git commit -m "feat: embed avatar in orbital hero"
```

### Task 4: Pointer-aware Spotlight Card

**Files:**
- Create: `src/components/SpotlightCard.tsx`
- Create: `src/components/SpotlightCard.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing interaction tests**

```tsx
function stubSpotlightMedia({
  reducedMotion,
  finePointer,
}: {
  reducedMotion: boolean
  finePointer: boolean
}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      matches:
        (query === '(prefers-reduced-motion: reduce)' && reducedMotion) ||
        (query === '(hover: hover) and (pointer: fine)' && finePointer),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia,
  )
}

function rect({
  left,
  top,
  width,
  height,
}: {
  left: number
  top: number
  width: number
  height: number
}): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

it('writes pointer-relative spotlight coordinates for a fine pointer', () => {
  stubSpotlightMedia({ reducedMotion: false, finePointer: true })
  render(<SpotlightCard>Service</SpotlightCard>)
  const card = screen.getByRole('article')
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(
    rect({ left: 20, top: 30, width: 300, height: 200 }),
  )
  fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('60px')
  expect(card.style.getPropertyValue('--spotlight-y')).toBe('80px')
})

it('does not track the pointer when reduced motion is requested', () => {
  stubSpotlightMedia({ reducedMotion: true, finePointer: true })
  render(<SpotlightCard>Service</SpotlightCard>)
  const card = screen.getByRole('article')
  fireEvent.pointerMove(card, { clientX: 80, clientY: 110 })
  expect(card.style.getPropertyValue('--spotlight-x')).toBe('')
})
```

- [ ] **Step 2: Run the Spotlight Card test and verify RED**

Run: `npm test -- src/components/SpotlightCard.test.tsx`

Expected: FAIL because `SpotlightCard` does not exist.

- [ ] **Step 3: Implement the local wrapper**

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
}

export default function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null)
  const [tracksPointer, setTracksPointer] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const refresh = () => setTracksPointer(!reduced.matches && finePointer.matches)
    refresh()
    reduced.addEventListener?.('change', refresh)
    finePointer.addEventListener?.('change', refresh)
    return () => {
      reduced.removeEventListener?.('change', refresh)
      finePointer.removeEventListener?.('change', refresh)
    }
  }, [])

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!tracksPointer || !ref.current) return
    const bounds = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`)
    ref.current.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`)
  }

  return (
    <article
      ref={ref}
      onPointerMove={handlePointerMove}
      className={`spotlight-card ${className}`.trim()}
    >
      {children}
    </article>
  )
}
```

Add `.spotlight-card::before` with a transparent purple radial gradient centered on the two CSS variables. Keep it non-interactive with `pointer-events: none`. Apply a restrained hover lift only inside `(hover: hover) and (pointer: fine)`, and disable transitions/transforms under reduced motion.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/SpotlightCard.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit Spotlight Card**

```powershell
git add src/components/SpotlightCard.tsx src/components/SpotlightCard.test.tsx src/index.css
git commit -m "feat: add accessible spotlight cards"
```

### Task 5: Services bento grid

**Files:**
- Create: `src/sections/ServicesSection.test.tsx`
- Modify: `src/sections/ServicesSection.tsx:1-102`

- [ ] **Step 1: Write the failing Services layout test**

```tsx
it('renders all six services in a responsive semantic bento grid', () => {
  render(<ServicesSection />)
  const grid = screen.getByRole('list', { name: 'Services I provide' })
  const cards = within(grid).getAllByRole('listitem')

  expect(grid).toHaveClass('grid', 'lg:grid-cols-6')
  expect(cards).toHaveLength(6)
  expect(cards[0]).toHaveClass('lg:col-span-4', 'lg:row-span-2')
  expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
    'Software & Product Engineering',
    'Cybersecurity Tooling',
    'Automation Systems',
    'Systems & Network Utilities',
    'Developer Experience',
    'Technical Direction',
  ])
})
```

- [ ] **Step 2: Run the Services test and verify RED**

Run: `npm test -- src/sections/ServicesSection.test.tsx`

Expected: FAIL because the current section is a flex list without semantic list items.

- [ ] **Step 3: Implement the bento layout**

Keep the existing `services` data. Add a `cardSpans` constant:

```ts
const cardSpans = [
  'lg:col-span-4 lg:row-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
]
```

Render the list with `role="list" aria-label="Services I provide"` and classes `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]`. Each `FadeIn` wraps a `div role="listitem"`; each list item contains a `SpotlightCard` with a white-to-purple surface, icon, title, description, and all capability tags. Give the featured first card more whitespace and a larger icon while keeping the same semantic content.

- [ ] **Step 4: Run Services and Spotlight tests**

Run: `npm test -- src/sections/ServicesSection.test.tsx src/components/SpotlightCard.test.tsx`

Expected: all tests PASS.

- [ ] **Step 5: Commit the Services grid**

```powershell
git add src/sections/ServicesSection.tsx src/sections/ServicesSection.test.tsx
git commit -m "feat: redesign services as spotlight bento"
```

### Task 6: GitHub-green Contributions

**Files:**
- Modify: `src/components/GithubContributions.test.tsx:7-42`
- Modify: `src/components/GithubContributions.tsx:4-59`

- [ ] **Step 1: Change the chart expectation first**

```ts
expect(image).toHaveAttribute(
  'src',
  'https://ghchart.rshah.org/39d353/erkanrzgc',
)
```

Also assert that the activity label is green through a stable class token:

```ts
expect(screen.getByText('erkanrzgc · live activity')).toHaveClass('text-[#7EE787]')
```

- [ ] **Step 2: Run the contribution test and verify RED**

Run: `npm test -- src/components/GithubContributions.test.tsx`

Expected: FAIL because the chart URL and label still use blue-grey.

- [ ] **Step 3: Apply the GitHub green scale**

Set `CHART_URL` to `https://ghchart.rshah.org/39d353/erkanrzgc`. Change the panel border to `border-[#39D353]/25`, the GitHub icon and activity label to `text-[#7EE787]`, and link/fallback focus rings to `#39D353`. Keep the dark panel, image alternative text, external-link attributes, lazy loading, and failure state unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/components/GithubContributions.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit Contributions styling**

```powershell
git add src/components/GithubContributions.tsx src/components/GithubContributions.test.tsx
git commit -m "feat: use github green for contributions"
```

### Task 7: Full verification and visual QA

**Files:**
- Modify only files required by verified defects found in this task.

- [ ] **Step 1: Run formatting and whitespace validation**

Run: `git diff --check 06c59f3...HEAD`

Expected: no output and exit code 0.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: every test file and test PASS with no unhandled error.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully. Three.js remains in an asynchronous chunk.

- [ ] **Step 4: Inspect bundle output**

Confirm the initial application chunk stays below 400 kB minified and the Three.js chunk remains separate. Do not add GSAP or another animation dependency.

- [ ] **Step 5: Perform browser QA**

Start Vite on an available localhost port. Inspect desktop and mobile widths and verify:

- the avatar has no opaque black disk;
- the transparent purple core and eight desktop orbits read as front/back depth;
- satellites move at varied speeds and the scene responds subtly to pointer movement;
- reduced motion produces a stable frame;
- Services shows six readable cards, pointer spotlight, keyboard-visible content, and a one-column mobile layout;
- Contributions uses green and remains below the project grid;
- no console errors or horizontal overflow appear.

- [ ] **Step 6: Commit verified corrections if needed**

```powershell
git add src
git commit -m "fix: polish orbital portfolio experience"
```

Skip this commit when verification finds no defect and the working tree is clean.
