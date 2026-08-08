import { Link } from 'react-router-dom';
import { tracks } from '../data/curriculum';
import './Landing.css';

const firstTopic = tracks[0].modules[0].topics[0];
const getStartedPath = `/track/${tracks[0].id}/topic/${firstTopic.id}`;

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-logo">EMBEDDED LABS</div>
        <Link to={getStartedPath} className="landing-nav-cta">
          Get Started →
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">Learn embedded systems by doing</div>
          <h1 className="hero-title">
            Write real code.
            <br />
            Watch real circuits <span className="hero-title-accent">light up.</span>
          </h1>
          <p className="hero-body">
            An interactive curriculum for Arduino and embedded C/C++. Every lesson compiles your
            actual code with the real toolchain, runs it on a simulated circuit right in your
            browser, and checks the result automatically -- no hardware required to start.
          </p>
          <div className="hero-ctas">
            <Link to={getStartedPath} className="btn btn-primary">
              Get Started →
            </Link>
            <a href="#tracks" className="btn btn-secondary">
              Browse curriculum
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <CircuitSignature />
        </div>
      </section>

      <section className="how-it-works">
        <ol className="how-steps">
          <li className="how-step">
            <span className="how-step-num">01</span>
            <h3>Write</h3>
            <p>Real Arduino C/C++ in an in-browser editor -- the same code you'd write for real hardware.</p>
          </li>
          <li className="how-step">
            <span className="how-step-num">02</span>
            <h3>Compile</h3>
            <p>Your code runs through the actual Arduino toolchain, errors and all.</p>
          </li>
          <li className="how-step">
            <span className="how-step-num">03</span>
            <h3>Watch it run</h3>
            <p>A simulated circuit reacts to your compiled code in real time. Get it wrong, see exactly why.</p>
          </li>
        </ol>
      </section>

      <section id="tracks" className="tracks-section">
        <h2 className="section-title">Two tracks</h2>
        {tracks.map((track) => {
          const first = track.modules[0].topics[0];
          return (
            <Link key={track.id} to={`/track/${track.id}/topic/${first.id}`} className="track-card">
              <div className="track-card-name">{track.name}</div>
              <p className="track-card-desc">{track.description}</p>
              <span className="track-card-cta">Start this track →</span>
            </Link>
          );
        })}
      </section>

      <footer className="landing-footer">
        <span>Embedded Labs</span>
        <span className="landing-footer-muted">No hardware required to start.</span>
      </footer>
    </div>
  );
}

// The signature element: a small schematic showing exactly what the first
// lesson actually produces -- a resistor + LED driven by a pin, with a live
// waveform trace and a synchronized blinking LED. Not decorative: this is
// literally the first thing a learner builds.
function CircuitSignature() {
  return (
    <svg viewBox="0 0 380 260" className="circuit-svg" role="img" aria-label="Animated diagram of an LED blinking in sync with a square wave signal">
      {/* MCU pin */}
      <rect x="20" y="110" width="46" height="28" rx="3" className="circuit-chip" />
      <text x="43" y="128" textAnchor="middle" className="circuit-label">PB5</text>

      {/* Wire from pin to resistor */}
      <line x1="66" y1="124" x2="120" y2="124" className="circuit-wire" />

      {/* Resistor */}
      <path d="M120 124 L128 112 L138 136 L148 112 L158 136 L166 124" className="circuit-wire circuit-resistor" />
      <text x="143" y="100" textAnchor="middle" className="circuit-label">220Ω</text>

      {/* Wire to LED */}
      <line x1="166" y1="124" x2="210" y2="124" className="circuit-wire" />

      {/* LED */}
      <circle cx="232" cy="124" r="22" className="circuit-led" />
      <circle cx="232" cy="124" r="22" className="circuit-led-glow" />
      <text x="232" y="165" textAnchor="middle" className="circuit-label">LED</text>

      {/* Waveform trace */}
      <g className="circuit-trace-group">
        <line x1="20" y1="210" x2="360" y2="210" className="circuit-axis" />
        <path
          d="M20 210 L20 190 L80 190 L80 210 L140 210 L140 190 L200 190 L200 210 L260 210 L260 190 L320 190 L320 210 L360 210"
          className="circuit-trace"
        />
      </g>
    </svg>
  );
}
