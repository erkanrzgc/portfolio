import {
  Code2,
  Compass,
  Network,
  ShieldCheck,
  Wrench,
  Workflow,
} from 'lucide-react'
import FadeIn from '../components/FadeIn'

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

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="rounded-t-[40px] bg-[#0C0C0C] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <FadeIn delay={0} y={40}>
        <div className="mx-auto mb-16 max-w-5xl sm:mb-20 md:mb-28">
          <h2 className="hero-heading text-center text-[clamp(3rem,12vw,160px)] font-black uppercase leading-none">
            Services
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base font-light leading-relaxed text-[#D7E2EA]/65 sm:text-lg">
            I build practical software, cybersecurity-minded tools, automation
            systems, and polished interfaces with a balance of speed, clarity,
            and technical care.
          </p>
        </div>
      </FadeIn>

      <div className="mx-auto flex max-w-5xl flex-col">
        {services.map((s, i) => (
          <FadeIn key={s.name} delay={i * 0.1} y={30}>
            <div className="group flex flex-col gap-4 border-t border-[#D7E2EA]/15 py-8 transition-colors hover:border-[#D7E2EA]/45 sm:flex-row sm:items-start sm:gap-8 sm:py-10 md:py-12">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[#D7E2EA]/20 bg-[#111519] text-[#D7E2EA] transition-transform duration-300 group-hover:translate-x-1 sm:h-20 sm:w-20">
                <s.icon size={28} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col gap-2 sm:pt-4">
                <h3 className="text-[clamp(1.1rem,2.2vw,2.1rem)] font-semibold uppercase tracking-[0.03em] text-[#D7E2EA]">
                  {s.name}
                </h3>
                <p className="max-w-2xl text-[clamp(0.9rem,1.6vw,1.25rem)] font-light leading-relaxed text-[#D7E2EA]/65">
                  {s.desc}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.points.map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-[#D7E2EA]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#D7E2EA]/55"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
