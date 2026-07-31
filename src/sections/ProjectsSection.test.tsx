import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProjectsSection from './ProjectsSection'
import { fallbackProjects, formatRepoName } from '../lib/githubProjects'

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
    ).toEqual(
      fallbackProjects.map((project) => formatRepoName(project.name))
    )

    const vibeprintCard = cards[0]
    expect(vibeprintCard.tagName).toBe('ARTICLE')
    expect(
      within(vibeprintCard).getByRole('link', {
        name: 'Open vibeprint on GitHub',
      })
    ).toBeInTheDocument()
    expect(
      within(vibeprintCard).getByRole('link', {
        name: 'Open the live vibeprint project',
      })
    ).toBeInTheDocument()
    expect(vibeprintCard.closest('a')).toBeNull()
  })
})
