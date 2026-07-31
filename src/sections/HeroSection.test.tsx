import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HeroSection from './HeroSection'

afterEach(cleanup)

vi.mock('../components/FadeIn', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../components/OrbitalAvatar', () => ({
  default: ({
    onReady,
    onUnavailable,
  }: {
    onReady?: () => void
    onUnavailable?: () => void
  }) => (
    <>
      <button data-testid="orbital-ready" onClick={onReady} type="button">
        Orbital avatar ready
      </button>
      <button
        data-testid="orbital-unavailable"
        onClick={onUnavailable}
        type="button"
      >
        Orbital avatar unavailable
      </button>
    </>
  ),
}))

describe('HeroSection', () => {
  it('keeps accessible avatar text while fading the visual fallback after scene readiness', () => {
    render(<HeroSection />)
    const avatar = screen.getByRole('img', { name: 'Erkan avatar' })
    const fallback = avatar.closest('[data-avatar-fallback]')
    expect(fallback).toHaveClass('opacity-100')
    expect(fallback).toHaveAttribute('data-state', 'loading')
    fireEvent.click(screen.getByTestId('orbital-ready'))
    expect(screen.getByRole('img', { name: 'Erkan avatar' })).toBeInTheDocument()
    expect(fallback).toHaveClass('opacity-0')
    expect(fallback).toHaveAttribute('data-state', 'ready')

    fireEvent.click(screen.getByTestId('orbital-unavailable'))
    expect(screen.getByRole('img', { name: 'Erkan avatar' })).toBeInTheDocument()
    expect(fallback).toHaveClass('opacity-100')
    expect(fallback).toHaveAttribute('data-state', 'loading')
  })

  it('renders one eager avatar fallback alongside the existing hero content', () => {
    render(<HeroSection />)

    expect(screen.getAllByTestId('orbital-ready')).toHaveLength(1)
    const avatar = screen.getByRole('img', { name: 'Erkan avatar' })
    const fallback = avatar.closest('[data-avatar-fallback]')
    const fallbackMotion = fallback?.querySelector(
      '[data-avatar-fallback-motion]',
    )
    expect(fallback).toHaveClass(
      'absolute',
      'aspect-square',
      'left-1/2',
      'top-1/2',
      'w-[min(52vw,430px)]',
      '-translate-x-1/2',
      '-translate-y-1/2',
    )
    expect(fallback).not.toHaveClass('hero-avatar-fallback-motion')
    expect(fallbackMotion).toHaveClass('hero-avatar-fallback-motion')
    expect(fallbackMotion).toContainElement(avatar)
    expect(avatar).toHaveClass('w-full', 'object-contain')
    expect(avatar).toHaveAttribute(
      'src',
      '/images/avatar-transparent.png',
    )
    expect(avatar).toHaveAttribute(
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
