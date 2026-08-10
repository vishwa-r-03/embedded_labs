import { checkPeriodicToggle } from '../../../lib/checkers';

export default {
  theory: `Every pin on the Arduino can be set to either INPUT or OUTPUT mode. As an OUTPUT, it can be
driven HIGH (5V) or LOW (0V) under your program's control -- that's all it takes to turn an LED
on or off.

Three functions do all the work here:

- pinMode(pin, OUTPUT) -- tells the chip this pin will be driven by your code, not read as an input.
- digitalWrite(pin, HIGH or LOW) -- sets the pin's voltage.
- delay(ms) -- pauses execution for the given number of milliseconds.

Arduino's onboard LED is wired to pin 13 on most boards (including the Uno), so you don't need
any external components to try this.`,

  problemStatement: `Write a program that blinks the onboard LED (pin 13) with a 1 second on / 1 second off pattern,
forever.

Requirements:
1. Configure pin 13 as an OUTPUT in setup().
2. In loop(), turn the LED on, wait 1000ms, turn it off, wait 1000ms.`,

  starterCode: `void setup() {
  // TODO: configure pin 13 as an OUTPUT

}

void loop() {
  // TODO: turn the LED on, wait, turn it off, wait

}
`,

  solutionCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`,

  circuit: {
    components: [{ type: 'led', pin: 13, label: 'LED', color: 'red' }],
  },

  checkPins: [{ pin: 13, label: 'LED' }],

  // Runs after a successful compile. `events` is the pin-toggle timeline
  // produced by the fast headless simulation (see lib/simulationEngine.js).
  check(events) {
    return checkPeriodicToggle(events, { periodMs: 1000, toleranceMs: 150, minToggles: 3 });
  },
};
