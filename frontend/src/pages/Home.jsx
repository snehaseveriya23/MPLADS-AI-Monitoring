import parliament from '../assets/parliament-hero.png'

function Home({ onNavigate }) {
  function scrollToSolution() {
    document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main>
      <section className="hero" aria-label="MPLADS AI Monitor">
        <div className="hero__media" aria-hidden="true">
          <img src={parliament} alt="" className="hero__image" />
          <div className="hero__veil" />
          <div className="hero__grid" />
        </div>

        <div className="hero__content">
          <p className="eyebrow">TRANSPARENCY • ACCOUNTABILITY • DEVELOPMENT</p>
          <h1>
            MPLADS <span>AI MONITOR</span>
          </h1>
          <p className="subtitle">
            AI-Powered Monitoring &amp; Risk Intelligence for Members of Parliament
            Local Area Development Scheme
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('dashboard')}>
              Explore Dashboard →
            </button>
            <button type="button" className="btn btn--ghost" onClick={scrollToSolution}>
              Our Solution
            </button>
          </div>
        </div>

        <button type="button" className="scroll-hint" onClick={scrollToSolution}>
          <span className="scroll-hint__mouse" aria-hidden="true" />
          Scroll Down
        </button>

        <aside className="status-card" aria-live="polite">
          <span className="status-card__dot" />
          <div>
            <strong>System Active</strong>
            <p>Monitoring pipeline online</p>
          </div>
        </aside>
      </section>

      <section id="solution" className="solution">
        <div className="solution__inner">
          <p className="section-kicker">Our Solution</p>
          <h2>A decision-support layer for MPLADS oversight</h2>
          <p className="solution__lead">
            The platform brings together sanctioned works, utilisation patterns, and
            risk signals so that delays, irregularities, and under-performance can
            be reviewed with evidence rather than after-the-fact reporting.
          </p>
          <div className="solution__grid">
            <article>
              <h3>Work monitoring</h3>
              <p>
                Track recommended, sanctioned, and completed works with a clear
                view of progress across constituencies.
              </p>
            </article>
            <article>
              <h3>Risk intelligence</h3>
              <p>
                Surface concentration of funds, stalled projects, and outlier
                patterns for closer administrative review.
              </p>
            </article>
            <article>
              <h3>Public accountability</h3>
              <p>
                Present scheme activity in a form that supports transparent
                scrutiny by administrators, MPs, and citizens.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
