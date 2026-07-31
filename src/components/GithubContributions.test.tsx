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
