import { CPU, AVRIOPort, AVRTimer, portBConfig, portCConfig, portDConfig, timer0Config, avrInstruction, PinState } from 'avr8js';

const CLOCK_HZ = 16_000_000; // Arduino Uno's ATmega328P runs at 16MHz

// Sets up a fresh virtual chip: CPU + all three I/O ports + Timer0 (needed for
// delay()/millis(), which nearly every sketch uses). Additional timers (PWM,
// servo, tone) get added here as topics that need them come online -- see the
// engineering notes in docs/curriculum.md for which topics still need this.
export function createSimulation(program) {
  const cpu = new CPU(program);
  const ports = {
    B: new AVRIOPort(cpu, portBConfig),
    C: new AVRIOPort(cpu, portCConfig),
    D: new AVRIOPort(cpu, portDConfig),
  };
  const timer0 = new AVRTimer(cpu, timer0Config);
  return { cpu, ports, timer0 };
}

export function readPinState(ports, port, bit) {
  return ports[port].pinState(bit) === PinState.High ? 1 : 0;
}

// Runs the simulation as fast as possible (not in real time) for a fixed amount
// of simulated chip time, recording every state change on the given pins.
// Used for grading -- we don't want the checker to take as long as the program
// actually runs.
export function runFastForward(program, durationMs, watchPins) {
  const { cpu, ports } = createSimulation(program);
  const events = [];
  const lastState = {};

  for (const wp of watchPins) {
    const key = `${wp.port}${wp.bit}`;
    lastState[key] = readPinState(ports, wp.port, wp.bit);
    ports[wp.port].addListener(() => {
      const state = readPinState(ports, wp.port, wp.bit);
      if (lastState[key] !== state) {
        lastState[key] = state;
        events.push({ label: wp.label, port: wp.port, bit: wp.bit, timeMs: (cpu.cycles / CLOCK_HZ) * 1000, state });
      }
    });
  }

  const targetCycles = CLOCK_HZ * (durationMs / 1000);
  const wallStart = performance.now();
  const WALL_TIME_BUDGET_MS = 4000; // safety valve: a hung/looping program can't freeze the tab

  while (cpu.cycles < targetCycles) {
    avrInstruction(cpu);
    cpu.tick();
    if ((cpu.cycles & 0xffff) === 0 && performance.now() - wallStart > WALL_TIME_BUDGET_MS) {
      break; // bailed out -- program likely hung; partial events are still returned
    }
  }
  return events;
}

export { CLOCK_HZ };
