import { checkPeriodicToggle } from '../../../lib/checkers';

export default {
  theory: `delay() blocks everything -- while it's waiting, your program can't do anything else at all: no
reading sensors, no responding to buttons, nothing. That's fine for a single blinking LED, but
falls apart the moment you need to do more than one thing "at the same time".

The fix: track time yourself using millis(), which returns the number of milliseconds since the
program started, and never blocks. The pattern:

1. Remember when something last happened (a timestamp variable).
2. Every loop() iteration, check: has enough time passed since then?
3. If yes, do the thing, and update the timestamp.
4. If no, do nothing -- but loop() keeps running, free to check other things too.

This is the single most important habit for writing real embedded programs -- almost everything
you build from here on will use this pattern instead of delay().`,

  problemStatement: `Write a program that blinks two LEDs at different, independent rates at the same time: LED1 (pin
13) toggling every 500ms, and LED2 (pin 12) toggling every 300ms -- without using delay()
anywhere.

Requirements:
1. Configure both pins as OUTPUT.
2. Use millis() and a separate "last toggled" timestamp for each LED to track their independent
   timing.`,

  starterCode: `int led1Pin = 13;
int led2Pin = 12;

unsigned long previousMillis1 = 0;
unsigned long previousMillis2 = 0;
int led1State = LOW;
int led2State = LOW;

void setup() {
  // TODO: configure both pins as OUTPUT

}

void loop() {
  // TODO: toggle led1 every 500ms and led2 every 300ms, independently,
  // using millis() -- no delay()

}
`,

  solutionCode: `int led1Pin = 13;
int led2Pin = 12;

unsigned long previousMillis1 = 0;
unsigned long previousMillis2 = 0;
int led1State = LOW;
int led2State = LOW;

void setup() {
  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis1 >= 500) {
    previousMillis1 = currentMillis;
    led1State = !led1State;
    digitalWrite(led1Pin, led1State);
  }

  if (currentMillis - previousMillis2 >= 300) {
    previousMillis2 = currentMillis;
    led2State = !led2State;
    digitalWrite(led2Pin, led2State);
  }
}
`,

  circuit: {
    components: [
      { type: 'led', pin: 13, label: 'LED1', color: 'red' },
      { type: 'led', pin: 12, label: 'LED2', color: 'green' },
    ],
  },

  checkPins: [
    { pin: 13, label: 'LED1' },
    { pin: 12, label: 'LED2' },
  ],
  checkWindowMs: 2000,

  check(events) {
    const led1Result = checkPeriodicToggle(events, { periodMs: 500, toleranceMs: 100, minToggles: 3, label: 'LED1' });
    if (!led1Result.pass) {
      return { pass: false, message: `LED1 (pin 13): ${led1Result.message}` };
    }
    const led2Result = checkPeriodicToggle(events, { periodMs: 300, toleranceMs: 100, minToggles: 3, label: 'LED2' });
    if (!led2Result.pass) {
      return { pass: false, message: `LED2 (pin 12): ${led2Result.message}` };
    }
    return { pass: true, message: 'Correct! Both LEDs blink independently at their own rates.' };
  },
};
