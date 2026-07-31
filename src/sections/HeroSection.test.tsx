import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeroSection from './HeroSection'

afterEach(cleanup)

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../components/OrbitalAvatar', () => ({
  default: ({ onReady }: { onReady?: () => void }) => (
    <button data-testid="orbital-ready" onClick={onReady} type="button">
      Orbital avatar
    </button>
  ),
}))

describe('HeroSection', () => {
  it('keeps accessible avatar text while fading the visual fallback after scene readiness', () => {
    render(<HeroSection />)
    const avatar = screen.getByRole('img', { name: 'Erkan avatar' })
    const fallback = avatar.closest('[data-avatar-fallback]')
    expect(fallback).toHaveClass('opacity-100')
    fireEvent.click(screen.getByTestId('orbital-ready'))
    expect(screen.getByRole('img', { name: 'Erkan avatar' })).toBeInTheDocument()
    expect(fallback).toHaveClass('opacity-0')
  })

  it('renders one eager avatar fallback alongside the existing hero content', () => {
    render(<HeroSection />)

    expect(screen.getAllByTestId('orbital-ready')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Erkan avatar' })).toHaveAttribute(
      'src',
      '/images/avatar-transparent.png',
    )
    expect(screen.getByRole('img', { name: 'Erkan avatar' })).toHaveAttribute(
      'loading',
      'eager',
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: "Hi, i'm erkan" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Software Engineer & Cybersecurity Enthusiast'),
    ).toBeInTheDocument()
  })
})
