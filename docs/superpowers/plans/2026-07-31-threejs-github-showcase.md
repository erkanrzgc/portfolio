# Three.js Hero and GitHub Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a performant Three.js network globe to the existing hero and replace the sticky GitHub cards with an ordered eight-project grid followed by a resilient contribution chart.

**Architecture:** A self-contained `NetworkGlobe` component owns the Three.js lifecycle while pure geometry helpers remain WebGL-independent and unit-testable. GitHub data stays in `githubProjects.ts`, which filters, merges, and orders live data against a complete local fallback; presentation stays in focused project and contribution components.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Three.js, Framer Motion, Vitest, jsdom, Testing Library

---

## File Structure

- Create `src/components/networkGlobeGeometry.ts`: deterministic sphere points and bounded connection segments.
- Create `src/components/networkGlobeGeometry.test.ts`: pure geometry tests.
- Create `src/components/NetworkGlobe.tsx`: renderer lifecycle, parallax, visibility, responsive density, cleanup, and WebGL fallback.
- Modify `src/sections/HeroSection.tsx`: place the decorative globe behind the current avatar and copy.
- Modify `src/lib/githubProjects.ts`: eight-project allowlist, current fallbacks, exact ordering, live/fallback merge, and date formatting.
- Create `src/lib/githubProjects.test.ts`: filtering, ordering, merge, and metadata-format tests.
- Rewrite `src/sections/ProjectsSection.tsx`: compact two-column grid and explicit project actions.
- Create `src/components/GithubContributions.tsx`: themed contribution image and broken-image fallback.
- Create `src/components/GithubContributions.test.tsx`: contribution success/fallback behavior.
- Create `src/test/setup.ts`: Testing Library DOM matchers.
- Modify `vite.config.ts`: Vitest jsdom configuration.
- Modify `package.json` and `package-lock.json`: Three.js and test dependencies/scripts.

## Task 1: Add Test Infrastructure and Deterministic Globe Geometry

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/components/networkGlobeGeometry.test.ts`
- Create: `src/components/networkGlobeGeometry.ts`

- [ ] **Step 1: Install Three.js and the focused test toolchain**

Run:

```powershell
npm install three
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @types/three
```

Expected: `package.json` contains `three` in dependencies and the five test/type packages in devDependencies; `package-lock.json` updates without audit/install errors.

- [ ] **Step 2: Add the test script and Vitest setup**

Add this script to `package.json`:

```json
"test": "vitest run"
```

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Write failing deterministic geometry tests**

Create `src/components/networkGlobeGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  createConnectionSegments,
  createSpherePoints,
} from './networkGlobeGeometry'

describe('createSpherePoints', () => {
  it('returns deterministic points on the requested radius', () => {
    const first = createSpherePoints(32, 1.6)
    const second = createSpherePoints(32, 1.6)

    expect(first).toEqual(second)
    expect(first).toHaveLength(32)
    for (const point of first) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1.6, 5)
    }
  })
})

describe('createConnectionSegments', () => {
  it('returns bounded segment coordinates for nearby points', () => {
    const points = createSpherePoints(48, 1.6)
    const segments = createConnectionSegments(points, 0.9, 80)

    expect(segments).toBeInstanceOf(Float32Array)
    expect(segments.length % 6).toBe(0)
    expect(segments.length / 6).toBeLessThanOrEqual(80)
    expect(segments.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 4: Run the tests to verify the missing module failure**

Run:

```powershell
npm test -- src/components/networkGlobeGeometry.test.ts
```

Expected: FAIL because `./networkGlobeGeometry` does not exist.

- [ ] **Step 5: Implement the minimal pure geometry helpers**

Create `src/components/networkGlobeGeometry.ts`:

```ts
export interface GlobePoint {
  x: number
  y: number
  z: number
}

export function createSpherePoints(count: number, radius: number): GlobePoint[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(count - 1, 1)) * 2
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * index

    return {
      x: Math.cos(theta) * ringRadius * radius,
      y: y * radius,
      z: Math.sin(theta) * ringRadius * radius,
    }
  })
}

export function createConnectionSegments(
  points: GlobePoint[],
  maxDistance: number,
  maxConnections: number,
): Float32Array {
  const coordinates: number[] = []
  let connectionCount = 0

  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      if (connectionCount >= maxConnections) {
        return new Float32Array(coordinates)
      }

      const a = points[left]
      const b = points[right]
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

      if (distance <= maxDistance) {
        coordinates.push(a.x, a.y, a.z, b.x, b.y, b.z)
        connectionCount += 1
      }
    }
  }

  return new Float32Array(coordinates)
}
```

- [ ] **Step 6: Run geometry tests and the TypeScript build**

Run:

```powershell
npm test -- src/components/networkGlobeGeometry.test.ts
npm run build
```

Expected: geometry tests PASS and the production build succeeds.

- [ ] **Step 7: Commit the geometry foundation**

```powershell
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/components/networkGlobeGeometry.ts src/components/networkGlobeGeometry.test.ts
git commit -m "test: add Three.js geometry foundation"
```

## Task 2: Build and Integrate the Network Globe

**Files:**
- Create: `src/components/NetworkGlobe.tsx`
- Modify: `src/sections/HeroSection.tsx`

- [ ] **Step 1: Create the Three.js component with complete lifecycle ownership**

Create `src/components/NetworkGlobe.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  createConnectionSegments,
  createSpherePoints,
} from './networkGlobeGeometry'

interface NetworkGlobeProps {
  className?: string
}

export default function NetworkGlobe({ className = '' }: NetworkGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = window.matchMedia('(max-width: 767px)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.z = 5.2

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile })
    } catch {
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.6))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.style.opacity = '1'
    renderer.domElement.style.transition = 'opacity 180ms linear'
    container.appendChild(renderer.domElement)

    const globe = new THREE.Group()
    scene.add(globe)

    const radius = 1.6
    const points = createSpherePoints(mobile ? 44 : 78, radius)
    const pointGeometry = new THREE.BufferGeometry().setFromPoints(
      points.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
    )
    const pointMaterial = new THREE.PointsMaterial({
      color: 0xd7e2ea,
      size: mobile ? 0.035 : 0.045,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
    globe.add(new THREE.Points(pointGeometry, pointMaterial))

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        createConnectionSegments(points, mobile ? 0.82 : 0.72, mobile ? 55 : 120),
        3,
      ),
    )
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xbbccd7,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
    globe.add(new THREE.LineSegments(lineGeometry, lineMaterial))

    const shellGeometry = new THREE.SphereGeometry(radius, 26, 18)
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x8aa4b2,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      depthWrite: false,
    })
    globe.add(new THREE.Mesh(shellGeometry, shellMaterial))

    const glowGeometry = new THREE.SphereGeometry(radius * 1.08, 24, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xbbccd7,
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
      depthWrite: false,
    })
    globe.add(new THREE.Mesh(glowGeometry, glowMaterial))

    const target = { x: 0, y: 0 }
    const resize = () => {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    const pointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect()
      target.y = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.34
      target.x = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.2
    }
    const updateOpacity = () => {
      const bounds = container.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, 1 + bounds.top / bounds.height))
      renderer.domElement.style.opacity = String(progress)
    }

    let inView = true
    let frame = 0
    let running = false
    let baseRotation = 0
    const renderFrame = () => {
      baseRotation += 0.0015
      globe.rotation.x += (target.x - globe.rotation.x) * 0.035
      globe.rotation.y += (baseRotation + target.y - globe.rotation.y) * 0.035
      renderer.render(scene, camera)
      frame = requestAnimationFrame(renderFrame)
    }
    const updateAnimation = () => {
      const shouldRun = inView && !document.hidden && !reducedMotion.matches
      if (shouldRun && !running) {
        running = true
        frame = requestAnimationFrame(renderFrame)
      } else if (!shouldRun && running) {
        running = false
        cancelAnimationFrame(frame)
        renderer.render(scene, camera)
      }
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    const intersectionObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting
            updateAnimation()
          })
    const visibilityChange = () => updateAnimation()
    const motionChange = () => updateAnimation()

    resizeObserver?.observe(container)
    intersectionObserver?.observe(container)
    window.addEventListener('pointermove', pointerMove, { passive: true })
    window.addEventListener('scroll', updateOpacity, { passive: true })
    document.addEventListener('visibilitychange', visibilityChange)
    reducedMotion.addEventListener('change', motionChange)
    resize()
    updateOpacity()
    updateAnimation()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('scroll', updateOpacity)
      document.removeEventListener('visibilitychange', visibilityChange)
      reducedMotion.removeEventListener('change', motionChange)
      pointGeometry.dispose()
      pointMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      shellGeometry.dispose()
      shellMaterial.dispose()
      glowGeometry.dispose()
      glowMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    />
  )
}
```

- [ ] **Step 2: Integrate the globe behind the current hero content**

In `src/sections/HeroSection.tsx`, import the component:

```tsx
import NetworkGlobe from '../components/NetworkGlobe'
```

Add this as the first child of the hero `<section>`:

```tsx
<NetworkGlobe className="absolute left-1/2 top-[58%] z-0 h-[min(78vw,760px)] w-[min(92vw,920px)] -translate-x-1/2 -translate-y-1/2 opacity-90" />
```

Add `relative z-20` to the navbar wrapper, heading wrapper, and subtitle `FadeIn`. Keep the portrait at `z-10` so the globe remains behind it.

- [ ] **Step 3: Build and inspect the hero manually**

Run:

```powershell
npm run build
npm run dev -- --host 127.0.0.1
```

Expected: build succeeds; the hero retains its text/avatar layout, the globe appears behind the portrait, pointer movement does not block links or scrolling, and no console errors appear.

- [ ] **Step 4: Verify responsive and motion fallbacks**

In the browser, verify widths 1280 px, 768 px, and 390 px. Emulate `prefers-reduced-motion: reduce` and confirm the globe renders without continuous animation. Disable WebGL or force the renderer constructor to throw in DevTools and confirm the original hero remains usable.

- [ ] **Step 5: Commit the hero feature**

```powershell
git add src/components/NetworkGlobe.tsx src/sections/HeroSection.tsx
git commit -m "feat: add network globe to hero"
```

## Task 3: Curate and Merge GitHub Project Data

**Files:**
- Modify: `src/lib/githubProjects.ts`
- Create: `src/lib/githubProjects.test.ts`

- [ ] **Step 1: Write failing order, filter, merge, and formatting tests**

Create `src/lib/githubProjects.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  CURATED_PROJECT_NAMES,
  fallbackProjects,
  formatUpdatedAt,
  getDisplayRepos,
  mergeWithFallback,
  type GithubRepo,
  type PortfolioProject,
} from './githubProjects'

const repo = (name: string): GithubRepo => ({
  name,
  html_url: `https://github.com/erkanrzgc/${name}`,
  description: `${name} description`,
  language: 'TypeScript',
  stargazers_count: 3,
  forks_count: 1,
  private: false,
  fork: false,
  updated_at: '2026-07-31T10:00:00Z',
  homepage: null,
})

describe('GitHub project curation', () => {
  it('filters extras and returns the exact curated order', () => {
    const input = [repo('firewall'), repo('unlisted'), repo('vibeprint'), repo('octopus')]
    const result = getDisplayRepos(input)

    expect(result.map((project) => project.name)).toEqual([
      'vibeprint',
      'octopus',
      'firewall',
    ])
  })

  it('merges missing live projects from fallback without changing order', () => {
    const live: PortfolioProject[] = [
      { ...fallbackProjects[0], description: 'Live description' },
    ]
    const result = mergeWithFallback(live)

    expect(result.map((project) => project.name)).toEqual(CURATED_PROJECT_NAMES)
    expect(result[0].description).toBe('Live description')
    expect(result).toHaveLength(8)
  })
})

describe('formatUpdatedAt', () => {
  it('returns a safe label for an invalid date', () => {
    expect(formatUpdatedAt('not-a-date')).toBe('Recently updated')
  })
})
```

- [ ] **Step 2: Run the focused test to verify failure**

Run:

```powershell
npm test -- src/lib/githubProjects.test.ts
```

Expected: FAIL because the curated export, merge helper, and formatter do not yet exist.

- [ ] **Step 3: Replace legacy ordering with the approved allowlist**

In `src/lib/githubProjects.ts`, export this exact list and derive its rank/set:

```ts
export const CURATED_PROJECT_NAMES = [
  'vibeprint',
  'octopus',
  'autonomous-scanner',
  'firewall',
  'reverse-engineering',
  'steganography',
  'loadkit',
  'open-source-intelligence',
] as const

const curatedProjectSet = new Set<string>(CURATED_PROJECT_NAMES)
const projectRank = new Map(
  CURATED_PROJECT_NAMES.map((name, index) => [name, index]),
)
```

Delete the old `PROJECT_ORDER` entries and legacy aliases.

- [ ] **Step 4: Replace fallback data with the eight current repositories**

Keep the existing `PortfolioProject` shape and replace `fallbackProjects` with eight complete entries in curated order. Use these canonical descriptions/languages/homepages:

```ts
export const fallbackProjects: PortfolioProject[] = [
  {
    name: 'vibeprint',
    url: 'https://github.com/erkanrzgc/vibeprint',
    description: 'Chrome MV3 extension that detects AI-built websites and identifies visual builders using calibrated fingerprints.',
    language: 'TypeScript', stars: 0, forks: 0, isFork: false,
    updatedAt: '2026-07-31T11:49:02Z',
    homepage: 'https://erkanrzgc.github.io/vibeprint/',
    imageUrl: getOpenGraphImage('vibeprint'),
  },
  {
    name: 'octopus',
    url: 'https://github.com/erkanrzgc/octopus',
    description: 'Agentic cybersecurity LLM for red-team, blue-team, and network workflows with authorized tool use.',
    language: 'Python', stars: 0, forks: 0, isFork: false,
    updatedAt: '2026-07-30T18:34:30Z',
    homepage: 'https://huggingface.co/erkanrzgcc/octopus-gemma-v0.8.1',
    imageUrl: getOpenGraphImage('octopus'),
  },
  {
    name: 'autonomous-scanner',
    url: 'https://github.com/erkanrzgc/autonomous-scanner',
    description: 'AI-powered autonomous penetration testing framework for web, API, network, and cloud security workflows.',
    language: 'Python', stars: 1, forks: 1, isFork: false,
    updatedAt: '2026-07-25T17:23:53Z', homepage: null,
    imageUrl: getOpenGraphImage('autonomous-scanner'),
  },
  {
    name: 'firewall',
    url: 'https://github.com/erkanrzgc/firewall',
    description: 'Auditable policy-driven host firewall for Linux and Windows, built in Go and local by default.',
    language: 'Go', stars: 0, forks: 0, isFork: false,
    updatedAt: '2026-07-31T12:46:15Z', homepage: null,
    imageUrl: getOpenGraphImage('firewall'),
  },
  {
    name: 'reverse-engineering',
    url: 'https://github.com/erkanrzgc/reverse-engineering',
    description: 'Rust-powered static reverse-engineering toolkit for ELF, PE, and Mach-O binaries.',
    language: 'Rust', stars: 0, forks: 0, isFork: false,
    updatedAt: '2026-05-24T10:35:48Z', homepage: null,
    imageUrl: getOpenGraphImage('reverse-engineering'),
  },
  {
    name: 'steganography',
    url: 'https://github.com/erkanrzgc/steganography',
    description: 'Steganography toolkit for embedding, extraction, steganalysis, encryption, and carrier plug-ins.',
    language: 'Python', stars: 2, forks: 0, isFork: false,
    updatedAt: '2026-07-14T10:38:02Z', homepage: null,
    imageUrl: getOpenGraphImage('steganography'),
  },
  {
    name: 'loadkit',
    url: 'https://github.com/erkanrzgc/loadkit',
    description: 'Async multi-protocol load testing CLI with live metrics, exports, scenarios, and CI thresholds.',
    language: 'Python', stars: 0, forks: 0, isFork: false,
    updatedAt: '2026-05-24T11:59:19Z', homepage: null,
    imageUrl: getOpenGraphImage('loadkit'),
  },
  {
    name: 'open-source-intelligence',
    url: 'https://github.com/erkanrzgc/open-source-intelligence',
    description: 'Multi-source OSINT scanner with profile validation, soft-404 detection, and AI-assisted identity checks.',
    language: 'Python', stars: 1, forks: 0, isFork: false,
    updatedAt: '2026-07-26T11:42:26Z', homepage: null,
    imageUrl: getOpenGraphImage('open-source-intelligence'),
  },
]
```

- [ ] **Step 5: Add merge and safe date formatting behavior**

Add to `src/lib/githubProjects.ts`:

```ts
export function mergeWithFallback(projects: PortfolioProject[]) {
  const liveByName = new Map(projects.map((project) => [project.name, project]))
  return fallbackProjects.map((fallback) => liveByName.get(fallback.name) ?? fallback)
}

export function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'Recently updated'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
```

Update `getDisplayRepos` to include `curatedProjectSet.has(repo.name)` in its filter. Update `fetchGithubProjects` to return `mergeWithFallback(getDisplayRepos(repos))`.

- [ ] **Step 6: Run focused tests and build**

Run:

```powershell
npm test -- src/lib/githubProjects.test.ts
npm run build
```

Expected: all GitHub curation tests PASS and the production build succeeds.

- [ ] **Step 7: Commit GitHub data curation**

```powershell
git add src/lib/githubProjects.ts src/lib/githubProjects.test.ts
git commit -m "feat: curate portfolio repositories"
```

## Task 4: Replace Sticky Project Cards with the Compact Grid

**Files:**
- Modify: `src/sections/ProjectsSection.tsx`

- [ ] **Step 1: Remove sticky-scroll dependencies and card sizing**

Remove `useRef`, `motion`, `useScroll`, and `useTransform` from `ProjectsSection.tsx`. Change `ProjectCard` props to only receive `project`.

- [ ] **Step 2: Replace `ProjectCard` with the compact accessible article**

Use this structure inside `ProjectCard`:

```tsx
function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <article className="group flex min-h-[300px] flex-col rounded-[28px] border border-[#D7E2EA]/25 bg-[#111519] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#D7E2EA]/60 sm:p-7">
      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-[#D7E2EA]/45">
        <span className="truncate font-mono">erkanrzgc/</span>
        <Github size={20} aria-hidden="true" />
      </div>

      <h3 className="mt-10 text-[clamp(1.6rem,3vw,2.6rem)] font-black uppercase leading-none text-[#D7E2EA]">
        {formatRepoName(project.name)}
      </h3>
      <p className="mt-4 text-sm font-light leading-relaxed text-[#D7E2EA]/65 sm:text-base">
        {project.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-8 text-xs font-semibold uppercase tracking-[0.12em] text-[#D7E2EA]/55">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#BBCCD7]" />
          {project.language}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star size={14} aria-hidden="true" /> {project.stars}
        </span>
        <span>{formatUpdatedAt(project.updatedAt)}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${formatRepoName(project.name)} on GitHub`}
          className="inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D7E2EA] transition-colors hover:bg-[#D7E2EA]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7E2EA]"
        >
          GitHub <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {project.homepage && project.homepage !== project.url && (
          <a
            href={project.homepage}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the live ${formatRepoName(project.name)} project`}
            className="inline-flex items-center gap-2 rounded-full bg-[#D7E2EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0C0C0C] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Live <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}
```

Import `Star` and `formatUpdatedAt` alongside the existing imports.

- [ ] **Step 3: Replace the sticky project container with the responsive grid**

Replace the current mapped sticky stack with:

```tsx
<div className="grid gap-5 md:grid-cols-2 lg:gap-7">
  {projects.map((project) => (
    <FadeIn key={project.name} delay={0.03} y={24}>
      <ProjectCard project={project} />
    </FadeIn>
  ))}
</div>
```

Keep the existing loading/error fallback behavior, but initialize state directly with `fallbackProjects` because it is already curated.

- [ ] **Step 4: Build and verify the grid**

Run:

```powershell
npm run build
```

Expected: build succeeds. In the browser, exactly eight projects appear in the approved order, at two columns at 768 px and above and one column below 768 px. Tab focus reaches explicit GitHub/Live links with visible focus rings.

- [ ] **Step 5: Commit the project grid**

```powershell
git add src/sections/ProjectsSection.tsx
git commit -m "feat: replace sticky projects with compact grid"
```

## Task 5: Add the Contribution Chart Below Projects

**Files:**
- Create: `src/components/GithubContributions.test.tsx`
- Create: `src/components/GithubContributions.tsx`
- Modify: `src/sections/ProjectsSection.tsx`

- [ ] **Step 1: Write the failing contribution fallback test**

Create `src/components/GithubContributions.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GithubContributions from './GithubContributions'

describe('GithubContributions', () => {
  it('shows a profile fallback when the contribution image fails', () => {
    render(<GithubContributions />)
    fireEvent.error(screen.getByAltText('Erkan GitHub contribution activity'))

    expect(screen.getByRole('link', { name: 'View GitHub activity' })).toHaveAttribute(
      'href',
      'https://github.com/erkanrzgc',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify the missing component failure**

Run:

```powershell
npm test -- src/components/GithubContributions.test.tsx
```

Expected: FAIL because `GithubContributions` does not exist.

- [ ] **Step 3: Implement the chart and textual fallback**

Create `src/components/GithubContributions.tsx`:

```tsx
import { useState } from 'react'
import { ArrowUpRight, Github } from 'lucide-react'

const PROFILE_URL = 'https://github.com/erkanrzgc'
const CHART_URL = 'https://ghchart.rshah.org/BBCCD7/erkanrzgc'

export default function GithubContributions() {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <section
      aria-labelledby="github-activity-title"
      className="mt-10 rounded-[28px] border border-[#D7E2EA]/20 bg-[#111519] p-5 sm:mt-14 sm:p-7"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3
          id="github-activity-title"
          className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#D7E2EA]"
        >
          <Github size={18} aria-hidden="true" /> GitHub Contributions
        </h3>
        <span className="font-mono text-xs text-[#D7E2EA]/45">erkanrzgc · live activity</span>
      </div>

      {imageFailed ? (
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/50 px-4 py-2 text-sm text-[#D7E2EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7E2EA]"
        >
          View GitHub activity <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      ) : (
        <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer">
          <img
            src={CHART_URL}
            alt="Erkan GitHub contribution activity"
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full rounded-xl opacity-90"
          />
        </a>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npm test -- src/components/GithubContributions.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Place contributions and the complete-profile link after the grid**

Import `GithubContributions` in `src/sections/ProjectsSection.tsx`. Immediately after the project grid, add:

```tsx
<GithubContributions />

<div className="mt-8 text-center">
  <a
    href="https://github.com/erkanrzgc?tab=repositories"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/55 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D7E2EA] transition-colors hover:bg-[#D7E2EA]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7E2EA]"
  >
    View all projects on GitHub <ArrowUpRight size={15} aria-hidden="true" />
  </a>
</div>
```

- [ ] **Step 6: Run all tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: all tests PASS and the production build succeeds.

- [ ] **Step 7: Commit the contribution section**

```powershell
git add src/components/GithubContributions.tsx src/components/GithubContributions.test.tsx src/sections/ProjectsSection.tsx
git commit -m "feat: add GitHub contribution showcase"
```

## Task 6: Final Responsive, Accessibility, and Failure Verification

**Files:**
- Modify only files identified by failures in Tasks 1–5.

- [ ] **Step 1: Run the complete automated verification suite**

Run:

```powershell
npm test
npm run build
```

Expected: all Vitest suites PASS and `tsc && vite build` exits successfully.

- [ ] **Step 2: Verify desktop and mobile presentation**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Inspect at 1280×720, 768×1024, and 390×844. Confirm:

- Globe remains behind hero copy/avatar and never creates horizontal overflow.
- Mobile uses the lower node/connection density.
- Project cards are two columns at 768 px and one column at 390 px.
- Eight projects appear in the approved order.
- Contribution chart appears after all project cards.
- Footer social links remain unchanged.

- [ ] **Step 3: Verify interaction and accessibility states**

Use keyboard-only navigation to confirm every GitHub, Live, profile, and View All link has a visible focus indicator and descriptive accessible name. Emulate reduced motion and confirm continuous globe animation stops. Confirm pointer parallax does not capture clicks or scrolling.

- [ ] **Step 4: Verify failure paths**

In DevTools:

- Block `api.github.com` and reload: eight local fallback cards remain in the same order and the status message appears.
- Block `ghchart.rshah.org`: the `View GitHub activity` fallback link appears.
- Disable WebGL or temporarily force `new THREE.WebGLRenderer` to throw: the existing hero remains readable and usable.

- [ ] **Step 5: Inspect console and resource cleanup**

Confirm no console errors, duplicate canvases, or growing animation callbacks appear after React Strict Mode mounts/unmounts the globe. Scroll the hero offscreen and verify GPU activity drops because the animation loop pauses.

- [ ] **Step 6: Commit any verification fixes**

If verification required changes:

```powershell
git add src package.json package-lock.json vite.config.ts
git commit -m "fix: polish Three.js portfolio showcase"
```

If no files changed, do not create an empty commit.
