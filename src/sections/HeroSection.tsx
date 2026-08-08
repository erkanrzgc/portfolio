import FadeIn from '../components/FadeIn'
import Magnet from '../components/Magnet'
import { CONTACT_SECTION_HREF } from '../lib/contactLinks'

const navLinks = ['About', 'Services', 'Projects', 'Contact']

export default function HeroSection() {
  return (
    <section className="relative flex h-screen flex-col overflow-x-clip bg-[#0C0C0C]">
      {/* Navbar */}
      <FadeIn delay={0} y={-20}>
        <nav className="flex justify-between px-6 pt-6 md:px-10 md:pt-8">
          {navLinks.map((link) =>
            link === 'Contact' ? (
              <a
                key={link}
                href={CONTACT_SECTION_HREF}
                className="text-sm font-medium uppercase tracking-wider text-[#D7E2EA] transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.4rem]"
              >
                {link}
              </a>
            ) : (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-medium uppercase tracking-wider text-[#D7E2EA] transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.4rem]"
              >
                {link}
              </a>
            )
          )}
        </nav>
      </FadeIn>

      {/* Hero Heading */}
      <div className="overflow-hidden">
        <FadeIn delay={0.15} y={40}>
          <h1 className="hero-heading mt-6 w-full whitespace-nowrap text-center text-[11vw] font-black uppercase leading-none tracking-tight sm:mt-4 sm:text-[12vw] md:-mt-5 md:text-[13vw] lg:text-[14vw]">
            Hi, i&apos;m erkan
          </h1>
        </FadeIn>
      </div>

      {/* Subtitle */}
      <FadeIn delay={0.25} y={20}>
        <p className="-mt-1 text-center text-[clamp(0.8rem,2vw,1.8rem)] font-light uppercase tracking-[0.25em] text-[#BBCCD7] sm:-mt-2 md:-mt-3">
          Software Engineer &amp; Cybersecurity Enthusiast
        </p>
      </FadeIn>

      {/* Hero Portrait */}
      <div className="absolute left-1/2 top-[62%] z-10 w-[320px] -translate-x-1/2 -translate-y-1/2 sm:top-[64%] sm:w-[430px] md:w-[520px] lg:w-[610px] xl:w-[660px]">
        <FadeIn delay={0.6} y={30} className="w-full">
          <Magnet padding={360} strength={1.65} className="hero-avatar-magnet">
            <div className="hero-avatar-float">
              <img
                src="/images/avatar-transparent.png"
                alt="Erkan avatar"
                className="w-full object-contain"
                loading="eager"
              />
            </div>
          </Magnet>
        </FadeIn>
      </div>
    </section>
  )
}
