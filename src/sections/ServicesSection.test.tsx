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
  it('renders all services as a semantic asymmetric spotlight bento grid', () => {
    render(<ServicesSection />)

    const serviceList = screen.getByRole('list', {
      name: 'Services I provide',
    })
    expect(serviceList).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-6')

    const items = within(serviceList).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(items[0]).toHaveClass('lg:col-span-4', 'lg:row-span-2')
    items.slice(1).forEach((item) => {
      expect(item).toHaveClass('lg:col-span-2')
    })

    const articles = within(serviceList).getAllByRole('article')
    expect(articles).toHaveLength(6)
    expect(
      articles.map((article) => within(article).getByRole('heading').textContent),
    ).toEqual(serviceTitles)

    serviceDescriptions.forEach((description) => {
      expect(screen.getByText(description)).toBeVisible()
    })
    servicePoints.forEach((point) => {
      expect(screen.getByText(point)).toBeVisible()
    })

    items.forEach((item) => {
      expect(item).not.toHaveAttribute('tabindex')
    })
    articles.forEach((article) => {
      expect(article).not.toHaveAttribute('tabindex')
      expect(article).not.toHaveAttribute('role', 'button')
    })
  })
})
