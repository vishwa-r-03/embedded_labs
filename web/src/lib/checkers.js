// Checks that a pin toggled at roughly regular intervals -- the shape of a
// correct blink/heartbeat/traffic-light-style exercise. Reusable across any
// topic whose correctness is "this pin should flip every N ms".
// Reconstructs what state a given labeled pin was in at a specific point in
// time, from the sparse change-event timeline. Needed for checking multi-pin
// sequences (e.g. a traffic light) where "is pin X in the right state right
// now" matters more than "did pin X toggle periodically".
// Finds the width (in microseconds) of the HIGH pulse whose rising edge is
// closest to (at or before) timeMs, within a search window. Used for grading
// servo exercises -- we measure the actual generated pulse width directly,
// the same physical quantity a real servo would respond to, rather than
// relying on any particular angle-conversion formula.
export function findPulseWidthNear(events, label, timeMs, windowMs = 25) {
  const relevant = events.filter((e) => e.label === label).sort((a, b) => a.timeMs - b.timeMs);
  let best = null;
  for (let i = 0; i < relevant.length - 1; i++) {
    const rise = relevant[i];
    const fall = relevant[i + 1];
    if (rise.state === 1 && fall.state === 0 && rise.timeMs <= timeMs + windowMs && rise.timeMs >= timeMs - windowMs) {
      if (best === null || Math.abs(rise.timeMs - timeMs) < Math.abs(best.timeMs - timeMs)) {
        best = { timeMs: rise.timeMs, widthUs: (fall.timeMs - rise.timeMs) * 1000 };
      }
    }
  }
  return best ? best.widthUs : null;
}

// Whether a labeled pin had any toggle activity within [startMs, endMs].
// Used for grading tone()/noTone() timing -- tone() produces continuous
// toggling at the given frequency, silence produces none.
export function hasActivityInWindow(events, label, startMs, endMs) {
  return events.some((e) => e.label === label && e.timeMs >= startMs && e.timeMs <= endMs);
}

export function stateAtTime(events, label, timeMs, initialState = 0) {
  const relevant = events.filter((e) => e.label === label && e.timeMs <= timeMs);
  if (relevant.length === 0) return initialState;
  return relevant[relevant.length - 1].state;
}

// Computes the fraction of time a pin was HIGH within [windowStartMs,
// windowEndMs], reconstructed from the sparse change-event timeline. Used
// for grading PWM/analogWrite exercises, where correctness is about the duty
// cycle over a window, not a single instantaneous read.
export function computeDutyCycleInWindow(events, label, windowStartMs, windowEndMs, initialState = 0) {
  let currentState = stateAtTime(events, label, windowStartMs, initialState);
  let currentTime = windowStartMs;
  let highTime = 0;

  const withinWindow = events
    .filter((e) => e.label === label && e.timeMs > windowStartMs && e.timeMs <= windowEndMs)
    .sort((a, b) => a.timeMs - b.timeMs);

  for (const e of withinWindow) {
    if (currentState === 1) highTime += e.timeMs - currentTime;
    currentTime = e.timeMs;
    currentState = e.state;
  }
  if (currentState === 1) highTime += windowEndMs - currentTime;

  return highTime / (windowEndMs - windowStartMs);
}

export function checkPeriodicToggle(events, { periodMs, toleranceMs = 100, minToggles = 3, label }) {
  const relevant = label ? events.filter((e) => e.label === label) : events;

  if (relevant.length < minToggles) {
    return {
      pass: false,
      message: `Expected the pin to toggle at least ${minToggles} times within the test window, but it only toggled ${relevant.length} time(s). Check that your loop() is actually calling digitalWrite() and delay().`,
    };
  }

  for (let i = 1; i < relevant.length; i++) {
    const interval = relevant[i].timeMs - relevant[i - 1].timeMs;
    if (Math.abs(interval - periodMs) > toleranceMs) {
      return {
        pass: false,
        message: `Toggle #${i + 1} happened ${interval.toFixed(0)}ms after the previous one -- expected close to ${periodMs}ms. Double-check your delay() value.`,
      };
    }
  }

  return {
    pass: true,
    message: `Correct! The pin toggled every ~${periodMs}ms, as expected.`,
  };
}