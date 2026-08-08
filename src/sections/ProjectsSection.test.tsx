import { cleanup, render, screen, within } from '@testing-library/react'
import { useReducedMotion } from 'framer-motion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fallbackProjects,
  fetchGithubProjects,
  formatRepoName,
  sortProjects,
  type PortfolioProject,
} from '../lib/githubProjects'
import ProjectsSection, {
  getProjectCardTargetScale,
} from './ProjectsSection'

const motionTestState = vi.hoisted(() => ({
  outputRanges: [] as Array<readonly number[]>,
}))

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()

  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
    useScroll: vi.fn(() => ({ scrollYProgress: 0 })),
    useTransform: vi.fn(
      (
        _input: unknown,
        _inputRange: readonly number[],
        _outputRange: readonly number[],
      ) => {
        motionTestState.outputRanges.push(_outputRange)
        return 1
      },
    ),
  }
})

vi.mock('../lib/githubProjects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/githubProjects')>()

  return {
    ...actual,
    fetchGithubProjects: vi.fn(),
  }
})

beforeEach(() => {
  vi.mocked(fetchGithubProjects).mockReset().mockResolvedValue(createLiveProjects())
  vi.mocked(useReducedMotion).mockReset().mockReturnValue(false)
  motionTestState.outputRanges.length = 0
})

afterEach(cleanup)

describe('getProjectCardTargetScale', () => {
  it('preserves the legacy first-card scale for the 12-card stack', () => {
    expect(getProjectCardTargetScale(12, 0, false)).toBeCloseTo(0.868, 12)
  })

  it('clamps the first-card scale for a 100-card API response', () => {
    expect(getProjectCardTargetScale(100, 0, false)).toBe(0.85)
  })

  it('returns exactly one when reduced motion is requested', () => {
    expect(getProjectCardTargetScale(100, 0, true)).toBe(1)
  })
})

describe('ProjectsSection', () => {
  it('renders settled API projects as 12 full-height sticky cards before contributions', async () => {
    const { container } = render(<ProjectsSection />)
    const expectedProjects = await waitForLiveProjects(container)
    const cards = [...container.querySelectorAll('article')]

    expect(cards).toHaveLength(12)
    expect(
      cards.map((card) =>
        within(card).getByRole('heading', { level: 3 }).textContent,
      ),
    ).toEqual(expectedProjects.map((project) => formatRepoName(project.name)))

    cards.forEach((card, index) => {
      const stickyWrapper = card.parentElement

      expect(stickyWrapper).toHaveClass('h-[82vh]', 'min-h-[560px]')
      expect(stickyWrapper).toHaveStyle({
        position: 'sticky',
        top: `${16 + Math.min(index, 5) * 6}px`,
      })
    })

    const contributionTitle = screen.getByRole('heading', {
      name: 'GitHub Contributions',
    })
    const finalCard = cards[cards.length - 1]

    expect(finalCard).toBeDefined()
    expect(
      finalCard!.compareDocumentPosition(contributionTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const projectsSection = screen
      .getByRole('heading', { name: 'Projects' })
      .closest('section')

    expect(projectsSection).not.toBeNull()
    expect(
      projectsSection!.querySelector('[class~="md:grid-cols-2"]'),
    ).toBeNull()
  })

  it('targets scale one for every card when reduced motion is requested', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    const { container } = render(<ProjectsSection />)

    await waitForLiveProjects(container)

    expect(useReducedMotion).toHaveBeenCalled()
    expect(motionTestState.outputRanges.length).toBeGreaterThanOrEqual(12)
    expect(
      motionTestState.outputRanges.every((outputRange) => outputRange[1] === 1),
    ).toBe(true)
  })

  it('provides focus-visible rings and offsets for every project link style', async () => {
    const { container } = render(<ProjectsSection />)
    await waitForLiveProjects(container)

    const firstCard = container.querySelector<HTMLElement>('article')

    expect(firstCard).not.toBeNull()
    const [previewLink, githubLink, liveLink] = within(firstCard!).getAllByRole('link')

    expect(previewLink).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-[#20262D]',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-[#F4F6F8]',
    )
    for (const actionLink of [githubLink, liveLink]) {
      expect(actionLink).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-[#D7E2EA]',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[#0C0C0C]',
      )
    }
  })

  it('exposes exactly one project heading per article', async () => {
    const { container } = render(<ProjectsSection />)
    await waitForLiveProjects(container)

    for (const card of container.querySelectorAll('article')) {
      expect(within(card).getAllByRole('heading')).toHaveLength(1)
      expect(within(card).getByRole('heading', { level: 3 })).toBeInTheDocument()
    }
  })

  it('gives preview, GitHub, and live links distinct project-specific names', async () => {
    const { container } = render(<ProjectsSection />)
    const liveProjects = await waitForLiveProjects(container)
    const firstCard = container.querySelector<HTMLElement>('article')
    const projectName = formatRepoName(liveProjects[0].name)

    expect(firstCard).not.toBeNull()
    expect(
      within(firstCard!).getByRole('link', {
        name: `Preview ${projectName} repository on GitHub`,
      }),
    ).toBeInTheDocument()
    expect(
      within(firstCard!).getByRole('link', {
        name: `Open ${projectName} on GitHub`,
      }),
    ).toBeInTheDocument()
    expect(
      within(firstCard!).getByRole('link', {
        name: `Open live ${projectName} project`,
      }),
    ).toBeInTheDocument()
  })

  it('retains all 12 fallback cards and reports a GitHub API failure', async () => {
    vi.mocked(fetchGithubProjects).mockRejectedValueOnce(
      new Error('GitHub API unavailable'),
    )

    const { container } = render(<ProjectsSection />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      /^GitHub could not be reached, so the portfolio is showing a local fallback list\.$/,
    )
    expect(container.querySelectorAll('article')).toHaveLength(12)
  })
})

function createLiveProjects(): PortfolioProject[] {
  return sortProjects(fallbackProjects).map((project, index) => ({
    ...project,
    description: `Live API ${project.description}`,
    homepage:
      index === 0 ? 'https://example.test/steganography' : project.homepage,
  }))
}

async function waitForLiveProjects(container: HTMLElement) {
  const liveProjects = createLiveProjects()
  const firstCard = container.querySelector<HTMLElement>('article')

  expect(firstCard).not.toBeNull()
  expect(
    await within(firstCard!).findAllByText(liveProjects[0].description),
  ).toHaveLength(2)

  return liveProjects
}
