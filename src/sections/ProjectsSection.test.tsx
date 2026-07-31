import { cleanup, render, screen, within } from '@testing-library/react'
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
  it('renders the curated projects as a compact, accessible two-column grid', () => {
    render(<ProjectsSection />)

    const projectList = screen.getByRole('list')
    expect(projectList).toHaveClass('grid', 'md:grid-cols-2')

    const cards = within(projectList).getAllByRole('listitem')
    expect(cards).toHaveLength(8)
    expect(
      cards.map((card) =>
        within(card).getByRole('heading').textContent?.toLowerCase()
      )
    ).toEqual([
      'vibeprint',
      'octopus',
      'autonomous scanner',
      'firewall',
      'reverse engineering',
      'steganography',
      'loadkit',
      'open source intelligence',
    ])

    const vibeprintCard = cards[0]
    expect(vibeprintCard.tagName).toBe('ARTICLE')
    expect(within(vibeprintCard).getByText('0 stars')).toBeInTheDocument()
    expect(
      within(vibeprintCard).getByText('Updated Jul 31, 2026')
    ).toBeInTheDocument()

    const githubLink = within(vibeprintCard).getByRole('link', {
      name: 'Open vibeprint on GitHub',
    })
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/erkanrzgc/vibeprint'
    )
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')

    const liveLink = within(vibeprintCard).getByRole('link', {
      name: 'Open the live vibeprint project',
    })
    expect(liveLink).toHaveAttribute(
      'href',
      'https://erkanrzgc.github.io/vibeprint/'
    )
    expect(liveLink).toHaveAttribute('target', '_blank')
    expect(liveLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(vibeprintCard.closest('a')).toBeNull()

    const firewallCard = cards[3]
    expect(
      within(firewallCard).getByRole('link', {
        name: 'Open firewall on GitHub',
      })
    ).toBeInTheDocument()
    expect(
      within(firewallCard).queryByRole('link', { name: /open the live/i })
    ).not.toBeInTheDocument()

    const contributionTitle = screen.getByRole('heading', {
      name: 'GitHub Contributions',
    })
    const viewAllLink = screen.getByRole('link', {
      name: 'View all projects on GitHub',
    })
    expect(viewAllLink).toHaveAttribute(
      'href',
      'https://github.com/erkanrzgc?tab=repositories'
    )
    expect(viewAllLink).toHaveAttribute('target', '_blank')
    expect(viewAllLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(
      projectList.compareDocumentPosition(contributionTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      contributionTitle.compareDocumentPosition(viewAllLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('keeps the curated fallback order and reports a GitHub API failure', async () => {
    vi.mocked(fetchGithubProjects).mockRejectedValueOnce(
      new Error('GitHub API unavailable'),
    )

    render(<ProjectsSection />)

    expect(
      await screen.findByText(
        'GitHub could not be reached, so the portfolio is showing a local fallback list.',
      ),
    ).toBeInTheDocument()

    const cards = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(cards).toHaveLength(8)
    expect(
      cards.map((card) =>
        within(card).getByRole('heading').textContent?.toLowerCase(),
      ),
    ).toEqual(fallbackProjects.map((project) => formatName(project.name)))
  })
})

function formatName(name: string) {
  return name.replace(/-/g, ' ')
}
