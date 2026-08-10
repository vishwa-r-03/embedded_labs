import { findPulseWidthNear } from '../../../lib/checkers';

export default {
  theory: `Servo motors don't take a simple HIGH/LOW like an LED -- they're controlled by the WIDTH of a
repeating pulse, sent about 50 times per second. A ~1ms pulse means "go to 0 degrees", a ~2ms
pulse means "go to 180 degrees", and everything in between maps proportionally.

Generating that timing by hand is exactly the kind of fiddly, error-prone work a library should
handle for you -- which is what the Servo library does. Three functions cover almost everything:

- myServo.attach(pin) -- tells the library which pin the servo is connected to.
- myServo.write(angle) -- moves the servo to the given angle (0-180 degrees).
- myServo.read() -- returns the last angle written.

Note: analogWrite() on the servo's pin won't work correctly once a servo is attached -- the
library takes over that pin's timer to generate the precise pulses a servo needs.`,

  problemStatement: `Write a program that sweeps a servo (attached to pin 9) smoothly from 0 degrees to 180 degrees
and back, continuously.

Requirements:
1. Attach the servo to pin 9 in setup().
2. In loop(), sweep the angle from 0 to 180 and back down to 0, one degree at a time, with a
   short delay between steps (15ms works well).`,

  starterCode: `#include <Servo.h>

Servo myServo;

void setup() {
  // TODO: attach the servo to pin 9

}

void loop() {
  // TODO: sweep from 0 to 180, then back down to 0, one degree at a time

}
`,

  solutionCode: `#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int angle = 0; angle <= 180; angle++) {
    myServo.write(angle);
    delay(15);
  }
  for (int angle = 180; angle >= 0; angle--) {
    myServo.write(angle);
    delay(15);
  }
}
`,

  circuit: {
    components: [{ type: 'servo', pin: 9, label: 'SERVO' }],
  },

  checkPins: [{ pin: 9, label: 'SERVO' }],
  checkWindowMs: 2800,

  // Graded on actual measured pulse width (microseconds), matching the real
  // Servo library's documented 544-2400us range for 0-180 degrees -- not the
  // simulator's display angle, to avoid any ambiguity about which pulse
  // convention is "correct".
  check(events) {
    const early = findPulseWidthNear(events, 'SERVO', 50);
    if (early === null || early > 700) {
      return {
        pass: false,
        message: `Early in the sweep (t=50ms), the servo pulse should be short (near the 0-degree end) -- ${early === null ? 'no pulse detected' : `measured ${early.toFixed(0)}us`}. Make sure the sweep starts at angle 0.`,
      };
    }

    const mid = findPulseWidthNear(events, 'SERVO', 1350);
    if (mid === null || mid < 1300 || mid > 1650) {
      return {
        pass: false,
        message: `Around the midpoint (t=1350ms, expected ~90 degrees), the pulse should be roughly in the middle of the range -- ${mid === null ? 'no pulse detected' : `measured ${mid.toFixed(0)}us`}, expected around 1470us.`,
      };
    }

    const peak = findPulseWidthNear(events, 'SERVO', 2700);
    if (peak === null || peak < 2200) {
      return {
        pass: false,
        message: `Near the top of the sweep (t=2700ms, expected ~180 degrees), the pulse should be long -- ${peak === null ? 'no pulse detected' : `measured ${peak.toFixed(0)}us`}. Check that the sweep actually reaches 180.`,
      };
    }

    return { pass: true, message: 'Correct! The servo sweeps smoothly from 0 to 180 degrees.' };
  },
};
