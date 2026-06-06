import { Navbar }     from "@/components/landing/Navbar"
import { Hero }       from "@/components/landing/Hero"
import { Services }   from "@/components/landing/Services"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Doctors }    from "@/components/landing/Doctors"
import { Footer }     from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Services />
        <HowItWorks />
        <Doctors />
      </main>
      <Footer />
    </div>
  )
}
