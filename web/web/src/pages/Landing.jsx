import { Link } from 'react-router-dom';
import { tracks } from '../data/curriculum';
import './Landing.css';

const firstTopic = tracks[0].modules[0].topics[0];
const getStartedPath = `/track/${tracks[0].id}/topic/${firstTopic.id}`;

const trackLearningSummary = {
  fundamentals:
    "You'll learn to control digital and analog hardware using the standard Arduino API -- reading buttons and sensors, driving LEDs, motors, and servos, and structuring a program so it can do more than one thing at a time. By the end, you'll understand how a microcontroller actually talks to the physical world.",
  systems:
    "You'll learn what the Arduino API is doing underneath -- direct hardware register manipulation, interrupts, timers, and communication protocols (UART/I2C/SPI) -- alongside the C/C++ skills (pointers, structs, classes, multi-file architecture) needed to write firmware the way it's written professionally, not just for a hobby project.",
};

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-logo">EMBEDDED LABS</div>
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
            <a href="#curriculum" className="btn btn-secondary">
              View curriculum
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

      <section id="curriculum" className="tracks-section">
        <h2 className="section-title">Full curriculum</h2>
        {tracks.map((track) => {
          const first = track.modules[0].topics[0];
          return (
            <div key={track.id} className="curriculum-track">
              <div className="curriculum-track-header">
                <div className="track-card-name">{track.name}</div>
                <Link to={`/track/${track.id}/topic/${first.id}`} className="track-card-cta">
                  Start this track →
                </Link>
              </div>
              <p className="curriculum-track-summary">{trackLearningSummary[track.id] ?? track.description}</p>

              <div className="curriculum-modules">
                {track.modules.map((mod) => (
                  <div key={mod.id} className="curriculum-module">
                    <div className="curriculum-module-name">{mod.name}</div>
                    <ul className="curriculum-topic-list">
                      {mod.topics.map((topic) => (
                        <li key={topic.id} className="curriculum-topic-item">
                          <span className="curriculum-topic-title">{topic.title}</span>
                          <span className="curriculum-topic-focus"> -- {topic.focus}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
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

function CircuitSignature() {
  return (
    <svg viewBox="0 0 380 260" className="circuit-svg" role="img" aria-label="Animated diagram of an LED blinking in sync with a square wave signal">
      <rect x="20" y="110" width="46" height="28" rx="3" className="circuit-chip" />
      <text x="43" y="128" textAnchor="middle" className="circuit-label">PB5</text>
      <line x1="66" y1="124" x2="120" y2="124" className="circuit-wire" />
      <path d="M120 124 L128 112 L138 136 L148 112 L158 136 L166 124" className="circuit-wire circuit-resistor" />
      <text x="143" y="100" textAnchor="middle" className="circuit-label">220Ω</text>
      <line x1="166" y1="124" x2="210" y2="124" className="circuit-wire" />
      <circle cx="232" cy="124" r="22" className="circuit-led" />
      <circle cx="232" cy="124" r="22" className="circuit-led-glow" />
      <text x="232" y="165" textAnchor="middle" className="circuit-label">LED</text>
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
