import { readPinState } from './simulationEngine';
import { arduinoPinToPort, arduinoPinToADCChannel } from './pinMap';

const CLOCK_HZ = 16_000_000;

// Each handler: init(ctx) runs once when the simulation starts and returns
// { state, cleanup? }. tick(ctx, state) runs every animation frame after the
// CPU has advanced. `ctx` = { cpu, ports, adc, el, component }.
//
// To add a new component type: add one entry here, plus one JSX branch in
// CircuitSimulator.jsx to render its tag. Nothing else needs to change.
export const circuitParts = {
  // LEDs are driven BY the chip. Brightness is computed from the actual duty
  // cycle (not just instantaneous pin level), so both plain digital blink
  // (duty ~0 or ~1) and PWM fading (duty tracks analogWrite's value) render
  // correctly with the same code path -- tracked via the port listener
  // rather than sampled once per frame, since a PWM signal toggles far
  // faster than our animation frame rate and a single per-frame sample would
  // just alias into flicker instead of a smooth brightness level.
  led: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      const state = {
        port,
        bit,
        lastPinState: readPinState(ctx.ports, port, bit),
        lastChangeCycles: ctx.cpu.cycles,
        highCyclesAccum: 0,
        windowStartCycles: ctx.cpu.cycles,
      };
      const listener = () => {
        const now = readPinState(ctx.ports, port, bit);
        if (now !== state.lastPinState) {
          if (state.lastPinState === 1) state.highCyclesAccum += ctx.cpu.cycles - state.lastChangeCycles;
          state.lastPinState = now;
          state.lastChangeCycles = ctx.cpu.cycles;
        }
      };
      ctx.ports[port].addListener(listener);
      return { state, cleanup: () => ctx.ports[port].removeListener(listener) };
    },
    tick(ctx, state) {
      const windowCycles = ctx.cpu.cycles - state.windowStartCycles;
      if (windowCycles <= 0) return;
      const ongoingSegment = state.lastPinState === 1 ? ctx.cpu.cycles - state.lastChangeCycles : 0;
      const brightness = (state.highCyclesAccum + ongoingSegment) / windowCycles;
      ctx.el.value = state.lastPinState === 1;
      ctx.el.brightness = Math.max(0, Math.min(1, brightness));
      state.highCyclesAccum = 0;
      state.windowStartCycles = ctx.cpu.cycles;
    },
  },

  // Buttons DRIVE the chip -- purely event-driven (click -> setPin), no tick needed.
  button: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      ctx.ports[port].setPin(bit, true); // idle HIGH (not pressed), matching INPUT_PULLUP
      const onPress = () => ctx.ports[port].setPin(bit, false); // active-LOW
      const onRelease = () => ctx.ports[port].setPin(bit, true);
      ctx.el.addEventListener('button-press', onPress);
      ctx.el.addEventListener('button-release', onRelease);
      return {
        state: {},
        cleanup: () => {
          ctx.el.removeEventListener('button-press', onPress);
          ctx.el.removeEventListener('button-release', onRelease);
        },
      };
    },
    tick() {}, // nothing to do per-frame
  },

  // Potentiometers DRIVE the chip via the ADC. Dragging the knob updates the
  // channel's voltage directly; analogRead() in the sketch reads it back out.
  potentiometer: {
    init(ctx) {
      const channel = arduinoPinToADCChannel(ctx.component.pin);
      const applyValue = (rawValue) => {
        const max = ctx.component.max ?? 1023;
        const fraction = Math.max(0, Math.min(1, rawValue / max));
        ctx.adc.channelValues[channel] = fraction * 5; // AVCC reference = 5V
      };
      applyValue(ctx.el.value ?? 0);
      const onInput = (e) => applyValue(e.detail ?? ctx.el.value);
      ctx.el.addEventListener('input', onInput);
      return { state: {}, cleanup: () => ctx.el.removeEventListener('input', onInput) };
    },
    tick() {},
  },

  // Servos are driven BY the chip's PWM pulse width. We measure the actual
  // HIGH pulse duration on each rising->falling edge and convert it to an
  // angle -- this is real pulse-width measurement, not a hardcoded formula
  // matching a specific sketch, so it works for any correct or incorrect
  // implementation the learner writes.
  servo: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      const state = { port, bit, lastPinState: readPinState(ctx.ports, port, bit), riseCycles: null };
      const listener = () => {
        const now = readPinState(ctx.ports, port, bit);
        if (now !== state.lastPinState) {
          if (now === 1) {
            state.riseCycles = ctx.cpu.cycles;
          } else if (state.riseCycles !== null) {
            const pulseUs = ((ctx.cpu.cycles - state.riseCycles) / CLOCK_HZ) * 1_000_000;
            const angle = ((pulseUs - 1000) / 1000) * 180; // 1000us=0deg, 2000us=180deg
            ctx.el.angle = Math.max(0, Math.min(180, angle));
          }
          state.lastPinState = now;
        }
      };
      ctx.ports[port].addListener(listener);
      return { state, cleanup: () => ctx.ports[port].removeListener(listener) };
    },
    tick() {}, // angle updates happen exactly on falling edges, via the listener
  },

  // Buzzers are driven BY the chip's tone() output (a square wave on the
  // pin). We show it as "sounding" if the pin has toggled recently -- tone()
  // toggles constantly while active and stops entirely when noTone() is
  // called, so recency of the last toggle is a reliable, simple signal.
  buzzer: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      const state = { port, bit, lastPinState: readPinState(ctx.ports, port, bit), lastToggleCycles: -Infinity };
      const listener = () => {
        const now = readPinState(ctx.ports, port, bit);
        if (now !== state.lastPinState) {
          state.lastPinState = now;
          state.lastToggleCycles = ctx.cpu.cycles;
        }
      };
      ctx.ports[port].addListener(listener);
      return { state, cleanup: () => ctx.ports[port].removeListener(listener) };
    },
    tick(ctx, state) {
      const cyclesSinceToggle = ctx.cpu.cycles - state.lastToggleCycles;
      ctx.el.hasSignal = cyclesSinceToggle < CLOCK_HZ * 0.05; // toggled within the last 50ms
    },
  },
};