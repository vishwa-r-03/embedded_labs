import '@wokwi/elements/dist/esm/led-element.js';
import { CPU, AVRIOPort, AVRTimer, portBConfig, timer0Config, avrInstruction, PinState } from 'avr8js';

const CLOCK_HZ = 16_000_000; // Arduino Uno runs its ATmega328p at 16MHz

// Minimal Intel HEX parser (no Node Buffer dependency, safe for the browser)
function parseIntelHex(hexText) {
  const bytes = [];
  let extendedAddr = 0;
  for (const rawLine of hexText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith(':')) continue;
    const byteCount = parseInt(line.substr(1, 2), 16);
    const address = parseInt(line.substr(3, 4), 16);
    const recordType = parseInt(line.substr(7, 2), 16);
    if (recordType === 0) {
      // data record
      const fullAddr = extendedAddr + address;
      for (let i = 0; i < byteCount; i++) {
        const byte = parseInt(line.substr(9 + i * 2, 2), 16);
        bytes[fullAddr + i] = byte;
      }
    } else if (recordType === 4) {
      // extended linear address record
      extendedAddr = parseInt(line.substr(9, 4), 16) << 16;
    }
    // record type 01 (EOF) and others are ignored
  }
  // Fill any gaps with 0 and ensure even length (Uint16Array needs whole words)
  const length = bytes.length + (bytes.length % 2);
  const data = new Uint8Array(length);
  for (let i = 0; i < length; i++) data[i] = bytes[i] || 0;
  return data;
}

async function main() {
  const statusEl = document.getElementById('status');
  const ledEl = document.getElementById('led');
  const pinLogEl = document.getElementById('pin-log');

  // Fetch the compiled program (real machine code, produced by avr-gcc)
  const hexText = await fetch('./blink.hex').then((r) => r.text());
  const data = parseIntelHex(hexText);
  const program = new Uint16Array(data.buffer, data.byteOffset, data.length / 2);

  // Boot the virtual chip
  const cpu = new CPU(program);
  const portB = new AVRIOPort(cpu, portBConfig);
  const timer0 = new AVRTimer(cpu, timer0Config); // drives millis()/delay() timing

  let lastToggleAtMs = null;
  let toggleCount = 0;

  portB.addListener(() => {
    const pinIsHigh = portB.pinState(5) === PinState.High;
    ledEl.value = pinIsHigh;
    const nowSimMs = (cpu.cycles / CLOCK_HZ) * 1000;
    toggleCount++;
    if (lastToggleAtMs !== null) {
      const intervalMs = nowSimMs - lastToggleAtMs;
      pinLogEl.textContent =
        `Toggle #${toggleCount} at simulated t=${nowSimMs.toFixed(0)}ms ` +
        `(interval: ${intervalMs.toFixed(0)}ms)\n` + pinLogEl.textContent;
    }
    lastToggleAtMs = nowSimMs;
  });

  statusEl.textContent = 'Running — real compiled AVR code, executing live in your browser.';

  // Run the emulator in step with real wall-clock time, batched per animation frame
  let lastFrameTime = performance.now();
  function runFrame(now) {
    const elapsedMs = now - lastFrameTime;
    lastFrameTime = now;
    const cyclesThisFrame = Math.min(elapsedMs, 50) * (CLOCK_HZ / 1000); // cap to avoid huge catch-up jumps
    const targetCycles = cpu.cycles + cyclesThisFrame;
    while (cpu.cycles < targetCycles) {
      avrInstruction(cpu);
      cpu.tick();
    }
    requestAnimationFrame(runFrame);
  }
  requestAnimationFrame(runFrame);
}

main().catch((err) => {
  document.getElementById('status').textContent = 'Error: ' + err.message;
  console.error(err);
});
