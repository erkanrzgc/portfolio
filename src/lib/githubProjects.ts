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
const EXCLUDED_REPOS = new Set([GITHUB_USERNAME, 'ai-house'])

export const fallbackProjects: PortfolioProject[] = [
  {
    name: 'cyberm4fia-scanner',
    url: 'https://github.com/erkanrzgc/cyberm4fia-scanner',
    description:
      'AI-powered autonomous penetration testing framework for web, API, network, and cloud security workflows.',
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-26T22:38:07Z',
    homepage: null,
    imageUrl: getOpenGraphImage('cyberm4fia-scanner'),
  },
  {
    name: 'loadkit',
    url: 'https://github.com/erkanrzgc/loadkit',
    description:
      'Async multi-protocol load testing CLI with live metrics, exports, scenarios, and CI threshold checks.',
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-24T11:59:19Z',
    homepage: 'https://github.com/erkanrzgc/loadkit',
    imageUrl: getOpenGraphImage('loadkit'),
  },
  {
    name: 'reverse-engineering',
    url: 'https://github.com/erkanrzgc/reverse-engineering',
    description:
      'Rust-powered static reverse-engineering toolkit for binaries, control-flow analysis, and reporting.',
    language: 'Rust',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-24T10:35:48Z',
    homepage: null,
    imageUrl: getOpenGraphImage('reverse-engineering'),
  },
  {
    name: 'cyberm4fia-osint',
    url: 'https://github.com/erkanrzgc/cyberm4fia-osint',
    description:
      'Multi-source OSINT scanner for identity pivots, profile liveness scoring, and AI-assisted validation.',
    language: 'Python',
    stars: 0,
    forks: 1,
    isFork: false,
    updatedAt: '2026-05-24T09:42:44Z',
    homepage: 'https://github.com/erkanrzgc/cyberm4fia-osint',
    imageUrl: getOpenGraphImage('cyberm4fia-osint'),
  },
  {
    name: 'firewall',
    url: 'https://github.com/erkanrzgc/firewall',
    description: FALLBACK_DESCRIPTION,
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-23T13:14:10Z',
    homepage: null,
    imageUrl: getOpenGraphImage('firewall'),
  },
  {
    name: 'anti-virus',
    url: 'https://github.com/erkanrzgc/anti-virus',
    description: FALLBACK_DESCRIPTION,
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-23T13:13:50Z',
    homepage: null,
    imageUrl: getOpenGraphImage('anti-virus'),
  },
  {
    name: 'netmask',
    url: 'https://github.com/erkanrzgc/netmask',
    description: FALLBACK_DESCRIPTION,
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-23T13:13:03Z',
    homepage: null,
    imageUrl: getOpenGraphImage('netmask'),
  },
  {
    name: 'steganography',
    url: 'https://github.com/erkanrzgc/steganography',
    description:
      'Dual-purpose steganography toolkit for embedding, extraction, steganalysis, encryption, and carrier plug-ins.',
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-23T10:04:52Z',
    homepage: null,
    imageUrl: getOpenGraphImage('steganography'),
  },
  {
    name: 'spoofer',
    url: 'https://github.com/erkanrzgc/spoofer',
    description: FALLBACK_DESCRIPTION,
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-04T21:03:41Z',
    homepage: null,
    imageUrl: getOpenGraphImage('spoofer'),
  },
  {
    name: 'cyberm4fia-backdoor',
    url: 'https://github.com/erkanrzgc/cyberm4fia-backdoor',
    description: FALLBACK_DESCRIPTION,
    language: 'Python',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-05-03T17:58:49Z',
    homepage: null,
    imageUrl: getOpenGraphImage('cyberm4fia-backdoor'),
  },
  {
    name: 'tmux-for-windows',
    url: 'https://github.com/erkanrzgc/tmux-for-windows',
    description: FALLBACK_DESCRIPTION,
    language: 'JavaScript',
    stars: 0,
    forks: 0,
    isFork: false,
    updatedAt: '2026-04-08T09:43:36Z',
    homepage: null,
    imageUrl: getOpenGraphImage('tmux-for-windows'),
  },
]

export function getOpenGraphImage(repoName: string) {
  return `https://opengraph.githubassets.com/portfolio-${GITHUB_USERNAME}/${GITHUB_USERNAME}/${repoName}`
}

export function formatRepoName(name: string) {
  return name.replace(/-/g, ' ')
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

export function getDisplayRepos(repos: GithubRepo[]) {
  return repos
    .filter((repo) => !repo.private && !repo.fork && !EXCLUDED_REPOS.has(repo.name))
    .map(mapRepoToProject)
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
  return getDisplayRepos(repos)
}
