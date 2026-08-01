import {
  Code2,
  Compass,
  Network,
  ShieldCheck,
  Wrench,
  Workflow,
} from 'lucide-react'
import FadeIn from '../components/FadeIn'
import SpotlightCard from '../components/SpotlightCard'

const services = [
  {
    icon: Code2,
    name: 'Software & Product Engineering',
    desc: 'Building practical software, polished interfaces, and product-minded systems with clean architecture and maintainable code.',
    points: ['Product UI', 'React/TypeScript', 'Practical systems'],
  },
  {
    icon: ShieldCheck,
    name: 'Cybersecurity Tooling',
    desc: 'Creating practical security utilities for lab workflows, scanning, validation, reporting, and controlled testing environments.',
    points: ['Security scanners', 'Lab workflows', 'Actionable reports'],
  },
  {
    icon: Workflow,
    name: 'Automation Systems',
    desc: 'Turning repetitive technical work into scripts, dashboards, CLI tools, and small systems that reduce manual effort.',
    points: ['CLI utilities', 'Workflow scripts', 'Data pipelines'],
  },
  {
    icon: Network,
    name: 'Systems & Network Utilities',
    desc: 'Building focused tools around operating systems, networking, terminal workflows, diagnostics, and everyday engineering friction.',
    points: ['Network tools', 'Terminal workflows', 'Windows/Linux'],
  },
  {
    icon: Wrench,
    name: 'Developer Experience',
    desc: 'Improving engineering work with clear tooling, useful defaults, documentation, integrations, and repeatable project structure.',
    points: ['Internal tools', 'Testing helpers', 'Documentation'],
  },
  {
    icon: Compass,
    name: 'Technical Direction',
    desc: 'Helping shape ideas into scoped features, choose pragmatic implementation paths, and move from rough concept to polished user experience.',
    points: ['Architecture choices', 'Feature scoping', 'Product polish'],
  },
]

const cardSpans = [
  'lg:col-span-4 lg:row-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-2',
]

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="rounded-t-[40px] bg-white px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <FadeIn delay={0} y={40}>
        <div className="mx-auto mb-16 max-w-5xl sm:mb-20 md:mb-28">
          <h2 className="text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none text-[#0C0C0C]">
            Services
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base font-light leading-relaxed text-[#0C0C0C]/65 sm:text-lg">
            I build practical software, cybersecurity-minded tools, automation
            systems, and polished interfaces with a balance of speed, clarity,
            and technical care.
          </p>
        </div>
      </FadeIn>

      <ul
        aria-label="Services I provide"
        className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]"
      >
        {services.map((s, i) => (
          <FadeIn
            key={s.name}
            as="li"
            delay={i * 0.1}
            y={30}
            className={cardSpans[i]}
          >
            <SpotlightCard
              className={`spotlight-card--light h-full overflow-hidden rounded-[28px] border border-[#2c1856]/20 bg-[linear-gradient(135deg,#ffffff_0%,#f7f2ff_58%,#eee6ff_100%)] shadow-[0_18px_45px_rgba(44,24,86,0.1)] ${
                i === 0 ? 'p-8 sm:p-10 lg:p-12' : 'p-6 sm:p-7'
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-6">
                  <span className="text-sm font-semibold tracking-[0.18em] text-[#2c1856]/55">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-2xl border border-[#2c1856]/15 bg-white/75 text-[#2c1856] ${
                      i === 0 ? 'h-20 w-20' : 'h-14 w-14'
                    }`}
                  >
                    <s.icon
                      aria-hidden="true"
                      size={i === 0 ? 36 : 26}
                      strokeWidth={1.8}
                    />
                  </span>
                </div>
                <div className={i === 0 ? 'mt-auto pt-14' : 'mt-10'}>
                  <h3
                    className={`font-semibold uppercase leading-[0.95] tracking-[0.02em] text-[#0C0C0C] ${
                      i === 0
                        ? 'text-[clamp(2rem,4vw,4.5rem)]'
                        : 'text-[clamp(1.3rem,2vw,2rem)]'
                    }`}
                  >
                    {s.name}
                  </h3>
                  <p
                    className={`font-light leading-relaxed text-[#0C0C0C]/65 ${
                      i === 0 ? 'mt-5 max-w-2xl text-lg' : 'mt-4 text-base'
                    }`}
                  >
                    {s.desc}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-full border border-[#2c1856]/15 bg-white/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#2c1856]/70"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </FadeIn>
        ))}
      </ul>
    </section>
  )
}
