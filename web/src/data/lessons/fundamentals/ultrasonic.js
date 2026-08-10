import { stateAtTime } from '../../../lib/checkers';

export default {
  theory: `The HC-SR04 ultrasonic sensor measures distance using sound, the same way bats and submarines
do. It has two pins: TRIG (you send it a short pulse to say "ping now") and ECHO (it sends back a
pulse whose LENGTH tells you how long the sound took to bounce back).

To trigger a measurement: set TRIG LOW briefly, then HIGH for exactly 10 microseconds, then LOW
again. The sensor then holds ECHO HIGH for as long as it takes the sound pulse to travel to the
nearest object and back.

pulseIn(pin, HIGH) waits for a pin to go HIGH, then measures how long it stays HIGH (in
microseconds) before going LOW again -- exactly what you need to read ECHO's response.

Sound travels about 1cm every 29.15 microseconds one-way, or 58.3 microseconds round-trip -- so:
distance_cm = duration_us / 58.3`,

  problemStatement: `Write a program that measures distance with an ultrasonic sensor (TRIG on pin 7, ECHO on pin 8)
and lights an LED (pin 13) whenever an object is closer than 20cm.

Requirements:
1. Configure trigPin as OUTPUT, echoPin as INPUT, ledPin as OUTPUT.
2. Send a proper 10-microsecond trigger pulse each loop.
3. Measure the echo with pulseIn(), convert to centimeters, and light the LED if the distance is
   under 20cm.`,

  starterCode: `int trigPin = 7;
int echoPin = 8;
int ledPin = 13;

void setup() {
  // TODO: configure trigPin as OUTPUT, echoPin as INPUT, ledPin as OUTPUT

}

void loop() {
  // TODO: send a 10us trigger pulse, measure the echo, convert to cm,
  // light the LED if the object is closer than 20cm

}
`,

  solutionCode: `int trigPin = 7;
int echoPin = 8;
int ledPin = 13;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  float distanceCm = duration / 58.3;

  if (distanceCm < 20 && distanceCm > 0) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(60);
}
`,

  circuit: {
    components: [
      { type: 'ultrasonic', trigPin: 7, echoPin: 8, label: 'HC-SR04', distanceCm: 15 },
      { type: 'led', pin: 13, label: 'LED', color: 'red' },
    ],
  },

  checkPins: [{ pin: 13, label: 'LED' }],
  checkWindowMs: 100,

  // The virtual sensor is configured (above) to report an object 15cm away
  // -- inside the 20cm threshold, so the LED should turn on. This is a real
  // simulated sensor responding to a real triggered pulse, not a scripted
  // value -- the exercise is graded on the program correctly reading and
  // interpreting it.
  ultrasonicSensors: [{ trigPin: 7, echoPin: 8, distanceCm: 15 }],

  check(events) {
    const ledState = stateAtTime(events, 'LED', 50);
    if (ledState !== 1) {
      return {
        pass: false,
        message: 'With an object 15cm away (inside the 20cm threshold), the LED should be on. Check your trigger pulse timing and your pulseIn()/distance calculation.',
      };
    }
    return { pass: true, message: 'Correct! The sensor reading correctly triggered the LED.' };
  },
};
