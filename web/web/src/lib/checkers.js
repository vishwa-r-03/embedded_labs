// Checks that a pin toggled at roughly regular intervals -- the shape of a
// correct blink/heartbeat/traffic-light-style exercise. Reusable across any
// topic whose correctness is "this pin should flip every N ms".
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
