import { hasActivityInWindow } from '../../../lib/checkers';

export default {
  theory: `A piezo buzzer makes sound when its pin is switched on and off rapidly -- the frequency of that
switching is the pitch you hear. tone(pin, frequency) starts the chip generating that square wave
automatically in the background; noTone(pin) stops it.

tone(pin, frequency, duration) can also take an optional third argument -- how long to play, in
milliseconds -- after which it stops on its own, without needing a separate noTone() call.`,

  problemStatement: `Write a program that plays a two-note alert pattern on a buzzer (pin 8), forever:
1000Hz for 200ms, then silence for 100ms, then 2000Hz for 300ms, then silence for 100ms, then
repeat.

Requirements:
1. Configure pin 8 as an OUTPUT.
2. Use tone() and noTone() with delay() to produce the timing above.`,

  starterCode: `int buzzerPin = 8;

void setup() {
  // TODO: configure buzzerPin as OUTPUT

}

void loop() {
  // TODO: 1000Hz for 200ms, silence 100ms, 2000Hz for 300ms, silence 100ms

}
`,

  solutionCode: `int buzzerPin = 8;

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  tone(buzzerPin, 1000);
  delay(200);
  noTone(buzzerPin);
  delay(100);

  tone(buzzerPin, 2000);
  delay(300);
  noTone(buzzerPin);
  delay(100);
}
`,

  circuit: {
    components: [{ type: 'buzzer', pin: 8, label: 'BUZZER' }],
  },

  checkPins: [{ pin: 8, label: 'BUZZER' }],
  checkWindowMs: 750,

  check(events) {
    if (!hasActivityInWindow(events, 'BUZZER', 50, 150)) {
      return { pass: false, message: 'Expected the buzzer to be sounding around t=100ms (the first 1000Hz note). Check your first tone() call.' };
    }
    if (hasActivityInWindow(events, 'BUZZER', 220, 280)) {
      return { pass: false, message: "Expected silence around t=250ms (the gap between notes). Did you call noTone() after the first note?" };
    }
    if (!hasActivityInWindow(events, 'BUZZER', 350, 450)) {
      return { pass: false, message: 'Expected the buzzer to be sounding around t=400ms (the second 2000Hz note). Check your second tone() call.' };
    }
    if (hasActivityInWindow(events, 'BUZZER', 620, 680)) {
      return { pass: false, message: "Expected silence around t=650ms (the gap after the second note). Did you call noTone() again?" };
    }

    return { pass: true, message: 'Correct! Both notes and both silences land in the right place.' };
  },
};
