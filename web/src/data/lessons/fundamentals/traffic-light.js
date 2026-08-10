import { stateAtTime } from '../../../lib/checkers';

export default {
  theory: `You can control as many pins as you have wires for -- each digitalWrite() only affects the one
pin you name, so multiple LEDs just means multiple pinMode()/digitalWrite() calls.

A traffic light is really just a timed sequence: turn some pins on, wait, change which pins are
on, wait again, repeat forever. Nothing new here beyond what you already know from blinking one
LED -- just applied three times in a coordinated pattern.`,

  problemStatement: `Write a program that cycles three LEDs (red on pin 2, yellow on pin 3, green on pin 4) through a
standard traffic light sequence, forever:

1. RED for 3 seconds
2. GREEN for 3 seconds
3. YELLOW for 1 second
4. back to RED, repeat

Only one LED should be on at a time.`,

  starterCode: `int redPin = 2;
int yellowPin = 3;
int greenPin = 4;

void setup() {
  // TODO: configure all three pins as OUTPUT

}

void loop() {
  // TODO: RED for 3s, then GREEN for 3s, then YELLOW for 1s, repeat

}
`,

  solutionCode: `int redPin = 2;
int yellowPin = 3;
int greenPin = 4;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
}

void loop() {
  digitalWrite(redPin, HIGH);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);
  delay(3000);

  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, HIGH);
  delay(3000);

  digitalWrite(greenPin, LOW);
  digitalWrite(yellowPin, HIGH);
  delay(1000);

  digitalWrite(yellowPin, LOW);
}
`,

  circuit: {
    components: [
      { type: 'led', pin: 2, label: 'RED', color: 'red' },
      { type: 'led', pin: 3, label: 'YELLOW', color: 'yellow' },
      { type: 'led', pin: 4, label: 'GREEN', color: 'green' },
    ],
  },

  checkPins: [
    { pin: 2, label: 'RED' },
    { pin: 3, label: 'YELLOW' },
    { pin: 4, label: 'GREEN' },
  ],

  checkWindowMs: 8000, // needs to observe a full ~7s cycle plus a bit of the repeat

  check(events) {
    // Sample the full 3-pin state at a handful of checkpoints across one
    // full cycle (7000ms total), each placed comfortably inside a phase
    // rather than right at a transition boundary.
    const checkpoints = [
      { atMs: 1500, expected: { RED: 1, YELLOW: 0, GREEN: 0 }, phase: 'RED' },
      { atMs: 4500, expected: { RED: 0, YELLOW: 0, GREEN: 1 }, phase: 'GREEN' },
      { atMs: 6600, expected: { RED: 0, YELLOW: 1, GREEN: 0 }, phase: 'YELLOW' },
      { atMs: 7500, expected: { RED: 1, YELLOW: 0, GREEN: 0 }, phase: 'RED (cycle repeated)' },
    ];

    for (const cp of checkpoints) {
      for (const label of ['RED', 'YELLOW', 'GREEN']) {
        const actual = stateAtTime(events, label, cp.atMs);
        if (actual !== cp.expected[label]) {
          return {
            pass: false,
            message: `At t=${cp.atMs}ms (expected phase: ${cp.phase}), ${label} should be ${cp.expected[label] ? 'ON' : 'OFF'} but was ${actual ? 'ON' : 'OFF'}. Check your delay() durations and which LED you turn on/off in each phase.`,
          };
        }
      }
    }

    return { pass: true, message: 'Correct! The sequence and timing match RED(3s) -> GREEN(3s) -> YELLOW(1s).' };
  },
};
