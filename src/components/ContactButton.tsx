import { ArrowRight, Mail } from 'lucide-react'
import { CONTACT_SECTION_HREF } from '../lib/contactLinks'

interface ContactButtonProps {
  href?: string
}

export default function ContactButton({
  href = CONTACT_SECTION_HREF,
}: ContactButtonProps) {
  const isExternal = href.startsWith('http')

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group inline-flex items-center gap-3 rounded-full border border-[#D7E2EA]/40 bg-[#D7E2EA] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#0C0C0C] shadow-[0_18px_55px_rgba(215,226,234,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_70px_rgba(215,226,234,0.22)] focus:outline-none focus:ring-2 focus:ring-[#D7E2EA]/60 focus:ring-offset-2 focus:ring-offset-[#0C0C0C] sm:px-6 sm:py-3.5 md:px-7"
    >
      <Mail size={18} strokeWidth={2.4} />
      <span>Contact Me</span>
      <ArrowRight
        size={18}
        strokeWidth={2.4}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </a>
  )
}
