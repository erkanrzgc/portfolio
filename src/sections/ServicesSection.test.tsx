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
    articles.forEach((article) => {
      expect(article).toHaveClass('spotlight-card--light')
    })
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

  it('hides decorative service icons from the accessibility tree', () => {
    render(<ServicesSection />)

    const serviceList = screen.getByRole('list', {
      name: 'Services I provide',
    })
    const icons = within(serviceList)
      .getAllByRole('article')
      .map((article) => article.querySelector('svg'))

    expect(icons).toHaveLength(6)
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('adds one inaccessible orbital decoration to every service card', () => {
    render(<ServicesSection />)
    const articles = screen.getAllByRole('article')
    const decorations = articles.map((article) =>
      article.querySelector<HTMLElement>('[data-service-orbit]'),
    )

    expect(decorations).toHaveLength(6)
    expect(decorations.every(Boolean)).toBe(true)
    expect(
      decorations.map((decoration) => decoration?.dataset.orbitVariant),
    ).toEqual(['featured', 'sweep', 'halo', 'cross', 'rise', 'echo'])
    expect(
      decorations.map((decoration) => decoration?.dataset.orbitAccent),
    ).toEqual(['purple', 'blue', 'purple', 'purple', 'green', 'purple'])
    expect(
      articles.map((article, index) => [
        within(article).getByRole('heading').textContent,
        decorations[index]?.dataset.orbitVariant,
      ]),
    ).toEqual([
      ['Software & Product Engineering', 'featured'],
      ['Cybersecurity Tooling', 'sweep'],
      ['Automation Systems', 'halo'],
      ['Systems & Network Utilities', 'cross'],
      ['Developer Experience', 'rise'],
      ['Technical Direction', 'echo'],
    ])
    decorations.forEach((decoration, index) => {
      expect(decoration?.parentElement).toBe(articles[index])
      expect(articles[index].firstElementChild).toBe(decoration)
      expect(decoration).toHaveAttribute('aria-hidden', 'true')
      expect(decoration).not.toHaveAttribute('role')
      expect(decoration).not.toHaveAttribute('tabindex')
      expect(decoration?.querySelectorAll('.service-orbit__node')).toHaveLength(
        1,
      )
      expect(
        decoration?.querySelectorAll('.service-orbit__track'),
      ).toHaveLength(index === 0 ? 2 : 1)
    })
  })

  it('keeps service content above decoration without adding fake controls', () => {
    render(<ServicesSection />)

    screen.getAllByRole('article').forEach((article) => {
      expect(article.querySelector('.service-card__content')).not.toBeNull()
      expect(article).not.toHaveAttribute('tabindex')
      expect(article).not.toHaveAttribute('role', 'button')
    })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
