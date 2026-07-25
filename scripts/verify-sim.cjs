const fs = require('fs');
const { CPU, AVRIOPort, portBConfig, avrInstruction } = require('avr8js');
const intelHex = require('intel-hex');

const hex = fs.readFileSync('../blink.hex', 'utf8');
const { data } = intelHex.parse(hex);
const program = new Uint16Array(data.buffer, data.byteOffset, data.length / 2);

const cpu = new CPU(program);
const portB = new AVRIOPort(cpu, portBConfig);

let lastState = null;
let toggleTimestampsMs = [];
const CLOCK_HZ = 16_000_000; // Uno runs at 16MHz

portB.addListener(() => {
  const pin5 = portB.pinState(5); // PB5 = physical pin 13, the onboard LED
  if (pin5 !== lastState) {
    lastState = pin5;
    toggleTimestampsMs.push((cpu.cycles / CLOCK_HZ) * 1000);
  }
});

const t0 = Date.now();
const cyclesToRun = CLOCK_HZ * 3.5; // simulate 3.5 seconds of chip time
while (cpu.cycles < cyclesToRun) {
  avrInstruction(cpu);
  cpu.tick();
}
console.log('Real wall-clock time to simulate 3.5s of chip time:', Date.now() - t0, 'ms');
console.log('\nPin 13 (onboard LED) toggle timestamps (simulated ms):');
console.log(toggleTimestampsMs.map(t => t.toFixed(1)));
console.log('\nIntervals between toggles (should be ~1000ms each):');
for (let i = 1; i < toggleTimestampsMs.length; i++) {
  console.log((toggleTimestampsMs[i] - toggleTimestampsMs[i - 1]).toFixed(1) + ' ms');
}
