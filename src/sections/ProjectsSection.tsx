import { useEffect, useState } from 'react'
import { ArrowUpRight, Github, Star } from 'lucide-react'
import FadeIn from '../components/FadeIn'
import {
  fallbackProjects,
  fetchGithubProjects,
  formatRepoName,
  formatUpdatedAt,
  type PortfolioProject,
} from '../lib/githubProjects'

const languageColors: Record<string, string> = {
  Go: '#00ADD8',
  JavaScript: '#F1E05A',
  Python: '#3572A5',
  Rust: '#DEA584',
  TypeScript: '#3178C6',
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  const formattedName = formatRepoName(project.name)

  return (
    <article
      role="listitem"
      className="group flex min-h-[300px] flex-col rounded-[28px] border border-[#8FA5B5]/25 bg-[#111519] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#8FA5B5]/55 sm:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-[#D7E2EA]/55">erkanrzgc/</p>
        <Github aria-hidden="true" size={21} className="text-[#D7E2EA]/70" />
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-black uppercase leading-tight text-[#D7E2EA] sm:text-3xl">
          {formattedName}
        </h3>
        <p className="mt-4 text-base font-light leading-relaxed text-[#D7E2EA]/70">
          {project.description}
        </p>
      </div>

      <div className="mt-auto pt-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#D7E2EA]/55">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: languageColors[project.language] ?? '#8FA5B5' }}
            />
            {project.language}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star aria-hidden="true" size={14} />
            {project.stars}
          </span>
          <span>{formatUpdatedAt(project.updatedAt)}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${formattedName} on GitHub`}
            className="inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D7E2EA] transition-colors hover:border-[#D7E2EA] hover:bg-[#D7E2EA]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7E2EA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111519]"
          >
            GitHub
            <ArrowUpRight aria-hidden="true" size={14} />
          </a>
          {project.homepage && project.homepage !== project.url && (
            <a
              href={project.homepage}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the live ${formattedName} project`}
              className="inline-flex items-center gap-2 rounded-full bg-[#D7E2EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#111519] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111519]"
            >
              Live
              <ArrowUpRight aria-hidden="true" size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState<PortfolioProject[]>(fallbackProjects)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    fetchGithubProjects()
      .then((githubProjects) => {
        if (cancelled) return
        setProjects(githubProjects.length > 0 ? githubProjects : fallbackProjects)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setProjects(fallbackProjects)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section
      id="projects"
      className="relative z-10 -mt-10 rounded-t-[40px] bg-[#0C0C0C] px-5 py-20 sm:-mt-12 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:-mt-14 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <FadeIn delay={0} y={40}>
          <div className="mb-12 w-full sm:mb-16 md:mb-20">
            <div>
              <h2 className="hero-heading w-full whitespace-nowrap text-[4.3rem] font-black uppercase leading-none tracking-tight sm:text-[6rem] md:text-[8rem] lg:text-[9rem] xl:text-[10rem]">
                Projects
              </h2>
              <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-[#D7E2EA]/65 sm:text-lg">
                A curated selection of public tools, experiments, and engineering
                projects I have built across software, automation, and cybersecurity.
              </p>
            </div>
          </div>
        </FadeIn>

        {status === 'error' && (
          <p className="mb-8 max-w-2xl rounded-[20px] border border-[#D7E2EA]/20 bg-[#D7E2EA]/5 px-5 py-4 text-sm text-[#D7E2EA]/70">
            GitHub could not be reached, so the portfolio is showing a local
            fallback list.
          </p>
        )}

        <div role="list" className="grid gap-5 md:grid-cols-2 lg:gap-7">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}
