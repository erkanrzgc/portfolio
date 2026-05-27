import { ArrowLeft, ShieldCheck } from 'lucide-react'

const privacyItems = [
  {
    title: 'No direct data collection',
    body: 'This portfolio does not use contact forms, account creation, cookies, or analytics scripts to collect personal data directly from visitors.',
  },
  {
    title: 'Technical hosting logs',
    body: 'The site is hosted on Vercel. Vercel may process technical request data such as IP address, browser information, request time, and requested pages for security, performance, and operational purposes.',
  },
  {
    title: 'External links',
    body: 'GitHub, LinkedIn, and X links open third-party platforms. Their own privacy policies apply after you leave this site.',
  },
  {
    title: 'Contact',
    body: 'For privacy-related questions about this portfolio, use one of the contact links on the main page.',
  },
]

export default function PrivacyPage() {
  return (
    <section className="min-h-screen bg-[#0C0C0C] px-5 py-10 text-[#D7E2EA] sm:px-8 md:px-10 md:py-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-14">
        <a
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#D7E2EA]/65 transition-colors hover:text-[#D7E2EA]"
        >
          <ArrowLeft size={18} />
          Back
        </a>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D7E2EA]/55">
            <ShieldCheck size={16} />
            Privacy
          </p>
          <h1 className="hero-heading text-[clamp(3rem,12vw,150px)] font-black uppercase leading-none tracking-tight">
            Privacy Notice
          </h1>
          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-[#D7E2EA]/70 sm:text-lg">
            A short, plain-language note about how this personal portfolio handles
            visitor data.
          </p>
        </div>

        <div className="grid gap-4">
          {privacyItems.map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[#D7E2EA]/15 p-5 sm:p-6"
            >
              <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-[#D7E2EA]">
                {item.title}
              </h2>
              <p className="mt-3 max-w-3xl text-base font-light leading-relaxed text-[#D7E2EA]/70">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <p className="border-t border-[#D7E2EA]/10 pt-6 text-sm text-[#D7E2EA]/50">
          Last updated: May 27, 2026.
        </p>
      </div>
    </section>
  )
}
