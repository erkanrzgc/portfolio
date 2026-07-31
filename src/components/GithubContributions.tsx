import { useState } from 'react'
import { ArrowUpRight, Github } from 'lucide-react'

const PROFILE_URL = 'https://github.com/erkanrzgc'
const CHART_URL = 'https://ghchart.rshah.org/39d353/erkanrzgc'

export default function GithubContributions() {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <section
      aria-labelledby="github-activity-title"
      className="mt-10 rounded-[28px] border border-[#39D353]/25 bg-[#111519] p-5 sm:mt-12 sm:p-7 md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Github aria-hidden="true" size={22} className="text-[#7EE787]/70" />
          <h3
            id="github-activity-title"
            className="text-xl font-bold text-[#D7E2EA] sm:text-2xl"
          >
            GitHub Contributions
          </h3>
        </div>
        <p className="font-mono text-xs text-[#7EE787] sm:text-sm">
          erkanrzgc · live activity
        </p>
      </div>

      <div className="mt-6">
        {imageFailed ? (
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#39D353]/45 px-5 py-3 text-sm font-semibold text-[#D7E2EA] transition-colors hover:border-[#7EE787] hover:bg-[#39D353]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39D353] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111519]"
          >
            View GitHub activity
            <ArrowUpRight aria-hidden="true" size={16} />
          </a>
        ) : (
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39D353] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111519]"
          >
            <img
              src={CHART_URL}
              alt="Erkan GitHub contribution activity"
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-auto w-full rounded-xl opacity-90"
            />
          </a>
        )}
      </div>
    </section>
  )
}
