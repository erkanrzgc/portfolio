import { ArrowUpRight, Github, Linkedin, Mail, Twitter } from 'lucide-react'
import FadeIn from '../components/FadeIn'
import { CONTACT_SECTION_ID, contactLinks } from '../lib/contactLinks'

const iconByLabel = {
  GitHub: Github,
  LinkedIn: Linkedin,
  'X / Twitter': Twitter,
}

export default function FooterSection() {
  return (
    <footer
      id={CONTACT_SECTION_ID}
      className="relative z-10 border-t border-[#D7E2EA]/15 bg-[#0C0C0C] px-5 py-20 sm:px-8 sm:py-24 md:px-10 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <FadeIn delay={0} y={32}>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D7E2EA]/55">
                <Mail size={16} />
                Contact
              </p>
              <h2 className="hero-heading text-[clamp(3.2rem,12vw,150px)] font-black uppercase leading-none tracking-tight text-[#D7E2EA]">
                Let&apos;s Connect
              </h2>
            </div>

            <p className="max-w-xl text-base font-light leading-relaxed text-[#D7E2EA]/70 sm:text-lg">
              Have a project, collaboration, or technical idea in mind? Reach me
              from the links below and I&apos;ll get back to you.
            </p>
          </div>
        </FadeIn>

        <div className="mt-12 grid gap-3 sm:grid-cols-3 md:mt-16">
          {contactLinks.map((link) => {
            const Icon = iconByLabel[link.label as keyof typeof iconByLabel]

            return (
              <FadeIn key={link.href} delay={0.08} y={20}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[86px] items-center justify-between rounded-[24px] border border-[#D7E2EA]/20 px-5 py-4 text-[#D7E2EA] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D7E2EA]/55 hover:bg-[#D7E2EA]/10"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em]">
                    <Icon size={20} />
                    {link.label}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              </FadeIn>
            )
          })}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#D7E2EA]/10 pt-6 text-sm text-[#D7E2EA]/50 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="/privacy"
              className="transition-colors hover:text-[#D7E2EA]"
            >
              Privacy
            </a>
            <span>Software Engineer &amp; Cybersecurity Enthusiast</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
