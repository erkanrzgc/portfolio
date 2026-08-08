import { describe, expect, it } from 'vitest'

import {
  fallbackProjects,
  getDisplayRepos,
  type GithubRepo,
  type PortfolioProject,
} from './githubProjects'

const LEGACY_PROJECT_ORDER = [
  'steganography',
  'reverse-engineering',
  'cyberm4fia-scanner',
  'tmux-for-windows',
  'netmask',
  'spoofer',
  'loadkit',
  'cyberm4fia-osint',
  'wlan-dumper',
  'firewall',
  'anti-virus',
  'cyberm4fia-backdoor',
]

const LEGACY_FALLBACK_ORDER = [
  'cyberm4fia-scanner',
  'loadkit',
  'reverse-engineering',
  'cyberm4fia-osint',
  'wlan-dumper',
  'firewall',
  'anti-virus',
  'netmask',
  'steganography',
  'spoofer',
  'cyberm4fia-backdoor',
  'tmux-for-windows',
]

function createRepo(name: string, overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    name,
    html_url: `https://github.com/erkanrzgc/${name}`,
    description: `${name} description`,
    language: 'TypeScript',
    stargazers_count: 7,
    forks_count: 3,
    private: false,
    fork: false,
    updated_at: '2026-07-31T12:00:00Z',
    homepage: null,
    ...overrides,
  }
}

describe('getDisplayRepos', () => {
  it('keeps every eligible public repository, ranks legacy names first, then sorts unknown names by update time', () => {
    const projects = getDisplayRepos([
      createRepo('unknown-older', { updated_at: '2026-07-01T12:00:00Z' }),
      createRepo('firewall'),
      createRepo('unknown-newer', { updated_at: '2026-08-01T12:00:00Z' }),
      createRepo('steganography'),
      createRepo('loadkit'),
    ])

    expect(projects.map((project) => project.name)).toEqual([
      ...LEGACY_PROJECT_ORDER.filter((name) =>
        ['steganography', 'loadkit', 'firewall'].includes(name)
      ),
      'unknown-newer',
      'unknown-older',
    ])
  })

  it('excludes private, forked, profile, organization, and portfolio repositories', () => {
    const projects = getDisplayRepos([
      createRepo('unknown-public'),
      createRepo('private-repo', { private: true }),
      createRepo('forked-repo', { fork: true }),
      createRepo('erkanrzgc'),
      createRepo('ai-house'),
      createRepo('portfolio'),
    ])

    expect(projects.map((project) => project.name)).toEqual(['unknown-public'])
  })
})

describe('fallbackProjects', () => {
  it('uses the legacy fallback catalogue sequence', () => {
    const projects: PortfolioProject[] = fallbackProjects

    expect(projects.map((project) => project.name)).toEqual(LEGACY_FALLBACK_ORDER)
  })
})
