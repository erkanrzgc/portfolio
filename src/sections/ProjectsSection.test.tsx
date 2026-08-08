import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fallbackProjects,
  fetchGithubProjects,
  formatRepoName,
  sortProjects,
} from '../lib/githubProjects'
import ProjectsSection from './ProjectsSection'

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../lib/githubProjects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/githubProjects')>()

  return {
    ...actual,
    fetchGithubProjects: vi
      .fn()
      .mockResolvedValue(actual.sortProjects(actual.fallbackProjects)),
  }
})

beforeEach(() => {
  vi.mocked(fetchGithubProjects)
    .mockReset()
    .mockResolvedValue(sortProjects(fallbackProjects))
})

afterEach(cleanup)

describe('ProjectsSection', () => {
  it('renders all 12 projects as full-height sticky cards before contributions', async () => {
    const { container } = render(<ProjectsSection />)
    const expectedProjects = sortProjects(fallbackProjects)

    await waitFor(() => {
      const cards = [...container.querySelectorAll('article')]

      expect(cards).toHaveLength(12)
      expect(
        cards.map((card) =>
          within(card).getByRole('heading', { level: 3 }).textContent,
        ),
      ).toEqual(expectedProjects.map((project) => formatRepoName(project.name)))
    })

    const cards = [...container.querySelectorAll('article')]

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
