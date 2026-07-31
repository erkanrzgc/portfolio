import { useState } from 'react'
import FadeIn from '../components/FadeIn'
import OrbitalAvatar from '../components/OrbitalAvatar'
import { CONTACT_SECTION_HREF } from '../lib/contactLinks'

const navLinks = ['About', 'Services', 'Projects', 'Contact']

export default function HeroSection() {
  const [orbitalReady, setOrbitalReady] = useState(false)

  return (
    <section className="relative flex h-screen flex-col overflow-x-clip bg-[#0C0C0C]">
      {/* Navbar */}
      <FadeIn delay={0} y={-20} className="relative z-20">
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
      <div className="relative z-20 overflow-hidden">
        <FadeIn delay={0.15} y={40}>
          <h1 className="hero-heading mt-6 w-full whitespace-nowrap text-center text-[11vw] font-black uppercase leading-none tracking-tight sm:mt-4 sm:text-[12vw] md:-mt-5 md:text-[13vw] lg:text-[14vw]">
            Hi, i&apos;m erkan
          </h1>
        </FadeIn>
      </div>

      {/* Subtitle */}
      <FadeIn delay={0.25} y={20} className="relative z-20">
        <p className="-mt-1 text-center text-[clamp(0.8rem,2vw,1.8rem)] font-light uppercase tracking-[0.25em] text-[#BBCCD7] sm:-mt-2 md:-mt-3">
          Software Engineer &amp; Cybersecurity Enthusiast
        </p>
      </FadeIn>

      {/* Hero Portrait */}
      <div className="absolute left-1/2 top-[62%] z-10 h-[min(92vw,780px)] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 sm:top-[64%]">
        <OrbitalAvatar
          className="absolute inset-0 z-10"
          onReady={() => setOrbitalReady(true)}
          onUnavailable={() => setOrbitalReady(false)}
        />
        <div
          data-avatar-fallback
          data-state={orbitalReady ? 'ready' : 'loading'}
          className={`absolute left-1/2 top-1/2 z-0 aspect-square w-[min(52vw,430px)] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            orbitalReady ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            data-avatar-fallback-motion
            className="hero-avatar-fallback-motion relative isolate flex h-full w-full items-center justify-center"
          >
            <img
              src="/images/avatar-transparent.png"
              alt="Erkan avatar"
              className="relative z-10 max-h-full w-full object-contain"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
