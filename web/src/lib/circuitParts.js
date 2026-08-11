import { readPinState } from './simulationEngine';
import { arduinoPinToPort, arduinoPinToADCChannel } from './pinMap';
import { createUltrasonicSensor } from './ultrasonicSensor';

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
      // Use the averaged brightness to decide on/off, not the instantaneous
      // pin level -- PWM toggles far faster than our frame rate, so sampling
      // the instant level each frame just captures a random phase of the
      // switching and looks like flicker instead of a steady glow.
      ctx.el.value = brightness > 0.02;
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
  //
  // Pulse range (544-2400us) matches the real Arduino Servo library's actual
  // documented defaults (MIN_PULSE_WIDTH/MAX_PULSE_WIDTH) -- verified against
  // the real library, not assumed. A bare-metal sketch using a different
  // convention (e.g. a simplified 1000-2000us range) will show a
  // correspondingly approximate angle here; the displayed angle is a visual
  // aid only. Grading always checks raw pulse width in microseconds
  // directly, never this display angle, to avoid exactly this ambiguity.
  servo: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      const state = { port, bit, lastPinState: readPinState(ctx.ports, port, bit), riseCycles: null };
      const MIN_PULSE_US = 544;
      const MAX_PULSE_US = 2400;
      const listener = () => {
        const now = readPinState(ctx.ports, port, bit);
        if (now !== state.lastPinState) {
          if (now === 1) {
            state.riseCycles = ctx.cpu.cycles;
          } else if (state.riseCycles !== null) {
            const pulseUs = ((ctx.cpu.cycles - state.riseCycles) / CLOCK_HZ) * 1_000_000;
            const angle = ((pulseUs - MIN_PULSE_US) / (MAX_PULSE_US - MIN_PULSE_US)) * 180;
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
  //
  // Beyond the visual, we also measure the actual frequency being generated
  // (from the period between consecutive rising edges -- the same
  // measure-the-real-signal approach the servo handler uses for pulse
  // width) and play it through a real Web Audio oscillator, so the buzzer
  // actually sounds like whatever frequency the learner's code requested.
  buzzer: {
    init(ctx) {
      const { port, bit } = arduinoPinToPort(ctx.component.pin);
      const state = {
        port,
        bit,
        lastPinState: readPinState(ctx.ports, port, bit),
        lastToggleCycles: -Infinity,
        lastRiseCycles: null,
        currentFreqHz: 0,
        audioCtx: null,
        oscillator: null,
        gainNode: null,
      };

      // Web Audio setup. This only works after a user gesture (browsers block
      // audio otherwise) -- init() runs from the "Compile & Run" click, which
      // counts, but we still fail silently rather than throw if audio is
      // unavailable for any reason (unsupported browser, blocked, etc.), so a
      // learner without working audio still gets the visual indicator.
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'square'; // closer to a real piezo buzzer's tone than a pure sine
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0; // starts silent; ramped up only while actually sounding
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        state.audioCtx = audioCtx;
        state.oscillator = oscillator;
        state.gainNode = gainNode;
      } catch {
        // Audio unavailable -- the visual hasSignal indicator still works fine.
      }

      const listener = () => {
        const now = readPinState(ctx.ports, port, bit);
        if (now !== state.lastPinState) {
          if (now === 1) {
            if (state.lastRiseCycles !== null) {
              const periodSec = (ctx.cpu.cycles - state.lastRiseCycles) / CLOCK_HZ;
              if (periodSec > 0) state.currentFreqHz = 1 / periodSec;
            }
            state.lastRiseCycles = ctx.cpu.cycles;
          }
          state.lastPinState = now;
          state.lastToggleCycles = ctx.cpu.cycles;
        }
      };
      ctx.ports[port].addListener(listener);

      return {
        state,
        cleanup: () => {
          ctx.ports[port].removeListener(listener);
          try {
            state.oscillator?.stop();
            state.audioCtx?.close();
          } catch {
            // already stopped/closed -- nothing to do
          }
        },
      };
    },
    tick(ctx, state) {
      const cyclesSinceToggle = ctx.cpu.cycles - state.lastToggleCycles;
      const active = cyclesSinceToggle < CLOCK_HZ * 0.05; // toggled within the last 50ms
      ctx.el.hasSignal = active;

      if (!state.gainNode || !state.audioCtx) return;
      const soundEnabled = ctx.soundEnabledRef?.current ?? true;
      const now = state.audioCtx.currentTime;
      const audible = active && soundEnabled && state.currentFreqHz > 20 && state.currentFreqHz < 20000;

      if (audible) {
        state.oscillator.frequency.setTargetAtTime(state.currentFreqHz, now, 0.01);
        state.gainNode.gain.setTargetAtTime(0.15, now, 0.01); // smooth ramp avoids audible clicks
      } else {
        state.gainNode.gain.setTargetAtTime(0, now, 0.02);
      }
    },
  },

  // HC-SR04 ultrasonic distance sensor: a genuinely active virtual
  // peripheral (not just a static value like the potentiometer) -- it
  // watches for a trigger pulse and generates a correctly-timed echo
  // response. The actual timing logic lives in ultrasonicSensor.js, shared
  // with the grading engine (simulationEngine.js) so both use identical
  // behavior.
  ultrasonic: {
    init(ctx) {
      const sensor = createUltrasonicSensor({
        cpu: ctx.cpu,
        ports: ctx.ports,
        trigPin: ctx.component.trigPin,
        echoPin: ctx.component.echoPin,
        distanceCm: ctx.component.distanceCm ?? 50,
      });

      // The distance slider (rendered separately from the sensor's visual
      // element) lets the learner adjust what the sensor "sees" live, so
      // they can watch their code respond to a real changing input.
      let onSliderInput = null;
      if (ctx.sliderEl) {
        onSliderInput = () => sensor.setDistance(Number(ctx.sliderEl.value));
        ctx.sliderEl.addEventListener('input', onSliderInput);
      }

      return {
        state: { sensor },
        cleanup: () => {
          sensor.cleanup();
          if (ctx.sliderEl && onSliderInput) ctx.sliderEl.removeEventListener('input', onSliderInput);
        },
      };
    },
    tick(ctx, state) {
      state.sensor.poll();
    },
  },
};