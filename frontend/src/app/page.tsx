import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { CtaBanner } from "@/components/landing/cta-banner";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <DashboardPreview />
      <Pricing />
      <Faq />
      <CtaBanner />
    </>
  );
}
