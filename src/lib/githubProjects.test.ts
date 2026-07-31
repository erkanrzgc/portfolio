import { describe, expect, it } from 'vitest'

import {
  CURATED_PROJECT_NAMES,
  formatUpdatedAt,
  getDisplayRepos,
  mergeWithFallback,
  type GithubRepo,
} from './githubProjects'

function createRepo(name: string, overrides: Partial<GithubRepo> = {}): GithubRepo {
  return {
    name,
    html_url: `https://github.com/erkanrzgc/${name}`,
    description: `${name} live description`,
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
  it('returns only present curated repositories in curated order', () => {
    const projects = getDisplayRepos([
      createRepo('loadkit'),
      createRepo('unlisted-tool'),
      createRepo('vibeprint'),
      createRepo('firewall'),
    ])

    expect(projects.map((project) => project.name)).toEqual([
      'vibeprint',
      'firewall',
      'loadkit',
    ])
  })

  it('excludes private, forked, profile, portfolio, and unlisted repositories', () => {
    const projects = getDisplayRepos([
      createRepo('vibeprint'),
      createRepo('octopus', { private: true }),
      createRepo('firewall', { fork: true }),
      createRepo('erkanrzgc'),
      createRepo('portfolio'),
      createRepo('unlisted-tool'),
    ])

    expect(projects.map((project) => project.name)).toEqual(['vibeprint'])
  })
})

describe('mergeWithFallback', () => {
  it('fills missing projects while preserving live values and curated order', () => {
    const liveProjects = getDisplayRepos([
      createRepo('firewall', {
        description: 'Live firewall description',
        stargazers_count: 42,
      }),
      createRepo('vibeprint', {
        description: 'Live vibeprint description',
        homepage: 'https://live.example/vibeprint',
      }),
    ])

    const projects = mergeWithFallback(liveProjects)

    expect(projects.map((project) => project.name)).toEqual([...CURATED_PROJECT_NAMES])
    expect(projects).toHaveLength(8)
    expect(projects.find((project) => project.name === 'firewall')).toMatchObject({
      description: 'Live firewall description',
      stars: 42,
    })
    expect(projects.find((project) => project.name === 'vibeprint')).toMatchObject({
      description: 'Live vibeprint description',
      homepage: 'https://live.example/vibeprint',
    })
    expect(projects.find((project) => project.name === 'octopus')).toMatchObject({
      language: 'Python',
      url: 'https://github.com/erkanrzgc/octopus',
    })
  })
})

describe('formatUpdatedAt', () => {
  it('returns a fallback label for an invalid date', () => {
    expect(formatUpdatedAt('not-a-date')).toBe('Recently updated')
  })

  it('formats a valid ISO date without relying on a timezone-fragile day', () => {
    const formatted = formatUpdatedAt('2026-07-31T11:49:02Z')

    expect(formatted).toContain('Jul')
    expect(formatted).toContain('2026')
    expect(formatted).not.toBe('Recently updated')
  })
})
