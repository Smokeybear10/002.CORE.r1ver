import { ClusterCanvas } from "./cluster-canvas"

export function ChapterSpace() {
  return (
    <section className="chapter-scroll" id="chapter-3">
      <div className="chapter-sticky">
        <div className="chapter-inner">
          <div className="cluster-map-wrap reveal">
            <ClusterCanvas />
          </div>
          <div className="reveal-group">
            <div className="chapter-label reveal-child">
              <span className="num">§ 03</span>
              <span className="line" />
              <span>Abstraction Space</span>
            </div>
            <h2 className="chapter-heading reveal-child">
              Two thousand <span className="em">archetypes.</span>
              <br />
              One <span className="em">coordinate</span> per hand.
            </h2>
            <p className="chapter-body reveal-child">
              Every possible hand reduces to a point in thirty-two dimensions,
              partitioned into two thousand clusters by equity distribution.
              Hands that live in the same cluster play the same way. The solver
              memorizes the archetype, not the hand.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
