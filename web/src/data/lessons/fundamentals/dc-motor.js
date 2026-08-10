import { stateAtTime, computeDutyCycleInWindow } from '../../../lib/checkers';

export default {
  theory: `A single digital pin can't safely drive a motor -- motors draw far more current than a
microcontroller pin can supply, and they generate voltage spikes when switched that can damage
the chip. An H-bridge (usually a small driver board like the L298N) sits between your Arduino and
the motor, handling both problems.

A typical H-bridge module exposes three control pins per motor:
- IN1, IN2 -- set the direction. One HIGH + one LOW drives forward; swap them to reverse.
  Both LOW (or both HIGH) stops the motor.
- ENA -- an analogWrite() PWM pin controlling speed (0 = stopped, 255 = full speed).

Never drive both IN1 and IN2 HIGH at the same time -- on real H-bridge hardware this can create a
short circuit ("shoot-through") between power and ground.`,

  problemStatement: `Write a program that drives a motor through an H-bridge (IN1 on pin 3, IN2 on pin 4, ENA on pin
5): forward at half speed for 2 seconds, then reverse at half speed for 2 seconds, then stopped
for 1 second, repeating forever.

Requirements:
1. Configure all three pins as OUTPUT.
2. Forward = IN1 HIGH, IN2 LOW. Reverse = IN1 LOW, IN2 HIGH. Half speed = analogWrite(ENA, 128).
3. Stopped = analogWrite(ENA, 0).`,

  starterCode: `int in1Pin = 3;
int in2Pin = 4;
int enaPin = 5;

void setup() {
  // TODO: configure all three pins as OUTPUT

}

void loop() {
  // TODO: forward at half speed (2s), reverse at half speed (2s), stopped (1s)

}
`,

  solutionCode: `int in1Pin = 3;
int in2Pin = 4;
int enaPin = 5;

void setup() {
  pinMode(in1Pin, OUTPUT);
  pinMode(in2Pin, OUTPUT);
  pinMode(enaPin, OUTPUT);
}

void loop() {
  // Forward at half speed
  digitalWrite(in1Pin, HIGH);
  digitalWrite(in2Pin, LOW);
  analogWrite(enaPin, 128);
  delay(2000);

  // Reverse at half speed
  digitalWrite(in1Pin, LOW);
  digitalWrite(in2Pin, HIGH);
  analogWrite(enaPin, 128);
  delay(2000);

  // Stopped
  analogWrite(enaPin, 0);
  delay(1000);
}
`,

  circuit: {
    components: [
      { type: 'led', pin: 3, label: 'IN1 (dir)', color: 'blue' },
      { type: 'led', pin: 4, label: 'IN2 (dir)', color: 'blue' },
      { type: 'led', pin: 5, label: 'ENA (speed)', color: 'green' },
    ],
  },

  checkPins: [
    { pin: 3, label: 'IN1' },
    { pin: 4, label: 'IN2' },
    { pin: 5, label: 'ENA' },
  ],
  checkWindowMs: 5200,

  check(events) {
    const forwardIn1 = stateAtTime(events, 'IN1', 1000);
    const forwardIn2 = stateAtTime(events, 'IN2', 1000);
    if (forwardIn1 !== 1 || forwardIn2 !== 0) {
      return {
        pass: false,
        message: `During the forward phase (t=1000ms), expected IN1 HIGH / IN2 LOW -- got IN1=${forwardIn1 ? 'HIGH' : 'LOW'}, IN2=${forwardIn2 ? 'HIGH' : 'LOW'}.`,
      };
    }
    const forwardSpeed = computeDutyCycleInWindow(events, 'ENA', 900, 1100);
    if (forwardSpeed < 0.35 || forwardSpeed > 0.65) {
      return {
        pass: false,
        message: `During the forward phase, ENA's duty cycle should be around 50% -- measured ${(forwardSpeed * 100).toFixed(0)}%. Check analogWrite(enaPin, 128).`,
      };
    }

    const reverseIn1 = stateAtTime(events, 'IN1', 3000);
    const reverseIn2 = stateAtTime(events, 'IN2', 3000);
    if (reverseIn1 !== 0 || reverseIn2 !== 1) {
      return {
        pass: false,
        message: `During the reverse phase (t=3000ms), expected IN1 LOW / IN2 HIGH -- got IN1=${reverseIn1 ? 'HIGH' : 'LOW'}, IN2=${reverseIn2 ? 'HIGH' : 'LOW'}.`,
      };
    }

    const stoppedSpeed = computeDutyCycleInWindow(events, 'ENA', 4600, 4900);
    if (stoppedSpeed > 0.1) {
      return {
        pass: false,
        message: `During the stopped phase (t~4700ms), ENA should be near 0% -- measured ${(stoppedSpeed * 100).toFixed(0)}%. Check analogWrite(enaPin, 0).`,
      };
    }

    return { pass: true, message: 'Correct! Forward, reverse, and stop all behave as expected.' };
  },
};
