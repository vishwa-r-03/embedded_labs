import { useEffect, useRef, useState } from 'react';
import '@wokwi/elements/dist/esm/led-element.js';
import { avrInstruction } from 'avr8js';
import { createSimulation, readPinState, CLOCK_HZ } from '../lib/simulationEngine';
import { hexToProgram } from '../lib/intelHex';
import { arduinoPinToPort } from '../lib/pinMap';
import './CircuitSimulator.css';

export default function CircuitSimulator({ hex, circuit }) {
  const ledRef = useRef(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!hex || !circuit) {
      setRunning(false);
      return;
    }

    let cancelled = false;
    let rafId = null;

    const program = hexToProgram(hex);
    const { cpu, ports } = createSimulation(program);
    const { port, bit } = arduinoPinToPort(circuit.pin);

    setRunning(true);
    let lastFrameTime = performance.now();

    function tick(now) {
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
      if (ledRef.current) {
        ledRef.current.value = readPinState(ports, port, bit) === 1;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [hex, circuit]);

  return (
    <div className="circuit-sim">
      <div className="circuit-sim-board">
        {circuit?.type === 'single-led' ? (
          <wokwi-led ref={ledRef} color="red"></wokwi-led>
        ) : (
          <p className="circuit-sim-unsupported">This circuit type isn't wired up yet.</p>
        )}
      </div>
      <div className="circuit-sim-status">
        {running ? 'Running -- live compiled code, executing in your browser.' : 'Compile your code to see it run.'}
      </div>
    </div>
  );
}
