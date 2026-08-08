import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Solution from "@/components/landing/Solution";
import Architecture from "@/components/landing/Architecture";
import Features from "@/components/landing/Features";
import TechStack from "@/components/landing/TechStack";
import HowItWorks from "@/components/landing/HowItWorks";
import Impact from "@/components/landing/Impact";
import Footer from "@/components/landing/Footer";

/**
 * Premium marketing landing page. Composed entirely of section
 * components under src/components/landing/ — each one independently
 * reusable and independently animated via Framer Motion.
 */
function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Architecture />
      <Features />
      <TechStack />
      <HowItWorks />
      <Impact />
      <Footer />
    </>
  );
}

export default LandingPage;
