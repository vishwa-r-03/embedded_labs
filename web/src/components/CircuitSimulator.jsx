import { useEffect, useRef, useState } from 'react';
import '@wokwi/elements/dist/esm/led-element.js';
import '@wokwi/elements/dist/esm/pushbutton-element.js';
import '@wokwi/elements/dist/esm/servo-element.js';
import '@wokwi/elements/dist/esm/buzzer-element.js';
import '@wokwi/elements/dist/esm/hc-sr04-element.js';
import { avrInstruction } from 'avr8js';
import { createSimulation, CLOCK_HZ } from '../lib/simulationEngine';
import { hexToProgram } from '../lib/intelHex';
import { circuitParts } from '../lib/circuitParts';
import './CircuitSimulator.css';

// Most components are keyed by their single 'pin'; the ultrasonic sensor
// has trigPin/echoPin instead, so it needs its own key.
function componentKey(comp) {
  return comp.pin ?? comp.trigPin;
}

// Generic renderer + simulation loop over whatever components a lesson
// declares. All type-specific behavior (how a button drives the chip, how an
// LED's brightness is computed, etc.) lives in lib/circuitParts.js -- this
// component just iterates components and calls into that registry. Adding a
// new component type never requires touching this file's simulation loop.
export default function CircuitSimulator({ hex, circuit }) {
  const elementRefs = useRef({});
  const sliderRefs = useRef({}); // separate from elementRefs: some components (ultrasonic) have both a visual and an interactive control
  const [running, setRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const [distanceReadouts, setDistanceReadouts] = useState({});
  const components = circuit?.components ?? [];
  const hasBuzzer = components.some((c) => c.type === 'buzzer');

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!hex || components.length === 0) {
      setRunning(false);
      return;
    }

    let cancelled = false;
    let rafId = null;
    const instances = []; // { component, state, tick, cleanup }

    const program = hexToProgram(hex);
    const sim = createSimulation(program);
    const { cpu } = sim;

    for (const component of components) {
      const handler = circuitParts[component.type];
      const el = elementRefs.current[componentKey(component)];
      if (!handler || !el) continue;
      const sliderEl = sliderRefs.current[componentKey(component)];
      const ctx = { ...sim, el, sliderEl, component, soundEnabledRef };
      const { state, cleanup } = handler.init(ctx);
      instances.push({ ctx, state, tick: handler.tick, cleanup });
    }

    setRunning(true);
    let lastFrameTime = performance.now();

    function frame(now) {
      if (cancelled) return;
      const elapsedMs = now - lastFrameTime;
      lastFrameTime = now;
      // Cap per-frame catch-up so a slow frame (tab backgrounded, etc.) doesn't
      // cause a huge instruction burst on the next visible frame.
      const cyclesThisFrame = Math.min(elapsedMs, 50) * (CLOCK_HZ / 1000);
      const targetCycles = cpu.cycles + cyclesThisFrame;
      while (cpu.cycles < targetCycles) {
        avrInstruction(cpu);
        cpu.tick();
      }
      for (const instance of instances) {
        instance.tick(instance.ctx, instance.state);
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      for (const instance of instances) instance.cleanup?.();
    };
  }, [hex, circuit]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="circuit-sim">
      <div className="circuit-sim-board">
        {components.length === 0 && <p className="circuit-sim-unsupported">No circuit configured for this exercise yet.</p>}
        {components.map((comp) => (
          <div key={componentKey(comp)} className="circuit-sim-component">
            {comp.type === 'led' && (
              <wokwi-led ref={(el) => (elementRefs.current[componentKey(comp)] = el)} color={comp.color ?? 'red'}></wokwi-led>
            )}
            {comp.type === 'button' && (
              <wokwi-pushbutton ref={(el) => (elementRefs.current[componentKey(comp)] = el)} color={comp.color ?? 'blue'}></wokwi-pushbutton>
            )}
            {comp.type === 'potentiometer' && (
              <input
                type="range"
                className="circuit-sim-pot"
                ref={(el) => (elementRefs.current[componentKey(comp)] = el)}
                min={0}
                max={comp.max ?? 1023}
                defaultValue={comp.initialValue ?? 512}
              />
            )}
            {comp.type === 'servo' && (
              <wokwi-servo ref={(el) => (elementRefs.current[componentKey(comp)] = el)} horn={comp.horn ?? 'single'}></wokwi-servo>
            )}
            {comp.type === 'buzzer' && <wokwi-buzzer ref={(el) => (elementRefs.current[componentKey(comp)] = el)}></wokwi-buzzer>}
            {comp.type === 'ultrasonic' && (
              <>
                <wokwi-hc-sr04 ref={(el) => (elementRefs.current[componentKey(comp)] = el)}></wokwi-hc-sr04>
                <input
                  type="range"
                  className="circuit-sim-pot circuit-sim-distance-slider"
                  ref={(el) => (sliderRefs.current[componentKey(comp)] = el)}
                  min={2}
                  max={400}
                  defaultValue={comp.distanceCm ?? 50}
                  onInput={(e) =>
                    setDistanceReadouts((prev) => ({ ...prev, [componentKey(comp)]: e.target.value }))
                  }
                />
                <div className="circuit-sim-distance-readout">
                  {distanceReadouts[componentKey(comp)] ?? comp.distanceCm ?? 50} cm
                </div>
              </>
            )}
            {comp.label && <div className="circuit-sim-component-label">{comp.label}</div>}
          </div>
        ))}
      </div>
      <div className="circuit-sim-footer">
        <div className="circuit-sim-status">
          {running ? 'Running -- live compiled code, executing in your browser.' : 'Compile your code to see it run.'}
        </div>
        {hasBuzzer && (
          <button className="circuit-sim-mute-btn" onClick={() => setSoundEnabled((s) => !s)}>
            {soundEnabled ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
        )}
      </div>
    </div>
  );
}