export interface GithubRepo {
  name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  private: boolean
  fork: boolean
  updated_at: string
  homepage: string | null
}

export interface PortfolioProject {
  name: string
  url: string
  description: string
  language: string
  stars: number
  forks: number
  isFork: boolean
  updatedAt: string
  homepage: string | null
  imageUrl: string
}

const FALLBACK_DESCRIPTION =
  'Public GitHub project focused on practical software, security tooling, and engineering experiments.'

export const GITHUB_USERNAME = 'erkanrzgc'
const EXCLUDED_REPOS = new Set([GITHUB_USERNAME, 'ai-house', 'portfolio'])

export const CURATED_PROJECT_NAMES = [
  'vibeprint',
  'octopus',
  'autonomous-scanner',
  'firewall',
  'reverse-engineering',
  'steganography',
  'loadkit',
  'open-source-intelligence',
] as const

const curatedProjectNames = new Set<string>(CURATED_PROJECT_NAMES)
const projectRank: ReadonlyMap<string, number> = new Map(
  CURATED_PROJECT_NAMES.map((name, index) => [name, index])
)

export const fallbackProjects: PortfolioProject[] = [
  {
    name: 'vibeprint',
    url: 'https://github.com/erkanrzgc/vibeprint',
    description:
      'Chrome MV3 extension that detects AI-built websites and identifies visual builders using calibrated fingerprints.',
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-07-31T11:49:02Z',
    homepage: 'https://erkanrzgc.github.io/vibeprint/',
    imageUrl: getOpenGraphImage('vibeprint'),
  },
  {
    name: 'octopus',
    url: 'https://github.com/erkanrzgc/octopus',
    description:
      'Agentic cybersecurity LLM for red-team, blue-team, and network workflows with authorized tool use.',
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-07-30T18:34:30Z',
    homepage: 'https://huggingface.co/erkanrzgcc/octopus-gemma-v0.8.1',
    imageUrl: getOpenGraphImage('octopus'),
  },
  {
    name: 'autonomous-scanner',
    url: 'https://github.com/erkanrzgc/autonomous-scanner',
    description:
      'AI-powered autonomous penetration testing framework for web, API, network, and cloud security workflows.',
    language: 'Python',
    stars: 1,
    forks: 1,
    isFork: false,
    updatedAt: '2026-07-25T17:23:53Z',
    homepage: null,
    imageUrl: getOpenGraphImage('autonomous-scanner'),
  },
  {
    name: 'firewall',
    url: 'https://github.com/erkanrzgc/firewall',
    description:
      'Auditable policy-driven host firewall for Linux and Windows, built in Go and local by default.',
    language: 'Go',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-07-31T12:46:15Z',
    homepage: null,
    imageUrl: getOpenGraphImage('firewall'),
  },
  {
    name: 'reverse-engineering',
    url: 'https://github.com/erkanrzgc/reverse-engineering',
    description:
      'Rust-powered static reverse-engineering toolkit for ELF, PE, and Mach-O binaries.',
    language: 'Rust',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-24T10:35:48Z',
    homepage: null,
    imageUrl: getOpenGraphImage('reverse-engineering'),
  },
  {
    name: 'steganography',
    url: 'https://github.com/erkanrzgc/steganography',
    description:
      'Steganography toolkit for embedding, extraction, steganalysis, encryption, and carrier plug-ins.',
    language: 'Python',
    stars: 2,
    forks: 0,
    isFork: false,
    updatedAt: '2026-07-14T10:38:02Z',
    homepage: null,
    imageUrl: getOpenGraphImage('steganography'),
  },
  {
    name: 'loadkit',
    url: 'https://github.com/erkanrzgc/loadkit',
    description:
      'Async multi-protocol load testing CLI with live metrics, exports, scenarios, and CI thresholds.',
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-24T11:59:19Z',
    homepage: null,
    imageUrl: getOpenGraphImage('loadkit'),
  },
  {
    name: 'open-source-intelligence',
    url: 'https://github.com/erkanrzgc/open-source-intelligence',
    description:
      'Multi-source OSINT scanner with profile validation, soft-404 detection, and AI-assisted identity checks.',
    language: 'Python',
    stars: 1,
    forks: 0,
    isFork: false,
    updatedAt: '2026-07-26T11:42:26Z',
    homepage: null,
    imageUrl: getOpenGraphImage('open-source-intelligence'),
  },
]

export function getOpenGraphImage(repoName: string) {
  return `https://opengraph.githubassets.com/portfolio-${GITHUB_USERNAME}/${GITHUB_USERNAME}/${repoName}`
}

export function formatRepoName(name: string) {
  return name.replace(/-/g, ' ')
}

export function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt)

  if (Number.isNaN(date.getTime())) {
    return 'Recently updated'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function mapRepoToProject(repo: GithubRepo): PortfolioProject {
  return {
    name: repo.name,
    url: repo.html_url,
    description: repo.description?.trim() || FALLBACK_DESCRIPTION,
    language: repo.language || 'Code',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    isFork: repo.fork,
    updatedAt: repo.updated_at,
    homepage: repo.homepage,
    imageUrl: getOpenGraphImage(repo.name),
  }
}

export function sortProjects(projects: PortfolioProject[]) {
  return [...projects].sort((a, b) => {
    const aRank = projectRank.get(a.name) ?? Number.MAX_SAFE_INTEGER
    const bRank = projectRank.get(b.name) ?? Number.MAX_SAFE_INTEGER

    if (aRank !== bRank) {
      return aRank - bRank
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function getDisplayRepos(repos: GithubRepo[]) {
  const projects = repos
    .filter(
      (repo) =>
        !repo.private &&
        !repo.fork &&
        !EXCLUDED_REPOS.has(repo.name) &&
        curatedProjectNames.has(repo.name)
    )
    .map(mapRepoToProject)

  return sortProjects(projects)
}

export function mergeWithFallback(projects: PortfolioProject[]) {
  const liveProjects = new Map(projects.map((project) => [project.name, project]))

  return fallbackProjects.map((fallbackProject) => liveProjects.get(fallbackProject.name) ?? fallbackProject)
}

export async function fetchGithubProjects() {
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=owner`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`)
  }

  const repos = (await response.json()) as GithubRepo[]
  return mergeWithFallback(getDisplayRepos(repos))
}
