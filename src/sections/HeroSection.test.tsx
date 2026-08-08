import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeroSection from './HeroSection'

afterEach(cleanup)

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../components/OrbitalAvatar', () => ({
  default: () => (
    <canvas className="hero-orbital-avatar" data-testid="orbital-avatar" />
  ),
}))

describe('HeroSection', () => {
  it('renders the eager legacy avatar inside the float and magnet wrappers', () => {
    render(<HeroSection />)

    const avatar = screen.getByRole('img', { name: 'Erkan avatar' })
    const floatWrapper = avatar.closest('.hero-avatar-float')
    const magnetWrapper = avatar.closest('.hero-avatar-magnet')

    expect(avatar).toHaveAttribute('src', '/images/avatar-transparent.png')
    expect(avatar).toHaveAttribute('loading', 'eager')
    expect(floatWrapper).not.toBeNull()
    expect(magnetWrapper).not.toBeNull()
    expect(magnetWrapper).toContainElement(floatWrapper as HTMLElement)
    expect(floatWrapper).toContainElement(avatar)
  })

  it('retains the navigation and legacy hero copy', () => {
    render(<HeroSection />)

    const navigation = screen.getByRole('navigation')
    const expectedLinks = [
      ['About', '#about'],
      ['Services', '#services'],
      ['Projects', '#projects'],
      ['Contact', '#contact'],
    ]

    expectedLinks.forEach(([name, href]) => {
      expect(within(navigation).getByRole('link', { name })).toHaveAttribute(
        'href',
        href,
      )
    })
    expect(
      screen.getByRole('heading', { name: "Hi, i'm erkan" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Software Engineer & Cybersecurity Enthusiast'),
    ).toBeInTheDocument()
  })

  it('does not render the orbital canvas or its fallback state', () => {
    const { container } = render(<HeroSection />)

    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    expect(container.querySelector('.hero-orbital-avatar')).not.toBeInTheDocument()
    expect(container.querySelector('[data-avatar-fallback]')).not.toBeInTheDocument()
    expect(screen.queryByTestId('orbital-avatar')).not.toBeInTheDocument()
  })
})
