import { computeDutyCycleInWindow } from '../../../lib/checkers';

export default {
  theory: `A potentiometer is a variable resistor -- turning its knob changes the voltage on its middle
pin, anywhere between 0V and 5V. analogRead(pin) converts that voltage into a number: 0 (0V) to
1023 (5V), using the chip's 10-bit ADC (Analog-to-Digital Converter).

That 0-1023 range rarely matches what you actually need. map(value, fromLow, fromHigh, toLow,
toHigh) rescales a number from one range into another -- e.g. map(potValue, 0, 1023, 0, 255)
converts the pot's raw reading into a valid analogWrite() brightness value.`,

  problemStatement: `Write a program that reads a potentiometer on A0 and uses it to control the brightness of an LED
on pin 9 -- turning the knob should smoothly dim or brighten the LED.

Requirements:
1. Configure pin 9 as an OUTPUT.
2. In loop(), read the potentiometer, map its 0-1023 range to 0-255, and write that to the LED.`,

  starterCode: `int potPin = A0;
int ledPin = 9;

void setup() {
  // TODO: configure ledPin as OUTPUT

}

void loop() {
  // TODO: read potPin, map it from 0-1023 to 0-255, write it to ledPin

}
`,

  solutionCode: `int potPin = A0;
int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int potValue = analogRead(potPin);
  int brightness = map(potValue, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);
}
`,

  circuit: {
    components: [
      { type: 'potentiometer', pin: 'A0', label: 'POT', initialValue: 512 },
      { type: 'led', pin: 9, label: 'LED', color: 'red' },
    ],
  },

  checkPins: [{ pin: 9, label: 'LED' }],
  checkWindowMs: 600,

  // Scripts the potentiometer to two different values and checks the LED's
  // brightness actually follows -- this can't be checked by watching the LED
  // alone without also controlling what the pot is doing.
  driveSchedule: [
    { analogPin: 'A0', atMs: 0, rawValue: 100 }, // low -> dim
    { analogPin: 'A0', atMs: 300, rawValue: 900 }, // high -> bright
  ],

  check(events) {
    const dimDuty = computeDutyCycleInWindow(events, 'LED', 50, 250);
    if (dimDuty > 0.25) {
      return {
        pass: false,
        message: `With the pot turned low, the LED should be dim -- measured duty cycle was ${(dimDuty * 100).toFixed(0)}%. Check your analogRead()/map() logic.`,
      };
    }

    const brightDuty = computeDutyCycleInWindow(events, 'LED', 350, 550);
    if (brightDuty < 0.65) {
      return {
        pass: false,
        message: `With the pot turned high, the LED should be bright -- measured duty cycle was ${(brightDuty * 100).toFixed(0)}%. Check that the LED actually responds to the pot's value.`,
      };
    }

    return { pass: true, message: "Correct! The LED's brightness follows the potentiometer." };
  },
};
