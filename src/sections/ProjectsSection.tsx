import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, GitFork, Github, Star } from 'lucide-react'
import FadeIn from '../components/FadeIn'
import {
  fallbackProjects,
  fetchGithubProjects,
  formatRepoName,
  type PortfolioProject,
} from '../lib/githubProjects'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function ProjectCard({
  project,
  index,
  totalCards,
}: {
  project: PortfolioProject
  index: number
  totalCards: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start start'],
  })
  const targetScale = 1 - (totalCards - 1 - index) * 0.012
  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale])

  return (
    <div
      ref={cardRef}
      className="h-[82vh] min-h-[560px] lg:min-h-[600px]"
      style={{ position: 'sticky', top: `${16 + Math.min(index, 5) * 6}px` }}
    >
      <motion.article
        style={{ scale }}
        className="group flex h-full flex-col overflow-hidden rounded-[36px] border-2 border-[#D7E2EA]/80 bg-[#0C0C0C] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.22)] sm:rounded-[46px] sm:p-6 lg:flex-row lg:gap-6 lg:p-8"
      >
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-[1.9/1] overflow-hidden rounded-[28px] bg-[#F4F6F8] sm:rounded-[36px] lg:w-[44%] lg:shrink-0 lg:self-start"
          aria-label={`${project.name} GitHub repository`}
        >
          <img
            src={project.imageUrl}
            alt=""
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </a>

        <div className="flex flex-1 flex-col justify-between pt-6 lg:pt-0">
          <div>
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D7E2EA]/55">
                  {project.language}
                </p>
                <h3 className="max-w-[18ch] text-[clamp(1.6rem,3vw,3.4rem)] font-black uppercase leading-none text-[#D7E2EA] sm:max-w-[22ch]">
                  {formatRepoName(project.name)}
                </h3>
              </div>

              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D7E2EA]/35 text-[#D7E2EA] sm:flex">
                <Github size={22} />
              </span>
            </div>

            <p className="max-w-2xl text-[clamp(0.95rem,1.7vw,1.25rem)] font-light leading-relaxed text-[#D7E2EA]/80">
              {project.description}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#D7E2EA]/60">
              <span>Updated {formatDate(project.updatedAt)}</span>
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} />
                {project.stars}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GitFork size={14} />
                {project.forks}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#D7E2EA] transition-colors hover:bg-[#D7E2EA]/10"
              >
                GitHub
                <ArrowUpRight size={15} />
              </a>
              {project.homepage && project.homepage !== project.url && (
                <a
                  href={project.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#D7E2EA] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C0C0C] transition-colors hover:bg-white"
                >
                  Live
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </div>
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
          <div className="mb-12 max-w-2xl sm:mb-16 md:mb-20">
            <div>
              <h2 className="hero-heading text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none tracking-tight">
                Projects
              </h2>
              <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-[#D7E2EA]/65 sm:text-lg">
                Public, original GitHub repositories are pulled in automatically.
                Forks, private work, and hidden profile repos stay out of this list.
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

        <div className="relative">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.name}
              project={project}
              index={index}
              totalCards={projects.length}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
