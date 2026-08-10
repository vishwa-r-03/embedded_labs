import { computeDutyCycleInWindow } from '../../../lib/checkers';

export default {
  theory: `digitalWrite() only gives you fully on or fully off. To get in-between brightness levels, use
analogWrite(pin, value), where value ranges from 0 (off) to 255 (fully on).

Under the hood, analogWrite doesn't actually output a steady voltage -- it rapidly switches the
pin on and off (thousands of times per second), and the LED's brightness depends on what
fraction of that time it's on (the "duty cycle"). This is called PWM (Pulse-Width Modulation). It
happens too fast for your eye (or the LED) to see individual flickers -- you just see the
averaged brightness.

analogWrite only works on specific pins marked with a "~" on the board (pin 9 is one of them on
the Uno) -- these are the pins wired to hardware timers capable of generating PWM.`,

  problemStatement: `Write a program that fades the LED (pin 9) up from off to full brightness, then back down to
off, repeating forever -- a smooth breathing effect.

Requirements:
1. Configure pin 9 as an OUTPUT.
2. Ramp brightness from 0 to 255 and back down to 0, adjusting by 5 every 30ms.`,

  starterCode: `int ledPin = 9;
int brightness = 0;
int fadeAmount = 5;

void setup() {
  // TODO: configure ledPin as OUTPUT

}

void loop() {
  // TODO: analogWrite the current brightness, then step it up or down,
  // reversing direction at 0 and 255

}
`,

  solutionCode: `int ledPin = 9;
int brightness = 0;
int fadeAmount = 5;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  analogWrite(ledPin, brightness);
  brightness += fadeAmount;
  if (brightness <= 0 || brightness >= 255) {
    fadeAmount = -fadeAmount;
  }
  delay(30);
}
`,

  circuit: {
    components: [{ type: 'led', pin: 9, label: 'LED', color: 'red' }],
  },

  checkPins: [{ pin: 9, label: 'LED' }],
  checkWindowMs: 1800,

  check(events) {
    const early = computeDutyCycleInWindow(events, 'LED', 0, 100);
    if (early > 0.15) {
      return {
        pass: false,
        message: `Near the very start, brightness should still be close to 0 -- measured duty cycle was ${(early * 100).toFixed(0)}%. Make sure brightness starts at 0.`,
      };
    }

    const mid = computeDutyCycleInWindow(events, 'LED', 700, 850);
    if (mid < 0.3 || mid > 0.7) {
      return {
        pass: false,
        message: `Around the midpoint of the fade-up, brightness should be roughly half -- measured duty cycle was ${(mid * 100).toFixed(0)}%, expected somewhere near 50%.`,
      };
    }

    const peak = computeDutyCycleInWindow(events, 'LED', 1450, 1600);
    if (peak < 0.85) {
      return {
        pass: false,
        message: `Near the top of the fade, brightness should be close to full -- measured duty cycle was ${(peak * 100).toFixed(0)}%. Check that brightness actually reaches 255.`,
      };
    }

    return { pass: true, message: 'Correct! The LED fades up smoothly from off to full brightness.' };
  },
};
