export default {
  theory: `Digital pins can also be read as inputs. digitalRead(pin) returns HIGH or LOW depending on the
voltage currently on that pin.

A button by itself doesn't reliably produce a clean HIGH or LOW -- when it's not pressed, the pin
is "floating" and can read randomly. The fix is a pull-up resistor, which holds the pin HIGH when
the button isn't pressed. Arduino has one built in: pinMode(pin, INPUT_PULLUP).

With INPUT_PULLUP, the logic is inverted from what you might expect:
- Button NOT pressed -> pin reads HIGH
- Button pressed -> pin reads LOW (the button connects the pin to ground)

This is called "active-LOW" -- very common in real hardware, and worth getting used to now.`,

  problemStatement: `Write a program that turns the LED (pin 13) on while the button (pin 2) is held down, and off
when it's released.

Requirements:
1. Configure pin 13 as an OUTPUT, and pin 2 as an INPUT_PULLUP, in setup().
2. In loop(), read the button and set the LED to match -- remember, the button reads LOW when
   pressed.`,

  starterCode: `void setup() {
  // TODO: configure pin 13 as OUTPUT and pin 2 as INPUT_PULLUP

}

void loop() {
  // TODO: read the button on pin 2, turn the LED on if it's pressed (LOW)

}
`,

  solutionCode: `void setup() {
  pinMode(13, OUTPUT);
  pinMode(2, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(2) == LOW) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
}
`,

  circuit: {
    components: [
      { type: 'led', pin: 13, label: 'LED', color: 'red' },
      { type: 'button', pin: 2, label: 'BTN' },
    ],
  },

  checkPins: [{ pin: 13, label: 'LED' }],

  // Grading needs to actually press the button at a scripted time and verify
  // the LED responds -- this can't be checked by just watching outputs like
  // the blink exercise, since correctness here depends on responding to input.
  driveSchedule: [
    { pin: 2, atMs: 0, value: true }, // idle: not pressed (pull-up holds it HIGH)
    { pin: 2, atMs: 500, value: false }, // press (active-LOW)
    { pin: 2, atMs: 1500, value: true }, // release
  ],

  check(events) {
    const ledEvents = events; // already filtered to the LED pin by TopicPage

    const wentHighAfterPress = ledEvents.find((e) => e.state === 1 && e.timeMs >= 500 && e.timeMs < 600);
    if (!wentHighAfterPress) {
      return {
        pass: false,
        message: "The LED didn't turn on shortly after the button was pressed at t=500ms. Check your digitalRead() logic -- remember, pressed reads LOW.",
      };
    }

    const wentLowAfterRelease = ledEvents.find((e) => e.state === 0 && e.timeMs >= 1500 && e.timeMs < 1600);
    if (!wentLowAfterRelease) {
      return {
        pass: false,
        message: "The LED didn't turn off shortly after the button was released at t=1500ms. Make sure the LED turns off when the button isn't pressed.",
      };
    }

    return {
      pass: true,
      message: 'Correct! The LED followed the button state properly.',
    };
  },
};
