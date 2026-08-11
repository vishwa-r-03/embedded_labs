import { readPinState } from './simulationEngine';
import { arduinoPinToPort } from './pinMap';

const CLOCK_HZ = 16_000_000;
const ECHO_DELAY_US = 200; // brief real-world delay between trigger and echo start

// Creates a stateful HC-SR04 simulator: watches the TRIG pin for a valid
// trigger pulse, then drives the ECHO pin HIGH for a duration proportional
// to the configured distance (matching the real sensor's ~58.3us/cm
// conversion), after a short delay -- exactly how the real hardware behaves.
// `ports` and `cpu` are the live simulation objects; this function is
// engine-agnostic otherwise, so it works identically whether driven by an
// animation frame (live view) or a tight grading loop (headless).
export function createUltrasonicSensor({ cpu, ports, trigPin, echoPin, distanceCm: initialDistanceCm }) {
  const trig = arduinoPinToPort(trigPin);
  const echo = arduinoPinToPort(echoPin);
  let distanceCm = initialDistanceCm; // mutable so a live UI control can adjust it mid-simulation
  const state = {
    lastTrigState: readPinState(ports, trig.port, trig.bit),
    trigRiseCycles: null,
    pendingEchoStart: false,
    pendingEchoEnd: false,
    echoStartCycles: 0,
    echoEndCycles: 0,
  };

  function onTrigPortChange() {
    const now = readPinState(ports, trig.port, trig.bit);
    if (now === state.lastTrigState) return;
    if (now === 1) {
      state.trigRiseCycles = cpu.cycles;
    } else if (state.trigRiseCycles !== null) {
      const trigWidthUs = ((cpu.cycles - state.trigRiseCycles) / CLOCK_HZ) * 1_000_000;
      if (trigWidthUs >= 5) {
        // Valid trigger pulse (real spec: ~10us) -- schedule the echo response.
        const echoWidthUs = distanceCm * 58.3;
        state.echoStartCycles = cpu.cycles + (ECHO_DELAY_US * CLOCK_HZ) / 1_000_000;
        state.echoEndCycles = state.echoStartCycles + (echoWidthUs * CLOCK_HZ) / 1_000_000;
        state.pendingEchoStart = true;
      }
    }
    state.lastTrigState = now;
  }

  // Call every simulation step (or every animation frame) to fire the
  // scheduled echo pulse at the right time -- this is a scheduled future
  // action, not something a port listener alone can trigger.
  function poll() {
    if (state.pendingEchoStart && cpu.cycles >= state.echoStartCycles) {
      ports[echo.port].setPin(echo.bit, true);
      state.pendingEchoStart = false;
      state.pendingEchoEnd = true;
    }
    if (state.pendingEchoEnd && cpu.cycles >= state.echoEndCycles) {
      ports[echo.port].setPin(echo.bit, false);
      state.pendingEchoEnd = false;
    }
  }

  const listener = onTrigPortChange;
  ports[trig.port].addListener(listener);

  return {
    poll,
    setDistance: (cm) => {
      distanceCm = cm;
    },
    cleanup: () => ports[trig.port].removeListener(listener),
  };
}