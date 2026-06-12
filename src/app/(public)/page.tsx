import Loader from "@/components/Loader";
import StandaloneRedirect from "@/components/StandaloneRedirect";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Values from "@/components/Values";
import Stats from "@/components/Stats";
import Meetings from "@/components/Meetings";
import Location from "@/components/Location";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";
import SmoothScroll from "@/components/SmoothScroll";
import { marqueeLightItems, marqueeDarkItems } from "@/data/content";
import { getChurchSchema, getOrganizationSchema } from "@/lib/seo";

export default function Home() {
  const churchSchema = getChurchSchema();
  const orgSchema = getOrganizationSchema();

  return (
    <>
      <StandaloneRedirect />
      <Loader />
      <Nav />
      <main className="page" id="page">
        <span id="top" aria-hidden="true"></span>
        <Hero />
        <Marquee variant="light" items={marqueeLightItems} />
        <About />
        <Values />
        <Marquee variant="dark" items={marqueeDarkItems} />
        <Stats />
        <Meetings />
        <Location />
        <Footer />
      </main>
      <RevealOnScroll />
      <SmoothScroll />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(churchSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
    </>
  );
}
