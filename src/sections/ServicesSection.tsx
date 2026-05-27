import FadeIn from '../components/FadeIn'

const services = [
  {
    num: '01',
    name: 'Product Engineering',
    desc: 'Designing and building practical web products with clean interfaces, reliable architecture, and maintainable code from idea to working release.',
  },
  {
    num: '02',
    name: 'Automation Systems',
    desc: 'Turning repetitive workflows into focused tools, scripts, dashboards, and command-line utilities that save time and reduce manual effort.',
  },
  {
    num: '03',
    name: 'Cybersecurity Foundations',
    desc: 'Adding threat-aware thinking to applications through secure defaults, validation, access control, monitoring, and practical hardening.',
  },
  {
    num: '04',
    name: 'Developer Tooling',
    desc: 'Creating internal tools, testing helpers, integrations, and utilities that make engineering work faster, clearer, and easier to repeat.',
  },
  {
    num: '05',
    name: 'Technical Direction',
    desc: 'Helping shape features, choose implementation paths, simplify complex requirements, and move from rough concept to polished user experience.',
  },
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
            I help build useful software, clean tools, cybersecurity-minded
            workflows, and thoughtful technical systems with a practical balance
            of speed, clarity, and care.
          </p>
        </div>
      </FadeIn>

      <div className="mx-auto flex max-w-5xl flex-col">
        {services.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.1} y={30}>
            <div
              className="group flex flex-col gap-4 border-t border-[rgba(12,12,12,0.16)] py-8 transition-colors hover:border-[#0C0C0C] sm:flex-row sm:items-start sm:gap-8 sm:py-10 md:py-12"
            >
              <span className="shrink-0 text-[clamp(3rem,10vw,140px)] font-black leading-none text-[#0C0C0C] transition-transform duration-300 group-hover:translate-x-1">
                {s.num}
              </span>
              <div className="flex flex-col gap-2 sm:pt-4">
                <h3 className="text-[clamp(1.1rem,2.2vw,2.1rem)] font-semibold uppercase tracking-[0.03em] text-[#0C0C0C]">
                  {s.name}
                </h3>
                <p className="max-w-2xl text-[clamp(0.9rem,1.6vw,1.25rem)] font-light leading-relaxed text-[#0C0C0C]/65">
                  {s.desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
