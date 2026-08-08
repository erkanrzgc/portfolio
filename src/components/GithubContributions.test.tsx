import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GithubContributions from './GithubContributions'

afterEach(cleanup)

describe('GithubContributions', () => {
  it('links the lazily loaded contribution chart to the GitHub profile', () => {
    render(<GithubContributions />)

    const image = screen.getByRole('img', {
      name: 'Erkan GitHub contribution activity',
    })
    expect(image).toHaveAttribute(
      'src',
      'https://ghchart.rshah.org/39d353/erkanrzgc'
    )
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width', '663')
    expect(image).toHaveAttribute('height', '104')
    expect(image).toHaveClass('h-auto', 'w-full')

    const profileLink = image.closest('a')
    expect(profileLink).toHaveAttribute('href', 'https://github.com/erkanrzgc')
    expect(profileLink).toHaveAttribute('target', '_blank')
    expect(profileLink).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getByText('erkanrzgc · live activity')).toHaveClass(
      'text-[#7EE787]'
    )

    expect(
      screen
        .getByRole('heading', { name: 'GitHub Contributions' })
        .closest('section')
    ).toHaveClass('border-[#39D353]/25')

    const contributionSection = screen
      .getByRole('heading', { name: 'GitHub Contributions' })
      .closest('section')
    const githubIcon = contributionSection?.querySelector('svg.lucide-github')
    expect(githubIcon).toHaveClass('text-[#7EE787]')
    expect(githubIcon).not.toHaveClass('text-[#7EE787]/70')
  })

  it('replaces a broken chart with an accessible profile link', () => {
    render(<GithubContributions />)

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Erkan GitHub contribution activity',
      })
    )

    expect(
      screen.queryByRole('img', {
        name: 'Erkan GitHub contribution activity',
      })
    ).not.toBeInTheDocument()

    const fallbackLink = screen.getByRole('link', {
      name: 'View GitHub activity',
    })
    expect(fallbackLink).toHaveAttribute('href', 'https://github.com/erkanrzgc')
    expect(fallbackLink).toHaveAttribute('target', '_blank')
    expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
