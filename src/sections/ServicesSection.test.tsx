import { cleanup, render, screen, within } from '@testing-library/react'
import type { ElementType, ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ServicesSection from './ServicesSection'

vi.mock('../components/FadeIn', () => ({
  default: ({
    as: Component = 'div',
    children,
    className,
  }: {
    as?: ElementType
    children: ReactNode
    className?: string
  }) => <Component className={className}>{children}</Component>,
}))

afterEach(cleanup)

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }))
})

const serviceTitles = [
  'Software & Product Engineering',
  'Cybersecurity Tooling',
  'Automation Systems',
  'Systems & Network Utilities',
  'Developer Experience',
  'Technical Direction',
]

describe('ServicesSection', () => {
  it('renders the six legacy services as simple bordered rows in their original order', () => {
    render(<ServicesSection />)

    const headings = screen.getAllByRole('heading', { level: 3 })

    expect(headings.map((heading) => heading.textContent)).toEqual(
      serviceTitles,
    )
    headings.forEach((heading) => {
      expect(heading).toHaveClass('text-[#D7E2EA]')

      const row = heading.closest('.group')
      expect(row).not.toBeNull()
      expect(row).toHaveClass('group', 'border-t')
    })
  })

  it('uses the black portfolio palette without card or control markup', () => {
    const { container } = render(<ServicesSection />)
    const section = container.querySelector('#services')

    expect(section).toHaveClass('bg-[#0C0C0C]')
    expect(section).not.toHaveClass('bg-white')
    expect(container.querySelectorAll('.spotlight-card')).toHaveLength(0)
    expect(container.querySelectorAll('[data-service-orbit]')).toHaveLength(0)
    expect(within(section as HTMLElement).queryAllByRole('article')).toHaveLength(
      0,
    )
    expect(within(section as HTMLElement).queryAllByRole('button')).toHaveLength(
      0,
    )
  })
})
