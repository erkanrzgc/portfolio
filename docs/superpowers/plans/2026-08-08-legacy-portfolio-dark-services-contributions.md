# Legacy Portfolio, Dark Services, and Contributions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the `c248614` pre-Three.js portfolio, keep the original Services layout in a black theme, and place the green GitHub Contributions panel after the complete sticky project stack.

**Architecture:** Restore legacy runtime files selectively from Git instead of resetting history. Preserve the current test harness and standalone Contributions component, port the old Hero/Services/Projects/data behavior behind focused regression tests, then delete runtime-only Three.js and spotlight modules once no imports remain. The main checkout's uncommitted `.octarine` deletions stay outside this worktree and must never be restored or staged here.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Vite, Vitest, Testing Library

---

## Working Context

- Worktree: `C:\Users\erkanrzgc\Desktop\portfolio\.worktrees\legacy-portfolio-dark-services`
- Branch: `feature/legacy-portfolio-dark-services`
- Legacy source commit: `c24861482c7830335115a05cb0df6ebe03fbace9`
- Approved design: `docs/superpowers/specs/2026-08-08-legacy-portfolio-dark-services-contributions-design.md`
- Never run `git reset`, switch the main checkout, or restore `.octarine`.

## File Responsibility Map

- `src/lib/githubProjects.ts`: legacy project list, ordering, filtering, mapping, and GitHub fetch.
- `src/lib/githubProjects.test.ts`: locks the legacy project contract and exclusion behavior.
- `src/components/Magnet.tsx`: desktop pointer attraction used only by the legacy hero avatar.
- `src/components/Magnet.test.tsx`: interaction and reset behavior for Magnet.
- `src/sections/HeroSection.tsx`: legacy navigation, heading, subtitle, and magnetic avatar.
- `src/sections/HeroSection.test.tsx`: legacy Hero structure and absence of orbital UI.
- `src/index.css`: only global styles and legacy mobile/reduced-motion avatar rules.
- `src/index.test.ts`: locks legacy avatar CSS and proves spotlight/orbital selectors are absent.
- `src/sections/ServicesSection.tsx`: original six service rows with black-only color treatment.
- `src/sections/ServicesSection.test.tsx`: locks content, row structure, dark theme, and absence of new card interactions.
- `src/sections/ProjectsSection.tsx`: original sticky project cards plus Contributions placement.
- `src/sections/ProjectsSection.test.tsx`: locks sticky behavior, fallback status, and DOM order.
- `src/components/GithubContributions.tsx`: current green chart component with intrinsic dimensions.
- `src/components/GithubContributions.test.tsx`: chart accessibility, dimensions, and failure fallback.
- `package.json` / `package-lock.json`: remove Three.js while retaining Vitest and Testing Library.
- Orbital/spotlight modules listed in Task 5: delete after their consumers are gone.

### Task 1: Restore the legacy project data contract

**Files:**
- Modify: `src/lib/githubProjects.test.ts`
- Modify: `src/lib/githubProjects.ts`

- [ ] **Step 1: Replace curated-grid tests with failing legacy-order tests**

Replace `src/lib/githubProjects.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'

import {
  fallbackProjects,
  getDisplayRepos,
  sortProjects,
  type GithubRepo,
  type PortfolioProject,
} from './githubProjects'

const LEGACY_PROJECT_ORDER = [
  'steganography',
  'reverse-engineering',
  'cyberm4fia-scanner',
  'tmux-for-windows',
  'netmask',
  'spoofer',
  'loadkit',
  'cyberm4fia-osint',
  'wlan-dumper',
  'firewall',
  'anti-virus',
  'cyberm4fia-backdoor',
]

function createRepo(name: string, overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    name,
    html_url: `https://github.com/erkanrzgc/${name}`,
    description: `${name} live description`,
    language: 'TypeScript',
    stargazers_count: 7,
    forks_count: 3,
    private: false,
    fork: false,
    updated_at: '2026-07-31T12:00:00Z',
    homepage: null,
    ...overrides,
  }
}

function project(name: string, updatedAt: string): PortfolioProject {
  return {
    name,
    url: `https://github.com/erkanrzgc/${name}`,
    description: name,
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt,
    homepage: null,
    imageUrl: `https://example.test/${name}.png`,
  }
}

describe('legacy GitHub project selection', () => {
  it('keeps every eligible public repository and applies the legacy rank first', () => {
    const projects = getDisplayRepos([
      createRepo('unlisted-newer', { updated_at: '2026-08-02T00:00:00Z' }),
      createRepo('loadkit'),
      createRepo('steganography'),
      createRepo('unlisted-older', { updated_at: '2026-08-01T00:00:00Z' }),
    ])

    expect(projects.map(({ name }) => name)).toEqual([
      'steganography',
      'loadkit',
      'unlisted-newer',
      'unlisted-older',
    ])
  })

  it('excludes private, forked, profile, ai-house, and portfolio repositories', () => {
    const projects = getDisplayRepos([
      createRepo('public-tool'),
      createRepo('private-tool', { private: true }),
      createRepo('forked-tool', { fork: true }),
      createRepo('erkanrzgc'),
      createRepo('ai-house'),
      createRepo('portfolio'),
    ])

    expect(projects.map(({ name }) => name)).toEqual(['public-tool'])
  })

  it('uses update time only after both names fall outside the legacy rank', () => {
    expect(
      sortProjects([
        project('older', '2026-01-01T00:00:00Z'),
        project('newer', '2026-02-01T00:00:00Z'),
      ]).map(({ name }) => name),
    ).toEqual(['newer', 'older'])
  })
})

describe('legacy fallback projects', () => {
  it('contains the complete original sticky-card sequence', () => {
    expect(fallbackProjects.map(({ name }) => name)).toEqual([
      'cyberm4fia-scanner',
      'loadkit',
      'reverse-engineering',
      'cyberm4fia-osint',
      'wlan-dumper',
      'firewall',
      'anti-virus',
      'netmask',
      'steganography',
      'spoofer',
      'cyberm4fia-backdoor',
      'tmux-for-windows',
    ])
    expect(new Set(LEGACY_PROJECT_ORDER)).toEqual(
      new Set(fallbackProjects.map(({ name }) => name)),
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify the curated implementation fails**

Run:

```powershell
npm test -- --run src/lib/githubProjects.test.ts
```

Expected: FAIL because the current implementation filters unlisted repositories and exports the newer eight-project fallback list.

- [ ] **Step 3: Restore the exact legacy project module**

Use this command only to read the canonical file:

```powershell
git show c248614:src/lib/githubProjects.ts
```

Replace `src/lib/githubProjects.ts` with that exact output using `apply_patch`. The resulting implementation must contain:

```ts
const EXCLUDED_REPOS = new Set([GITHUB_USERNAME, 'ai-house', 'portfolio'])

const PROJECT_ORDER = [
  'steganography',
  'reverse-engineering',
  'cyberm4fia-scanner',
  'tmux-for-windows',
  'netmask',
  'spoofer',
  'loadkit',
  'cyberm4fia-osint',
  'wlan-dumper',
  'firewall',
  'anti-virus',
  'cyberm4fia-backdoor',
]

export function getDisplayRepos(repos: GithubRepo[]) {
  const projects = repos
    .filter((repo) => !repo.private && !repo.fork && !EXCLUDED_REPOS.has(repo.name))
    .map(mapRepoToProject)

  return sortProjects(projects)
}

export async function fetchGithubProjects() {
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`,
    { headers: { Accept: 'application/vnd.github+json' } },
  )

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`)
  }

  return getDisplayRepos((await response.json()) as GithubRepo[])
}
```

Do not retain `CURATED_PROJECT_NAMES`, `curatedProjectNames`, or `mergeWithFallback`.

Temporarily retain the existing tested `formatUpdatedAt` export because the current compact `ProjectsSection` still imports it. Keep its three existing tests (invalid date, valid ISO date, and UTC calendar day) until Task 4 restores the legacy Projects component; Task 4 must then remove both this compatibility export and those three tests.

- [ ] **Step 4: Run the project-data tests and build**

Run:

```powershell
npm test -- --run src/lib/githubProjects.test.ts
npm run build
```

Expected: the focused test passes and the production build succeeds.

- [ ] **Step 5: Commit the project-data restoration**

```powershell
git add src/lib/githubProjects.ts src/lib/githubProjects.test.ts
git commit -m "feat: restore legacy project catalogue"
```

### Task 2: Restore the magnetic legacy hero and its CSS

**Files:**
- Create: `src/components/Magnet.tsx`
- Create: `src/components/Magnet.test.tsx`
- Modify: `src/sections/HeroSection.tsx`
- Modify: `src/sections/HeroSection.test.tsx`
- Modify: `src/index.css`
- Modify: `src/index.test.ts`

- [ ] **Step 1: Write failing Magnet, Hero, and legacy CSS tests**

Create `src/components/Magnet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Magnet from './Magnet'

afterEach(cleanup)

describe('Magnet', () => {
  it('moves toward the pointer and resets when the pointer leaves', () => {
    render(<Magnet padding={100} strength={2}>avatar</Magnet>)
    const magnet = screen.getByText('avatar')
    Object.defineProperty(magnet, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    })

    fireEvent.mouseMove(magnet, { clientX: 70, clientY: 90 })
    expect(magnet).toHaveStyle({ transform: 'translate3d(10px, 20px, 0px)' })

    fireEvent.mouseLeave(magnet)
    expect(magnet).toHaveStyle({ transform: 'translate3d(0px, 0px, 0px)' })
  })
})
```

Replace `src/sections/HeroSection.test.tsx` with:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeroSection from './HeroSection'

afterEach(cleanup)

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('HeroSection', () => {
  it('renders the legacy magnetic avatar without an orbital scene', () => {
    const { container } = render(<HeroSection />)
    const avatar = screen.getByRole('img', { name: 'Erkan avatar' })

    expect(avatar).toHaveAttribute('src', '/images/avatar-transparent.png')
    expect(avatar).toHaveAttribute('loading', 'eager')
    expect(avatar.closest('.hero-avatar-float')).not.toBeNull()
    expect(avatar.closest('.hero-avatar-magnet')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('[data-avatar-fallback]')).toBeNull()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "Hi, i'm erkan" })).toBeInTheDocument()
  })
})
```

Replace `src/index.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import './index.css'

function nestedRules(condition: string): CSSStyleRule[] {
  const media = Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText === condition,
    )

  return Array.from(media?.cssRules ?? []).filter(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule,
  )
}

describe('legacy avatar styles', () => {
  it('animates the avatar only for coarse or non-hover pointers', () => {
    const rule = nestedRules('(hover: none), (pointer: coarse)').find(
      ({ selectorText }) => selectorText === '.hero-avatar-float',
    )

    expect(rule?.style.getPropertyValue('animation')).toContain('mobile-avatar-float')
  })

  it('disables the avatar animation for reduced motion', () => {
    const rule = nestedRules('(prefers-reduced-motion: reduce)').find(
      ({ selectorText }) => selectorText === '.hero-avatar-float',
    )

    expect(rule?.style.getPropertyValue('animation')).toBe('none')
  })

  it('does not ship orbital or spotlight selectors', () => {
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n')

    expect(css).not.toContain('hero-orbital-avatar')
    expect(css).not.toContain('spotlight-card')
    expect(css).not.toContain('service-orbit')
  })
})
```

- [ ] **Step 2: Run the focused tests and verify the legacy contracts fail**

```powershell
npm test -- --run src/components/Magnet.test.tsx src/sections/HeroSection.test.tsx src/index.test.ts
```

Expected: FAIL because `Magnet.tsx` is absent, Hero renders `OrbitalAvatar`, and current CSS contains orbital/spotlight selectors.

- [ ] **Step 3: Restore Magnet, Hero, and global CSS from `c248614`**

Read the three canonical files:

```powershell
git show c248614:src/components/Magnet.tsx
git show c248614:src/sections/HeroSection.tsx
git show c248614:src/index.css
```

Use `apply_patch` to create/replace the files with the exact outputs. The Hero must import `Magnet`, render one eager image inside `.hero-avatar-float`, and contain no `OrbitalAvatar`, readiness state, canvas host, or fallback state.

- [ ] **Step 4: Run the focused tests and production build**

```powershell
npm test -- --run src/components/Magnet.test.tsx src/sections/HeroSection.test.tsx src/index.test.ts
npm run build
```

Expected: all focused tests pass and build succeeds while unused orbital files still exist but have no runtime consumer.

- [ ] **Step 5: Commit the legacy hero**

```powershell
git add src/components/Magnet.tsx src/components/Magnet.test.tsx src/sections/HeroSection.tsx src/sections/HeroSection.test.tsx src/index.css src/index.test.ts
git commit -m "feat: restore magnetic legacy hero"
```

### Task 3: Restore the original Services rows with a black theme

**Files:**
- Modify: `src/sections/ServicesSection.tsx`
- Modify: `src/sections/ServicesSection.test.tsx`

- [ ] **Step 1: Replace bento tests with failing dark-row tests**

Replace `src/sections/ServicesSection.test.tsx` with:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServicesSection from './ServicesSection'

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

afterEach(cleanup)

const serviceTitles = [
  'Software & Product Engineering',
  'Cybersecurity Tooling',
  'Automation Systems',
  'Systems & Network Utilities',
  'Developer Experience',
  'Technical Direction',
]

describe('ServicesSection', () => {
  it('keeps the six original rows on the black portfolio surface', () => {
    const { container } = render(<ServicesSection />)
    const section = container.querySelector('#services')
    const headings = screen.getAllByRole('heading', { level: 3 })

    expect(section).toHaveClass('bg-[#0C0C0C]')
    expect(section).not.toHaveClass('bg-white')
    expect(headings.map(({ textContent }) => textContent)).toEqual(serviceTitles)
    headings.forEach((heading) => {
      expect(heading).toHaveClass('text-[#D7E2EA]')
      expect(heading.closest('.group')).toHaveClass('border-t')
    })
  })

  it('adds no card, orbit, map, terminal, or fake-control treatment', () => {
    const { container } = render(<ServicesSection />)

    expect(container.querySelector('.spotlight-card')).toBeNull()
    expect(container.querySelector('[data-service-orbit]')).toBeNull()
    expect(container.querySelectorAll('article')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test and verify the spotlight implementation fails**

```powershell
npm test -- --run src/sections/ServicesSection.test.tsx
```

Expected: FAIL because the current section is a light spotlight bento grid.

- [ ] **Step 3: Restore legacy markup and apply only the approved color inversion**

Read the canonical markup:

```powershell
git show c248614:src/sections/ServicesSection.tsx
```

Use `apply_patch` to replace the current component with that structure, then apply exactly these class changes:

```tsx
<section
  id="services"
  className="rounded-t-[40px] bg-[#0C0C0C] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
>
```

```tsx
<h2 className="hero-heading text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none">
  Services
</h2>
<p className="mx-auto mt-6 max-w-2xl text-center text-base font-light leading-relaxed text-[#D7E2EA]/65 sm:text-lg">
```

Use these exact row classes:

```tsx
<div className="group flex flex-col gap-4 border-t border-[#D7E2EA]/15 py-8 transition-colors hover:border-[#D7E2EA]/45 sm:flex-row sm:items-start sm:gap-8 sm:py-10 md:py-12">
  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[#D7E2EA]/20 bg-[#111519] text-[#D7E2EA] transition-transform duration-300 group-hover:translate-x-1 sm:h-20 sm:w-20">
```

Use `text-[#D7E2EA]` for service names, `text-[#D7E2EA]/65` for descriptions, and `border-[#D7E2EA]/20 text-[#D7E2EA]/55` for point tags. Do not import or render `SpotlightCard`, orbit metadata, buttons, maps, or terminal UI.

- [ ] **Step 4: Run focused tests and build**

```powershell
npm test -- --run src/sections/ServicesSection.test.tsx src/index.test.ts
npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 5: Commit the dark legacy Services section**

```powershell
git add src/sections/ServicesSection.tsx src/sections/ServicesSection.test.tsx
git commit -m "feat: restore dark legacy services"
```

### Task 4: Restore sticky project cards and place Contributions after the stack

**Files:**
- Modify: `src/sections/ProjectsSection.tsx`
- Modify: `src/sections/ProjectsSection.test.tsx`
- Modify: `src/components/GithubContributions.tsx`
- Modify: `src/components/GithubContributions.test.tsx`
- Modify: `src/lib/githubProjects.ts`
- Modify: `src/lib/githubProjects.test.ts`

- [ ] **Step 1: Write failing sticky-layout and intrinsic-chart tests**

Replace `src/sections/ProjectsSection.test.tsx` with:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackProjects, fetchGithubProjects } from '../lib/githubProjects'
import ProjectsSection from './ProjectsSection'

afterEach(cleanup)

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../lib/githubProjects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/githubProjects')>()
  return {
    ...actual,
    fetchGithubProjects: vi.fn().mockResolvedValue(actual.fallbackProjects),
  }
})

describe('ProjectsSection', () => {
  it('renders legacy sticky cards followed by Contributions', () => {
    const { container } = render(<ProjectsSection />)
    const projectsSection = container.querySelector('#projects')
    const cards = Array.from(projectsSection?.querySelectorAll('article') ?? [])
    const wrappers = cards.map((card) => card.parentElement)
    const contributionTitle = screen.getByRole('heading', {
      name: 'GitHub Contributions',
    })

    expect(cards).toHaveLength(fallbackProjects.length)
    expect(cards).toHaveLength(12)
    wrappers.forEach((wrapper, index) => {
      expect(wrapper).toHaveClass('h-[82vh]', 'min-h-[560px]')
      expect(wrapper).toHaveStyle({
        position: 'sticky',
        top: `${16 + Math.min(index, 5) * 6}px`,
      })
    })
    expect(
      cards[cards.length - 1]?.compareDocumentPosition(contributionTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(projectsSection?.querySelector('.md\\:grid-cols-2')).toBeNull()
  })

  it('announces an API failure while retaining the complete fallback stack', async () => {
    vi.mocked(fetchGithubProjects).mockRejectedValueOnce(new Error('offline'))
    const { container } = render(<ProjectsSection />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'GitHub could not be reached, so the portfolio is showing a local fallback list.',
    )
    expect(container.querySelectorAll('#projects article')).toHaveLength(12)
  })
})
```

In `src/components/GithubContributions.test.tsx`, add these assertions to the first test after the lazy-loading assertion:

```ts
expect(image).toHaveAttribute('width', '663')
expect(image).toHaveAttribute('height', '104')
expect(image).toHaveClass('h-auto', 'w-full')
```

- [ ] **Step 2: Run focused tests and verify current compact cards fail**

```powershell
npm test -- --run src/sections/ProjectsSection.test.tsx src/components/GithubContributions.test.tsx
```

Expected: FAIL because Projects is currently a compact eight-card grid and the chart lacks intrinsic dimensions.

- [ ] **Step 3: Restore the legacy Projects component and add Contributions once**

Read the canonical component:

```powershell
git show c248614:src/sections/ProjectsSection.tsx
```

Use `apply_patch` to restore that exact component, then make only these additions:

```tsx
import GithubContributions from '../components/GithubContributions'
```

Add `role="status"` to the existing GitHub failure paragraph without changing its visual classes. After the closing `</div>` for the complete sticky-card stack, add:

```tsx
<GithubContributions />
```

The result must keep `ProjectCard`, `useScroll`, `useTransform`, `h-[82vh]`, and the per-index sticky top. It must not contain the compact-grid list, `formatUpdatedAt`, or the later “View all projects” footer link.

- [ ] **Step 4: Add intrinsic chart dimensions**

Update the existing chart image in `src/components/GithubContributions.tsx`:

```tsx
<img
  src={CHART_URL}
  alt="Erkan GitHub contribution activity"
  width="663"
  height="104"
  loading="lazy"
  onError={() => setImageFailed(true)}
  className="h-auto w-full rounded-xl opacity-90"
/>
```

- [ ] **Step 5: Remove the temporary date-format compatibility shim**

After the legacy `ProjectsSection` no longer imports `formatUpdatedAt`, remove the export from `src/lib/githubProjects.ts` and remove its three focused tests from `src/lib/githubProjects.test.ts`. Confirm no production or test import remains:

```powershell
rg -n "formatUpdatedAt" src
```

Expected: no matches.

- [ ] **Step 6: Run focused tests and build**

```powershell
npm test -- --run src/sections/ProjectsSection.test.tsx src/components/GithubContributions.test.tsx src/lib/githubProjects.test.ts
npm run build
```

Expected: all focused tests pass and build succeeds.

- [ ] **Step 7: Commit Projects and Contributions**

```powershell
git add src/sections/ProjectsSection.tsx src/sections/ProjectsSection.test.tsx src/components/GithubContributions.tsx src/components/GithubContributions.test.tsx src/lib/githubProjects.ts src/lib/githubProjects.test.ts
git commit -m "feat: restore sticky projects with contributions"
```

### Task 5: Remove obsolete Three.js and spotlight runtime code

**Files:**
- Delete: `src/components/OrbitalAvatar.tsx`
- Delete: `src/components/OrbitalAvatar.test.tsx`
- Delete: `src/components/SpotlightCard.tsx`
- Delete: `src/components/SpotlightCard.test.tsx`
- Delete: `src/components/orbitalAvatarGeometry.ts`
- Delete: `src/components/orbitalAvatarGeometry.test.ts`
- Delete: `src/components/orbitalAvatarMotion.ts`
- Delete: `src/components/orbitalAvatarMotion.test.ts`
- Delete: `src/components/orbitalGlow.ts`
- Delete: `src/components/orbitalGlow.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Prove the restored runtime has no obsolete imports**

Run:

```powershell
rg -n "OrbitalAvatar|SpotlightCard|orbitalAvatar|orbitalGlow|service-orbit|spotlight-card|from 'three'|import\('three'\)" src -g '!*.test.ts' -g '!*.test.tsx'
```

Expected before deletion: matches only in the obsolete implementation files themselves; no Hero, Services, Projects, App, or global CSS match.

- [ ] **Step 2: Delete obsolete modules with `apply_patch`**

Delete all ten files listed in this task. Do not delete `GithubContributions`, `FadeIn`, `AnimatedText`, `ContactButton`, or the restored `Magnet`.

- [ ] **Step 3: Remove Three.js packages while retaining the test harness**

Run:

```powershell
npm uninstall three @types/three
```

Verify `package.json` still contains:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "jsdom": "^29.1.1",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 4: Verify no obsolete runtime or dependency reference remains**

```powershell
rg -n "OrbitalAvatar|SpotlightCard|orbitalAvatar|orbitalGlow|service-orbit|spotlight-card|from 'three'|import\('three'\)" src -g '!*.test.ts' -g '!*.test.tsx'
rg -n '\"three\"|@types/three' package.json package-lock.json
```

Expected: no matches. Negative CSS assertions inside test files are intentionally excluded from the runtime-source search.

- [ ] **Step 5: Run the full automated verification**

```powershell
npm test -- --run
npm run build
git diff --check
```

Expected: every remaining test file passes, build exits 0, and `git diff --check` prints no errors. A Vite chunk-size warning is not expected after removing Three.js.

- [ ] **Step 6: Commit obsolete-code removal**

```powershell
git add package.json package-lock.json src/components
git commit -m "chore: remove orbital portfolio runtime"
```

### Task 6: Perform final desktop/mobile and repository verification

**Files:**
- Verify only; modify a scoped implementation/test file only if a reproduced defect requires it.

- [ ] **Step 1: Confirm the feature branch is isolated and the main checkout still owns `.octarine` deletions**

```powershell
git status --short --branch
git -C C:\Users\erkanrzgc\Desktop\portfolio status --short --branch
```

Expected: feature worktree is clean after its commits; main is ahead only by its design commits and still shows exactly the three `.octarine` deletions.

- [ ] **Step 2: Run final tests, build, and whitespace validation from the feature worktree**

```powershell
npm test -- --run
npm run build
git diff --check main...HEAD
```

Expected: tests and build exit 0; diff check is clean.

- [ ] **Step 3: Start a local preview for visual QA**

```powershell
npm run dev -- --host 127.0.0.1
```

Use the Browser skill to inspect the emitted local URL at desktop and mobile widths.

- [ ] **Step 4: Verify the approved desktop behavior**

At approximately `1440×900`, confirm:

- legacy magnetic avatar is visible with no canvas/orbits;
- Services uses the original six full-width rows on black;
- no service cards, maps, terminal UI, orbit decorations, or spotlight glow appear;
- twelve legacy sticky project cards stack correctly;
- one green Contributions panel appears after the final project card;
- footer follows Contributions and external links work.

- [ ] **Step 5: Verify mobile and reduced-motion behavior**

At approximately `390×844`, confirm:

- no horizontal overflow;
- avatar uses its CSS float rather than pointer-only behavior;
- service icon/content rows stack cleanly;
- sticky project cards remain readable;
- contribution chart stays within the viewport.

Emulate or enable reduced motion and confirm the avatar float and FadeIn motion are disabled.

- [ ] **Step 6: Verify the Contributions failure fallback**

Temporarily block or intercept `https://ghchart.rshah.org/39d353/erkanrzgc` in the local browser session. Confirm the chart is replaced by the accessible “View GitHub activity” link and that project cards remain visible. Do not commit any interception code.

- [ ] **Step 7: Record final evidence and hand off to branch completion**

Capture the final commands, pass counts, build result, visual QA result, branch name, commit list, and remaining uncommitted `.octarine` deletions. Then invoke `superpowers:finishing-a-development-branch`; do not merge, push, deploy, or stage `.octarine` without a fresh explicit user instruction.
