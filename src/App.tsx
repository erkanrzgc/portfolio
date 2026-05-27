import HeroSection from './sections/HeroSection'
import MarqueeSection from './sections/MarqueeSection'
import AboutSection from './sections/AboutSection'
import ServicesSection from './sections/ServicesSection'
import ProjectsSection from './sections/ProjectsSection'
import FooterSection from './sections/FooterSection'
import PrivacyPage from './sections/PrivacyPage'

export default function App() {
  if (window.location.pathname === '/privacy') {
    return (
      <main className="overflow-x-clip">
        <PrivacyPage />
      </main>
    )
  }

  return (
    <main className="overflow-x-clip">
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
      <FooterSection />
    </main>
  )
}
