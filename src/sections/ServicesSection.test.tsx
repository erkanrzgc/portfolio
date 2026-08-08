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

const serviceDescriptions = [
  'Building practical software, polished interfaces, and product-minded systems with clean architecture and maintainable code.',
  'Creating practical security utilities for lab workflows, scanning, validation, reporting, and controlled testing environments.',
  'Turning repetitive technical work into scripts, dashboards, CLI tools, and small systems that reduce manual effort.',
  'Building focused tools around operating systems, networking, terminal workflows, diagnostics, and everyday engineering friction.',
  'Improving engineering work with clear tooling, useful defaults, documentation, integrations, and repeatable project structure.',
  'Helping shape ideas into scoped features, choose pragmatic implementation paths, and move from rough concept to polished user experience.',
]

const servicePoints = [
  'Product UI',
  'React/TypeScript',
  'Practical systems',
  'Security scanners',
  'Lab workflows',
  'Actionable reports',
  'CLI utilities',
  'Workflow scripts',
  'Data pipelines',
  'Network tools',
  'Terminal workflows',
  'Windows/Linux',
  'Internal tools',
  'Testing helpers',
  'Documentation',
  'Architecture choices',
  'Feature scoping',
  'Product polish',
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

    serviceDescriptions.forEach((description) => {
      expect(screen.getByText(description)).toBeVisible()
    })
    servicePoints.forEach((point) => {
      expect(screen.getByText(point)).toBeVisible()
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
