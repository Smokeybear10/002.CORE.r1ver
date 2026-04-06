import Link from "next/link"
import { BgCanvas } from "@/app/components/bg-canvas"
import { Wordmark } from "@/app/components/wordmark"
import { Telemetry } from "@/app/components/telemetry"
import { ScrollProgress } from "@/app/components/scroll-progress"
import { HeroSection } from "@/app/components/hero-section"
import { ChapterShape } from "@/app/components/chapter-shape"
import { ChapterSpace } from "@/app/components/chapter-space"
import { ExplorerSection } from "@/app/components/explorer-section"
import { StrategySection } from "@/app/components/strategy-section"

export default function LandingPage() {
  return (
    <>
      <BgCanvas />
      <Wordmark />
      <Telemetry />
      <ScrollProgress />

      <HeroSection />
      <ChapterShape />
      <ChapterSpace />
      <ExplorerSection />
      <StrategySection />

      <section className="query-section">
        <div className="query-inner">
          <div className="query-label">§ 06 · Begin</div>
          <h2 className="query-title">
            Ask the <span className="em">river.</span>
          </h2>
          <p className="section-sub" style={{ textAlign: "center", margin: "0 auto 48px" }}>
            Full Explorer and Strategy viewer at production scale.
          </p>
          <div className="query-cta-group">
            <Link href="/explorer" className="query-cta">Explore Hands</Link>
            <Link href="/strategy" className="query-cta">Query Strategy</Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="footer-wordmark">
            R<span className="one">1</span>VER
          </span>
          <span>Thomas Ou · MMXXVI</span>
          <span>Set in Instrument Serif &amp; JetBrains Mono</span>
        </div>
      </footer>
    </>
  )
}
