import {
  CPU,
  AVRIOPort,
  AVRTimer,
  AVRADC,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  adcConfig,
  avrInstruction,
  PinState,
} from 'avr8js';

const CLOCK_HZ = 16_000_000; // Arduino Uno's ATmega328P runs at 16MHz

// Sets up a fresh virtual chip: CPU + all three I/O ports + the peripherals
// most exercises need (Timer0 for delay()/millis(), Timer1 for PWM/servo
// pulses, Timer2 for tone(), and the ADC for analogRead()). Instantiating all
// of these unconditionally is cheap and means adding a new component type
// doesn't require threading a new peripheral through every call site --
// see docs/curriculum.md's engineering notes for which topics need which.
export function createSimulation(program) {
  const cpu = new CPU(program);
  const ports = {
    B: new AVRIOPort(cpu, portBConfig),
    C: new AVRIOPort(cpu, portCConfig),
    D: new AVRIOPort(cpu, portDConfig),
  };
  const timer0 = new AVRTimer(cpu, timer0Config);
  const timer1 = new AVRTimer(cpu, timer1Config);
  const timer2 = new AVRTimer(cpu, timer2Config);
  const adc = new AVRADC(cpu, adcConfig);
  return { cpu, ports, timer0, timer1, timer2, adc };
}

export function readPinState(ports, port, bit) {
  return ports[port].pinState(bit) === PinState.High ? 1 : 0;
}

// Runs the simulation as fast as possible (not in real time) for a fixed amount
// of simulated chip time, recording every state change on the given pins.
// Used for grading -- we don't want the checker to take as long as the program
// actually runs.
//
// `driveSchedule` optionally scripts external pin inputs during the run, e.g.
// simulating a button press at a specific time -- necessary for grading any
// exercise involving input, not just watching outputs. Each entry:
// { port, bit, atMs, value } -- value is applied via port.setPin() once the
// simulation reaches atMs.
export function runFastForward(program, durationMs, watchPins, driveSchedule = []) {
  const { cpu, ports } = createSimulation(program);
  const events = [];
  const lastState = {};
  const schedule = [...driveSchedule].sort((a, b) => a.atMs - b.atMs);
  let nextDriveIndex = 0;

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

    const nowMs = (cpu.cycles / CLOCK_HZ) * 1000;
    while (nextDriveIndex < schedule.length && nowMs >= schedule[nextDriveIndex].atMs) {
      const d = schedule[nextDriveIndex];
      ports[d.port].setPin(d.bit, d.value);
      nextDriveIndex++;
    }

    if ((cpu.cycles & 0xffff) === 0 && performance.now() - wallStart > WALL_TIME_BUDGET_MS) {
      break; // bailed out -- program likely hung; partial events are still returned
    }
  }
  return events;
}

export { CLOCK_HZ };