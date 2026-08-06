# Embedded Labs — Curriculum

An interactive, browser-based curriculum for embedded systems programming on Arduino,
inspired by [HDLBits](https://hdlbits.01xz.net). Every topic follows the same four-part shape:
**Theory → Code Comparison → Problem Statement → Solution & Review**, graded automatically
by inspecting simulated pin/peripheral behavior over time.

## Two tracks

- **Track 1 — Fundamentals**: the Arduino API only (`pinMode`, `digitalWrite`, `analogRead`,
  `Servo`, etc.). For learners new to embedded systems or C/C++ generally. Gentle ramp, one
  concept at a time.
- **Track 2 — Systems & Firmware Engineering**: real C/C++, direct hardware register
  manipulation, and professional firmware architecture (multi-file projects, OOP drivers, HALs).
  For learners who've finished Track 1, or who already know C/C++ and want to go straight to
  how embedded systems actually work under the hood.

Each Track 2 topic pairs the high-level Arduino version of a concept against its bare-metal
register-level equivalent, so the abstraction never feels like a black box.

Callout boxes marked **🔧 Engineering note** are not learner-facing — they're notes for us,
flagging where the simulator needs additional work before that topic's checker can be built.

---

# Track 1: Fundamentals

Uses the standard Arduino API exclusively. No registers, no pointers, no multi-file projects —
just building working circuits and understanding what each function actually does.

| # | Topic | Focus |
|---|-------|-------|
| 1.1 | Blink an LED | `pinMode`, `digitalWrite`, `delay` — digital output basics |
| 1.2 | Push Button Input | `digitalRead`, pull-up vs. pull-down resistors, `INPUT_PULLUP` |
| 1.3 | Traffic Light Controller | Multiple digital outputs, timed sequencing |
| 1.4 | PWM & LED Fading | `analogWrite`, what PWM actually is, brightness control |
| 1.5 | Potentiometer Input | `analogRead`, ADC concept, `map()` |
| 1.6 | Servo Motor Control | `Servo` library, pulse-width-based angle control |
| 1.7 | DC Motor Control | Driving a motor via a transistor/H-bridge, direction + speed |
| 1.8 | Buzzer & Tone Generation | `tone()`/`noTone()`, frequency, simple note sequences |
| 1.9 | Ultrasonic Distance Sensor | `pulseIn()`, timing-based sensing |
| 1.10 | Non-blocking Timing with `millis()` | Replacing `delay()` so a program can do multiple things "at once" — the bridge into Track 2 |

*Full theory/problem/solution content for Track 1 to be authored next, following the same format
as Track 2 below, once we're ready to build that half of the content pipeline.*

---

# Track 2: Systems & Firmware Engineering

## Module 1: Basic Digital I/O, Bitwise Operations & C Fundamentals

### Topic 1.1: Blink an LED
*Focus: Digital Output Basics, Fixed-Width Data Types, Bitwise Manipulation, Direct Register Access.*

**1. Theory & Core Concepts**

**Digital Output & Hardware Registers**
Every GPIO pin is backed by internal hardware registers. On 8-bit AVR microcontrollers (e.g.
ATmega328P), GPIO pins are controlled using three 8-bit registers per port:

1. **Data Direction Register (DDRx)** — configures each pin as INPUT (0) or OUTPUT (1).
2. **Port Data Register (PORTx)** — controls output state (LOW/HIGH) when configured as output.
3. **Port Input Register (PINx)** — reads the current logic level on the physical pin.

Calling `pinMode(13, OUTPUT)` translates into bit manipulation on these registers, incurring
runtime overhead compared to writing to them directly.

**Fixed-Width Integer Types (`<stdint.h>`)**
Standard types like `int` change size depending on architecture (16-bit on AVR, 32-bit on
ARM/ESP32). Use fixed-width types for portable code:
- `uint8_t` — 0 to 255, ideal for 8-bit registers and byte buffers.
- `uint32_t` — standard for millisecond timestamps.

**Bitwise Manipulation Operators**
- Left shift (`<<`): `(1 << 5)` creates a mask with bit 5 set (`00100000`).
- OR (`|`): sets specific bits — `PORTB |= (1 << 5);`
- AND with NOT (`& ~`): clears specific bits — `PORTB &= ~(1 << 5);`
- XOR (`^`): toggles specific bits — `PORTB ^= (1 << 5);`

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t LED_PIN = 13;

void setup() { pinMode(LED_PIN, OUTPUT); }
void loop() {
  digitalWrite(LED_PIN, HIGH); delay(1000);
  digitalWrite(LED_PIN, LOW);  delay(1000);
}
```

```cpp
// Direct Register Access (ATmega328P / Arduino Uno)
#include <Arduino.h>
constexpr uint8_t LED_BIT = 5; // Pin 13 = Port B, Bit 5

void setup() { DDRB |= (1 << LED_BIT); }
void loop() {
  PORTB |= (1 << LED_BIT);  delay(1000);
  PORTB &= ~(1 << LED_BIT); delay(1000);
  // Alternative: PORTB ^= (1 << LED_BIT); toggles in one instruction
}
```

**3. Problem Statement: "The Atomic Heartbeat"**

An onboard status LED is on Port B, Bit 3 (PB3). Write `init_heartbeat()` (configures PB3 as
OUTPUT without altering other DDRB bits) and `toggle_heartbeat()` (inverts PB3 using `^=`).

**4. Solution**

```cpp
#include <Arduino.h>
constexpr uint8_t LED_BIT = 3;

void init_heartbeat()   { DDRB |= (1 << LED_BIT); }
void toggle_heartbeat() { PORTB ^= (1 << LED_BIT); }

void setup() { init_heartbeat(); }
void loop()  { toggle_heartbeat(); delay(500); }
```

---

### Topic 1.2: Push Buttons, Debouncing & Bit Masking
*Focus: Digital Inputs, Active-LOW Logic, Internal Pull-ups, Bit Masking, Software Debouncing.*

**1. Theory & Core Concepts**

**Floating Input Pins & Pull-Up Resistors**
An `INPUT` pin has very high impedance (~100 MΩ); left unconnected, it floats and picks up
noise. A **pull-up resistor** holds the line HIGH when the switch is open; closing the switch
grounds it LOW (**Active-LOW logic**). `INPUT_PULLUP` enables an internal ~20-50kΩ resistor,
avoiding a discrete external one.

**Mechanical Switch Bouncing**
Physical contacts oscillate for 1-20ms when pressed. Firmware must filter this to avoid
registering multiple false presses.

**Bit Masking & Input Registers (PINx)**
```
Pin State = PINB & (1 << BIT_INDEX)
```

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction (with debounce)
#include <Arduino.h>
constexpr uint8_t BUTTON_PIN = 2;
constexpr uint32_t DEBOUNCE_DELAY_MS = 50;
uint8_t lastButtonState = HIGH, stableButtonState = HIGH;
uint32_t lastDebounceTime = 0;

void setup() { pinMode(BUTTON_PIN, INPUT_PULLUP); Serial.begin(115200); }
void loop() {
  uint8_t currentReading = digitalRead(BUTTON_PIN);
  if (currentReading != lastButtonState) lastDebounceTime = millis();
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY_MS) {
    if (currentReading != stableButtonState) {
      stableButtonState = currentReading;
      if (stableButtonState == LOW) Serial.println("Button Pressed!");
    }
  }
  lastButtonState = currentReading;
}
```

```cpp
// Direct Register Access
#include <Arduino.h>
constexpr uint8_t BUTTON_BIT = 0; // Pin 8 = Port B, Bit 0

void setup() {
  DDRB &= ~(1 << BUTTON_BIT); // INPUT
  PORTB |= (1 << BUTTON_BIT); // internal pull-up
  Serial.begin(115200);
}
void loop() {
  bool isPressed = !(PINB & (1 << BUTTON_BIT));
  if (isPressed) Serial.println("Raw Read: Pressed (Active-LOW)");
  delay(100);
}
```

**3. Problem Statement: "The Debounced Active-LOW Edge Detector"**

Button on PB1 (Active-LOW). Implement `bool is_button_falling_edge()` that returns `true`
exactly once on a HIGH→LOW transition, filtering bounces shorter than 20ms, non-blockingly.

**4. Solution**

```cpp
#include <Arduino.h>
constexpr uint8_t BUTTON_BIT = 1;
constexpr uint32_t DEBOUNCE_MS = 20;
static uint8_t debouncedState = 1, lastRawState = 1;
static uint32_t lastStateChangeTime = 0;

void init_button() { DDRB &= ~(1 << BUTTON_BIT); PORTB |= (1 << BUTTON_BIT); }

bool is_button_falling_edge() {
  uint8_t currentRaw = (PINB & (1 << BUTTON_BIT)) ? 1 : 0;
  uint32_t currentTime = millis();
  bool fallingEdgeDetected = false;

  if (currentRaw != lastRawState) { lastStateChangeTime = currentTime; lastRawState = currentRaw; }
  if ((currentTime - lastStateChangeTime) >= DEBOUNCE_MS) {
    if (currentRaw != debouncedState) {
      if (debouncedState == 1 && currentRaw == 0) fallingEdgeDetected = true;
      debouncedState = currentRaw;
    }
  }
  return fallingEdgeDetected;
}

void setup() { init_button(); Serial.begin(115200); }
void loop()  { if (is_button_falling_edge()) Serial.println("Valid Button Press Detected!"); }
```

---

### Topic 1.3: Traffic Light Controller & State Enums
*Focus: Multi-LED Sequencing, `enum class`, Full Port Writes.*

**1. Theory & Core Concepts**

**Full Port Writes vs. Bitwise Shifts**
Updating multiple pins that must change simultaneously by writing them one at a time
introduces microsecond skew. Writing directly to `PORTx` updates all 8 pins in one clock cycle:
```
PORTD = (PORTD & ~MASK) | (VALUE & MASK)
```

**Strongly Typed Enumerations (`enum class`)**
```cpp
enum class LightState : uint8_t { RED = (1 << 2), YELLOW = (1 << 3), GREEN = (1 << 4) };
```
Enforces type safety and scope isolation, preventing accidental implicit integer conversions.

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t RED_PIN = 2, YELLOW_PIN = 3, GREEN_PIN = 4;
enum class LightState : uint8_t { RED, GREEN, YELLOW };
LightState state = LightState::RED;
uint32_t lastChange = 0;

void setup() {
  pinMode(RED_PIN, OUTPUT); pinMode(YELLOW_PIN, OUTPUT); pinMode(GREEN_PIN, OUTPUT);
}
void loop() {
  uint32_t now = millis();
  switch (state) {
    case LightState::RED:
      digitalWrite(RED_PIN, HIGH); digitalWrite(YELLOW_PIN, LOW); digitalWrite(GREEN_PIN, LOW);
      if (now - lastChange >= 3000) { state = LightState::GREEN; lastChange = now; }
      break;
    case LightState::GREEN:
      digitalWrite(RED_PIN, LOW); digitalWrite(YELLOW_PIN, LOW); digitalWrite(GREEN_PIN, HIGH);
      if (now - lastChange >= 3000) { state = LightState::YELLOW; lastChange = now; }
      break;
    case LightState::YELLOW:
      digitalWrite(RED_PIN, LOW); digitalWrite(YELLOW_PIN, HIGH); digitalWrite(GREEN_PIN, LOW);
      if (now - lastChange >= 1000) { state = LightState::RED; lastChange = now; }
      break;
  }
}
```

```cpp
// Bare-Metal Direct Register & Port Masking
#include <Arduino.h>
constexpr uint8_t MASK_LIGHTS = (1 << PD2) | (1 << PD3) | (1 << PD4);
enum class LightState : uint8_t { RED = (1 << PD2), YELLOW = (1 << PD3), GREEN = (1 << PD4) };

void setup() { DDRD |= MASK_LIGHTS; }
void set_lights(LightState state) {
  PORTD = (PORTD & ~MASK_LIGHTS) | static_cast<uint8_t>(state);
}
```

**3. Problem Statement: "The Atomic Intersection Controller"**

RED/YELLOW/GREEN on PD5/PD6/PD7. Implement `enum class TrafficSignal`, `init_signals()`, and
`update_signals(TrafficSignal)` using single-cycle register updates that preserve PD0-PD4.

**4. Solution**

```cpp
#include <Arduino.h>
enum class TrafficSignal : uint8_t { RED = (1 << 5), YELLOW = (1 << 6), GREEN = (1 << 7) };
constexpr uint8_t LIGHTS_MASK = (1 << 5) | (1 << 6) | (1 << 7);

void init_signals() { DDRD |= LIGHTS_MASK; }
void update_signals(TrafficSignal signal) {
  PORTD = (PORTD & ~LIGHTS_MASK) | static_cast<uint8_t>(signal);
}

void setup() { init_signals(); }
void loop() {
  static uint32_t lastStateChange = 0;
  static TrafficSignal currentSignal = TrafficSignal::RED;
  uint32_t now = millis();
  update_signals(currentSignal);

  if (currentSignal == TrafficSignal::RED    && (now - lastStateChange >= 3000)) { currentSignal = TrafficSignal::GREEN;  lastStateChange = now; }
  else if (currentSignal == TrafficSignal::GREEN  && (now - lastStateChange >= 3000)) { currentSignal = TrafficSignal::YELLOW; lastStateChange = now; }
  else if (currentSignal == TrafficSignal::YELLOW && (now - lastStateChange >= 1000)) { currentSignal = TrafficSignal::RED;    lastStateChange = now; }
}
```

---

### Topic 1.4: Pointers & References Primer *(new)*
*Focus: Address-of/dereference operators, pointer arithmetic basics, pass-by-pointer vs.
pass-by-reference. Prerequisite for ADC interrupts (2.2) and function pointers (2.3).*

**1. Theory & Core Concepts**

Every variable lives at a memory address. A **pointer** is a variable that stores an address:

```
uint8_t value = 42;
uint8_t *ptr = &value;   // & = "address of" -> ptr now holds value's address
uint8_t copy = *ptr;     // * = "dereference" -> reads the value at that address
*ptr = 100;              // writes through the pointer -> value is now 100
```

Pointers matter enormously on embedded systems: hardware registers are just fixed memory
addresses, ISRs communicate with `loop()` only through shared memory (no return values), and
passing large structs by pointer avoids expensive copies on a CPU with very little RAM.

**Pass-by-value vs. pass-by-pointer**: a function receiving a plain `uint8_t x` gets a *copy* —
changes inside the function don't affect the caller's variable. A function receiving `uint8_t *x`
can modify the caller's original variable through the pointer.

**2. Code Comparison**

```cpp
// Pass-by-value: caller's variable is unaffected
void tryToDouble(int x) { x = x * 2; }

// Pass-by-pointer: caller's variable IS modified
void doubleInPlace(int *x) { *x = (*x) * 2; }

void demo() {
  int value = 5;
  tryToDouble(value);     // value is still 5
  doubleInPlace(&value);  // value is now 10
}
```

**3. Problem Statement: "Safe Sensor Value Swap"**

Implement `void swap_readings(uint16_t *a, uint16_t *b)` that swaps two sensor readings in
place using pointers, and `bool safe_write(uint16_t *dest, uint16_t value)` that writes only if
`dest` is not `nullptr`, returning `false` otherwise (null-pointer safety is a real firmware bug
source — a null register pointer is a guaranteed crash).

**4. Solution**

```cpp
void swap_readings(uint16_t *a, uint16_t *b) {
  uint16_t temp = *a;
  *a = *b;
  *b = temp;
}

bool safe_write(uint16_t *dest, uint16_t value) {
  if (dest == nullptr) return false;
  *dest = value;
  return true;
}
```

---

### Topic 1.5: Preprocessor Macros & Conditional Compilation *(new)*
*Focus: `#define`, function-like macros, `#ifdef`/`#ifndef` for build-time configuration.*

**1. Theory & Core Concepts**

The preprocessor runs *before* compilation, doing pure text substitution. Common real-world
uses in firmware:

- **Constants**: `#define MAX_RETRIES 3` (no memory used, unlike a variable — though
  `constexpr` is generally preferred in C++ for type safety).
- **Function-like macros**: `#define CLAMP(x, lo, hi) ((x) < (lo) ? (lo) : ((x) > (hi) ? (hi) : (x)))`
  — inlined at every call site, no function-call overhead. Parentheses around every argument
  and the whole expression are essential to avoid operator-precedence bugs.
- **Conditional compilation**: `#ifdef DEBUG_MODE ... #endif` lets you compile an entirely
  different build for debugging (extra `Serial.print()` calls) vs. production (those lines don't
  even exist in the compiled binary — zero runtime cost).

**2. Code Comparison**

```cpp
// Without macros: debug prints permanently cost flash space and CPU cycles
void loop() {
  int sensorValue = analogRead(A0);
  Serial.print("Sensor: "); Serial.println(sensorValue); // always compiled in
}
```

```cpp
// With conditional compilation: debug code vanishes entirely in production builds
#define DEBUG_MODE  // comment this line out for a production build

void loop() {
  int sensorValue = analogRead(A0);
#ifdef DEBUG_MODE
  Serial.print("Sensor: "); Serial.println(sensorValue);
#endif
}
```

**3. Problem Statement: "Configurable Build Flags"**

Define a function-like macro `IN_RANGE(x, lo, hi)` that evaluates to `true` if `x` is within
`[lo, hi]` inclusive. Then use `#ifdef VERBOSE_LOGGING` to conditionally compile a status
message that only appears in a "verbose" build.

**4. Solution**

```cpp
#define IN_RANGE(x, lo, hi) ((x) >= (lo) && (x) <= (hi))
#define VERBOSE_LOGGING

void setup() {
  Serial.begin(115200);
  int reading = 512;
  if (IN_RANGE(reading, 0, 1023)) {
#ifdef VERBOSE_LOGGING
    Serial.println("Reading is within valid ADC range.");
#endif
  }
}
void loop() {}
```

---

## Module 2: Analog Controls & Actuators

### Topic 2.1: PWM & Duty Cycles (Timer Hardware)
*Focus: Pulse-Width Modulation, Duty Cycle Calculation, Timer Control Registers, Lookup Tables.*

**1. Theory & Core Concepts**

**Pulse Width Modulation**
Microcontrollers simulate analog output by rapidly switching a pin between VCC and GND. The
average perceived voltage is proportional to the **duty cycle**:
```
D = (t_on / t_period) * 100%      V_avg = VCC * (t_on / t_period)
```

**Bare-Metal Timer Registers (Timer 1)**
- `TCNT1` — counts up on hardware clock ticks.
- `OCR1A`/`OCR1B` — Output Compare Registers; when `TCNT1` matches, the output pin flips
  automatically in hardware, with zero CPU intervention.
- `TCCR1A`/`TCCR1B` — configure PWM mode and clock prescaler.

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t PWM_PIN = 9; // Timer 1 Output (OC1A)
void setup() { pinMode(PWM_PIN, OUTPUT); }
void loop() {
  for (uint16_t val = 0; val <= 255; val++) { analogWrite(PWM_PIN, val); delay(5); }
}
```

```cpp
// Bare-Metal Register Control (10-bit Fast PWM on OC1A / PB1)
#include <Arduino.h>
void setup() {
  DDRB |= (1 << PB1);
  TCCR1A = (1 << COM1A1) | (1 << WGM10) | (1 << WGM11); // Mode 7: 10-bit Fast PWM
  TCCR1B = (1 << WGM12) | (1 << CS11);                  // Prescaler = 8
}
void set_duty_10bit(uint16_t compareValue) { OCR1A = (compareValue > 1023) ? 1023 : compareValue; }
```

**3. Problem Statement: "Gamma-Corrected LED Dimmer"**

Human brightness perception is logarithmic — a linear duty-cycle ramp looks wrong. Configure
8-bit Fast PWM (prescaler 64) on PB1, build a 16-entry gamma-correction lookup table in
`PROGMEM`, and implement `set_log_brightness(uint8_t step)` reading via `pgm_read_byte()`.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/pgmspace.h>
const uint8_t PROGMEM GAMMA_TABLE[16] = { 0,1,2,4,8,13,21,31,45,62,83,109,139,175,217,255 };

void init_pwm_timer1() {
  DDRB |= (1 << PB1);
  TCCR1A = (1 << COM1A1) | (1 << WGM10); // Mode 5: Fast PWM 8-bit
  TCCR1B = (1 << WGM12) | (1 << CS11) | (1 << CS10); // Prescaler 64 -> ~976Hz
}
void set_log_brightness(uint8_t step) {
  if (step > 15) step = 15;
  OCR1A = pgm_read_byte(&(GAMMA_TABLE[step]));
}
void setup() { init_pwm_timer1(); }
void loop() { for (uint8_t i = 0; i < 16; i++) { set_log_brightness(i); delay(100); } }
```

---

### Topic 2.2: Potentiometers, ADC & Volatile Variables
*Focus: ADC, ADC Registers, Pointers as Parameters, the `volatile` Keyword.*

**1. Theory & Core Concepts**

**ADC Principles**
A 10-bit successive-approximation ADC maps a continuous voltage to a digital value:
```
D = floor((Vin / Vref) * 1023)     Step size ≈ 4.88mV at Vref = 5.0V
```

**`volatile`**
Tells the compiler a variable can change outside normal execution flow (e.g. inside an ISR),
preventing the compiler from wrongly caching it in a CPU register across loop iterations.

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t POT_PIN = A0;
void setup() { Serial.begin(115200); }
void loop() {
  uint16_t rawADC = analogRead(POT_PIN);
  Serial.println((rawADC * 5.0f) / 1023.0f);
  delay(200);
}
```

```cpp
// Bare-Metal Direct Register ADC (Channel A0)
#include <Arduino.h>
void adc_init() {
  ADMUX = (1 << REFS0); // Vref = AVcc, Channel = ADC0
  ADCSRA = (1 << ADEN) | (1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0); // Prescaler 128
}
uint16_t adc_read_single() {
  ADCSRA |= (1 << ADSC);
  while (ADCSRA & (1 << ADSC));
  return ADC;
}
```

**3. Problem Statement: "Non-Blocking Interrupt-Driven ADC Sampler"**

Sample ADC0 in the background via interrupt. Declare `volatile uint16_t raw_adc_value`, write
`ISR(ADC_vect)`, and a thread-safe `bool get_adc_reading(uint16_t *out_dest)`.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/interrupt.h>
volatile uint16_t raw_adc_value = 0;

void init_adc_interrupt() {
  ADMUX = (1 << REFS0);
  ADCSRA = (1 << ADEN) | (1 << ADIE) | (1 << ADPS2) | (1 << ADPS1) | (1 << ADPS0);
  sei();
  ADCSRA |= (1 << ADSC);
}
ISR(ADC_vect) { raw_adc_value = ADC; ADCSRA |= (1 << ADSC); }

bool get_adc_reading(uint16_t *out_dest) {
  if (out_dest == nullptr) return false;
  uint8_t sreg = SREG; cli();
  *out_dest = raw_adc_value;
  SREG = sreg;
  return true;
}
void setup() { Serial.begin(115200); init_adc_interrupt(); }
void loop() {
  uint16_t currentADC = 0;
  if (get_adc_reading(&currentADC)) { Serial.print("Interrupt ADC Read: "); Serial.println(currentADC); }
  delay(250);
}
```

---

### Topic 2.3: Servos & Function Pointers
*Focus: Position-Control PWM, Function Pointers as Callbacks.*

**1. Theory & Core Concepts**

**RC Servo Protocol**: 50Hz frame (20ms period). 1.0ms pulse → 0°, 1.5ms → 90°, 2.0ms → 180°.

**Function Pointers**: allow a driver to invoke caller-registered logic without knowing what that
logic is — the same principle behind interrupt handlers and event systems.
```cpp
typedef void (*PositionReachedCallback)(uint8_t currentAngle);
```

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
#include <Servo.h>
Servo myServo;
void setup() { myServo.attach(9); myServo.write(90); }
void loop() { for (int a = 0; a <= 180; a += 10) { myServo.write(a); delay(150); } }
```

```cpp
// Bare-Metal Custom Pulse Driver with Timer 1
#include <Arduino.h>
void init_servo_timer1() {
  DDRB |= (1 << PB1);
  ICR1 = 39999; // 50Hz period (prescaler 8 @ 16MHz)
  TCCR1A = (1 << COM1A1) | (1 << WGM11);
  TCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS11);
}
void write_servo_us(uint16_t pulseWidthUs) { OCR1A = pulseWidthUs * 2; }
```

**3. Problem Statement: "Asynchronous Servo Trajectory Controller with Callbacks"**

Non-blocking engine `service_servo_trajectory()` advances 1°/15ms toward a target, invoking a
registered `ServoArrivalCallback` on arrival.

**4. Solution**

```cpp
#include <Arduino.h>
typedef void (*ServoArrivalCallback)(uint8_t targetAngle);
static ServoArrivalCallback arrivalCallback = nullptr;
static uint8_t currentAngle = 0, targetAngle = 0;
static uint32_t lastStepTime = 0;
constexpr uint32_t STEP_INTERVAL_MS = 15;

void register_arrival_callback(ServoArrivalCallback cb) { arrivalCallback = cb; }
void set_servo_target(uint8_t newTarget) { targetAngle = (newTarget > 180) ? 180 : newTarget; }

void init_servo_hardware() {
  DDRB |= (1 << PB1);
  ICR1 = 39999;
  TCCR1A = (1 << COM1A1) | (1 << WGM11);
  TCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS11);
}
static void update_hardware_pulse(uint8_t angle) {
  uint16_t pulseUs = 1000 + ((uint32_t)angle * 1000) / 180;
  OCR1A = pulseUs * 2;
}
void service_servo_trajectory() {
  uint32_t now = millis();
  if (now - lastStepTime >= STEP_INTERVAL_MS) {
    lastStepTime = now;
    if (currentAngle != targetAngle) {
      currentAngle += (currentAngle < targetAngle) ? 1 : -1;
      update_hardware_pulse(currentAngle);
      if (currentAngle == targetAngle && arrivalCallback != nullptr) arrivalCallback(currentAngle);
    }
  }
}
void on_servo_arrival(uint8_t reachedAngle) { Serial.print("Callback Triggered! Arrived at: "); Serial.println(reachedAngle); }
void setup() { Serial.begin(115200); init_servo_hardware(); register_arrival_callback(on_servo_arrival); set_servo_target(90); }
void loop() { service_servo_trajectory(); }
```

---

### Topic 2.4: DC Motors, H-Bridges & Struct Configuration
*Focus: H-Bridge Topologies, Flyback Diodes, Configuration Structs.*

**1. Theory & Core Concepts**

**H-Bridge Actuation**: 4 transistor switches route current through a motor in either direction.
**Shoot-through risk**: turning on both transistors on the same side simultaneously shorts VCC
to GND. **Flyback diodes** clamp the voltage spike (`V = L * di/dt`) generated when an inductive
motor coil is switched off rapidly.

**Configuration Structs**: grouping related pin assignments into a single struct — instead of
scattering `in1Pin`, `in2Pin`, `pwmPin` as separate globals — keeps a motor's configuration as
one cohesive, passable unit:
```cpp
struct MotorDriver { uint8_t in1_pin; uint8_t in2_pin; uint8_t pwm_pin; };
```

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t IN1_PIN = 3, IN2_PIN = 4, ENA_PIN = 5;
void setup() { pinMode(IN1_PIN, OUTPUT); pinMode(IN2_PIN, OUTPUT); pinMode(ENA_PIN, OUTPUT); }
void set_motor_forward(uint8_t speed) {
  digitalWrite(IN1_PIN, HIGH); digitalWrite(IN2_PIN, LOW); analogWrite(ENA_PIN, speed);
}
```

```cpp
// Struct-based Driver Configuration
#include <Arduino.h>
struct MotorDriver { uint8_t in1_pin; uint8_t in2_pin; uint8_t pwm_pin; };
```

**3. Problem Statement: "Encapsulated Multi-Motor H-Bridge Driver"**

Accept command speeds from -255 (full reverse) to +255 (full forward). Define `MotorDriver`,
write `init_motor_hardware(const MotorDriver *motor)` and
`apply_motor_state(const MotorDriver *motor, int16_t commandSpeed)`. **Safety rule**: always
clear directional outputs before applying a new polarity (break-before-make), to eliminate any
shoot-through window during a direction change.

**4. Solution**

```cpp
#include <Arduino.h>
struct MotorDriver { uint8_t in1_pin; uint8_t in2_pin; uint8_t pwm_pin; };

void init_motor_hardware(const MotorDriver *motor) {
  if (motor == nullptr) return;
  pinMode(motor->in1_pin, OUTPUT); pinMode(motor->in2_pin, OUTPUT); pinMode(motor->pwm_pin, OUTPUT);
  digitalWrite(motor->in1_pin, LOW); digitalWrite(motor->in2_pin, LOW); analogWrite(motor->pwm_pin, 0);
}
void apply_motor_state(const MotorDriver *motor, int16_t commandSpeed) {
  if (motor == nullptr) return;
  if (commandSpeed > 255) commandSpeed = 255;
  if (commandSpeed < -255) commandSpeed = -255;

  // Break-before-make: clear outputs before applying new polarity
  analogWrite(motor->pwm_pin, 0);
  digitalWrite(motor->in1_pin, LOW); digitalWrite(motor->in2_pin, LOW);

  if (commandSpeed > 0) {
    digitalWrite(motor->in1_pin, HIGH); digitalWrite(motor->in2_pin, LOW);
    analogWrite(motor->pwm_pin, (uint8_t)commandSpeed);
  } else if (commandSpeed < 0) {
    digitalWrite(motor->in1_pin, LOW); digitalWrite(motor->in2_pin, HIGH);
    analogWrite(motor->pwm_pin, (uint8_t)(-commandSpeed));
  }
}
const MotorDriver leftMotor = {3, 4, 5};
void setup() { init_motor_hardware(&leftMotor); }
void loop() {
  apply_motor_state(&leftMotor, 200);  delay(1000);
  apply_motor_state(&leftMotor, -200); delay(1000);
  apply_motor_state(&leftMotor, 0);    delay(1000);
}
```

> *Edit note: the original draft's theory section introduced a separate `MotorFlags` bitfield
> struct that the solution never used. Removed — the theory now only references the
> `MotorDriver` struct that the solution actually builds on.*

---

### Topic 2.5: Buzzers, Tones & Array Structures
*Focus: Pitch Mapping, Arrays of Structs, `sizeof()`-based Length Evaluation.*

**1. Theory & Core Concepts**

**Pitch Generation**: a piezo speaker emits sound when driven by a square wave at frequency
`f`. Half-period toggle interval: `t_toggle = 1 / (2f)`.

**Arrays of Structs**: group musical parameters into a clean data table:
```cpp
struct NoteStep { uint16_t pitch_hz; uint16_t duration_ms; };
const NoteStep ALERT_TUNE[] = { {1000,150}, {0,50}, {1500,150} };
constexpr size_t TUNE_LEN = sizeof(ALERT_TUNE) / sizeof(ALERT_TUNE[0]);
```

> **🔧 Engineering note**: `tone()` uses Timer2 internally on the ATmega328P, not Timer1 (used
> by topics 2.1/2.3). avr8js exposes `timer2Config`, but we haven't yet verified end-to-end tone
> generation in the simulator — needs a quick spike before this checker is built.

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
constexpr uint8_t BUZZER_PIN = 8;
void setup() { tone(BUZZER_PIN, 440, 500); }
void loop() {}
```

**3. Problem Statement: "Non-Blocking Acoustic Alert Engine"**

Step through an array of `NoteStep` entries sequentially using `millis()`-based state tracking
(no blocking `delay()`), supporting zero-frequency entries as silence pauses, looping forever.

**4. Solution**

```cpp
#include <Arduino.h>
struct NoteStep { uint16_t frequency; uint16_t duration_ms; };
const NoteStep WARNING_TUNE[] = { {1000,150}, {0,50}, {1500,150}, {0,50}, {2000,300} };
constexpr size_t TUNE_LENGTH = sizeof(WARNING_TUNE) / sizeof(WARNING_TUNE[0]);
constexpr uint8_t BUZZER_PIN = 8;

void service_alert_sequencer(const NoteStep *tune, size_t noteCount, uint8_t buzzerPin) {
  static size_t currentStep = 0;
  static uint32_t stepStartTime = 0;
  static bool isStepActive = false;
  uint32_t now = millis();

  if (!isStepActive) {
    uint16_t freq = tune[currentStep].frequency;
    if (freq > 0) tone(buzzerPin, freq); else noTone(buzzerPin);
    stepStartTime = now; isStepActive = true;
  }
  if (now - stepStartTime >= tune[currentStep].duration_ms) {
    noTone(buzzerPin); isStepActive = false;
    currentStep = (currentStep + 1) % noteCount;
  }
}
void setup() { pinMode(BUZZER_PIN, OUTPUT); }
void loop() { service_alert_sequencer(WARNING_TUNE, TUNE_LENGTH, BUZZER_PIN); }
```

---

## Module 3: Non-Blocking Architecture & Memory Layout

### Topic 3.1: Precise Timing with `millis()` & Overflow Math
*Focus: Non-Blocking Timing, Unsigned Integer Overflow/Rollover, Task Scheduling.*

**1. Theory & Core Concepts**

**Why `delay()` harms responsiveness**: it blocks execution, preventing the system from reading
inputs, servicing communications, or checking safety conditions.

**Unsigned rollover math**: `millis()` overflows back to 0 after ~49.7 days. Unsigned
subtraction handles this correctly automatically via two's-complement arithmetic:
```
Elapsed = currentTime - previousTime     // correct across rollover, always
```

**2. Code Comparison**

```cpp
// DANGEROUS — fails for ~50 days after overflow
if (millis() >= previousTime + interval) { /* ... */ }
```

```cpp
// Correct delta-math pattern — always use this form
#include <Arduino.h>
uint32_t lastExecution = 0;
constexpr uint32_t TASK_INTERVAL_MS = 1000;
void setup() { Serial.begin(115200); }
void loop() {
  uint32_t currentMillis = millis();
  if (currentMillis - lastExecution >= TASK_INTERVAL_MS) {
    lastExecution = currentMillis;
    Serial.println("Executed safely across timer overflows!");
  }
}
```

**3. Problem Statement: "Multi-Rate Non-Blocking Task Scheduler"**

Three tasks at different rates without an RTOS: LED toggle @ 100ms, sensor read @ 500ms,
telemetry @ 2000ms. Define `struct TaskScheduled { interval_ms, last_run_time, task_function }`
and `run_cooperative_scheduler(TaskScheduled *tasks, size_t taskCount)`.

**4. Solution**

```cpp
#include <Arduino.h>
typedef void (*TaskFunction)();
struct TaskScheduled { uint32_t interval_ms; uint32_t last_run_time; TaskFunction task_function; };

void task_blink_led()      { digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); }
void task_read_sensor()    { static uint16_t sample = 0; sample += 5; }
void task_send_telemetry() { Serial.println("[SYSTEM OK] Telemetry Heartbeat Sent."); }

TaskScheduled systemTasks[] = { {100,0,task_blink_led}, {500,0,task_read_sensor}, {2000,0,task_send_telemetry} };
constexpr size_t NUM_TASKS = sizeof(systemTasks) / sizeof(systemTasks[0]);

void run_cooperative_scheduler(TaskScheduled *tasks, size_t taskCount) {
  uint32_t now = millis();
  for (size_t i = 0; i < taskCount; i++) {
    if (now - tasks[i].last_run_time >= tasks[i].interval_ms) {
      tasks[i].last_run_time = now;
      if (tasks[i].task_function != nullptr) tasks[i].task_function();
    }
  }
}
void setup() { pinMode(LED_BUILTIN, OUTPUT); Serial.begin(115200); }
void loop() { run_cooperative_scheduler(systemTasks, NUM_TASKS); }
```

---

### Topic 3.2: Ultrasonic Sensors (HC-SR04) & External Interrupts
*Focus: Time-of-Flight Physics, Microsecond Capture, External Interrupts, ISRs.*

> **🔧 Engineering note**: avr8js exports `INT0`/`INT1`/`PCINT0-2`, confirming external
> interrupt support exists, but we haven't yet verified end-to-end behavior (`EICRA`/`EIMSK`
> register handling, interrupt latency) in our simulator setup. Worth a quick spike before
> building this topic's checker.

**1. Theory & Core Concepts**

**Ultrasonic distance physics**: the HC-SR04 emits a 40kHz burst on trigger, holding its echo
line HIGH for the round-trip duration. At 20°C, speed of sound ≈ 0.0343 cm/µs:
```
distance_cm = t_echo / 58.3
```

**External hardware interrupts**: instead of blocking with `pulseIn()`, `INT0`/`INT1` record
`micros()` timestamps on rising/falling edges in a background ISR — non-blocking.

**2. Code Comparison**

```cpp
// Blocking Abstraction
#include <Arduino.h>
constexpr uint8_t TRIG_PIN = 7, ECHO_PIN = 8;
void setup() { pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT); Serial.begin(115200); }
void loop() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  uint32_t duration = pulseIn(ECHO_PIN, HIGH); // BLOCKING: up to 30ms
  Serial.println(duration / 58.3f);
  delay(100);
}
```

```cpp
// Bare-Metal Interrupt Driver
#include <Arduino.h>
constexpr uint8_t TRIG_BIT = 4; // PD4
volatile uint32_t echoStartUs = 0, echoDurationUs = 0;
volatile bool newReadingAvailable = false;

ISR(INT0_vect) {
  if (PIND & (1 << PD2)) echoStartUs = micros();
  else { echoDurationUs = micros() - echoStartUs; newReadingAvailable = true; }
}
void init_ultrasonic_interrupt() {
  DDRD |= (1 << TRIG_BIT);
  DDRD &= ~(1 << PD2);
  EICRA = (1 << ISC00); // any logical change
  EIMSK = (1 << INT0);
}
```

**3. Problem Statement: "Non-Blocking Interrupt-Based Ultrasonic Driver"**

TRIG on PD4, ECHO on PD2 (INT0). Write `trigger_ultrasonic_ping()` and
`bool read_latest_distance_cm(float *outDistanceCm)`.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/interrupt.h>
constexpr uint8_t TRIG_BIT = PD4;
volatile uint32_t g_echoStartTime = 0, g_echoDuration = 0;
volatile bool g_hasNewSample = false;

ISR(INT0_vect) {
  uint32_t now = micros();
  if (PIND & (1 << PD2)) g_echoStartTime = now;
  else { g_echoDuration = now - g_echoStartTime; g_hasNewSample = true; }
}
void init_ultrasonic_driver() {
  DDRD |= (1 << TRIG_BIT); PORTD &= ~(1 << TRIG_BIT);
  DDRD &= ~(1 << PD2);
  EICRA = (1 << ISC00); EIMSK = (1 << INT0);
  sei();
}
void trigger_ultrasonic_ping() {
  PORTD |= (1 << TRIG_BIT); delayMicroseconds(10); PORTD &= ~(1 << TRIG_BIT);
}
bool read_latest_distance_cm(float *outDistanceCm) {
  if (!g_hasNewSample || outDistanceCm == nullptr) return false;
  uint8_t sreg = SREG; cli();
  uint32_t duration = g_echoDuration; g_hasNewSample = false;
  SREG = sreg;
  *outDistanceCm = (float)duration / 58.3f;
  return true;
}
void setup() { Serial.begin(115200); init_ultrasonic_driver(); }
void loop() {
  static uint32_t lastPingTime = 0;
  if (millis() - lastPingTime >= 60) { lastPingTime = millis(); trigger_ultrasonic_ping(); }
  float distance = 0.0f;
  if (read_latest_distance_cm(&distance)) { Serial.print("Async Distance: "); Serial.print(distance); Serial.println(" cm"); }
}
```

---

### Topic 3.3: ISR Safety Rules & Race Conditions *(new)*
*Focus: General principles for writing correct, safe interrupt handlers — previously only shown
implicitly inside the ADC and ultrasonic examples above; now stated explicitly as its own topic.*

**1. Theory & Core Concepts**

Interrupt Service Routines pause `loop()` at an unpredictable point to run immediately. This
power comes with strict rules, all of which the ADC (2.2) and ultrasonic (3.2) topics already
depend on implicitly:

1. **Keep ISRs short.** Every microsecond spent inside an ISR is a microsecond the rest of the
   system isn't running. Do the minimum: capture a timestamp, copy a byte, set a flag.
2. **Never call `delay()` or `Serial.print()` inside an ISR.** Both depend on interrupts
   themselves (`delay()` on the Timer0 overflow interrupt, `Serial` on the UART interrupt) —
   calling them from inside an interrupt handler can deadlock the chip.
3. **Shared variables must be `volatile`.** Otherwise the compiler may cache a stale copy in a
   CPU register and never notice the ISR changed the real value.
4. **Multi-byte shared variables need an atomic guard when read from `loop()`.** A `uint16_t`
   or `uint32_t` write takes multiple CPU instructions on an 8-bit AVR; an interrupt firing
   mid-write can hand `loop()` a "torn" value — half old bytes, half new. Disable interrupts
   (`cli()`) just long enough to copy the value out, then restore them (`SREG = sreg`) — exactly
   what `get_adc_reading()` in 2.2 and `read_latest_distance_cm()` in 3.2 already do.

**2. Code Comparison**

```cpp
// WRONG: torn read possible, and completely unsafe if this were inside an ISR
uint32_t reading = shared_timestamp; // shared_timestamp is uint32_t + volatile
```

```cpp
// RIGHT: atomic guard prevents a torn read across the 4-byte value
uint8_t sreg = SREG;
cli();
uint32_t reading = shared_timestamp;
SREG = sreg; // restores interrupts to whatever state they were in before
```

**3. Problem Statement: "Audit the Broken ISR"**

Given a buggy snippet that (a) is missing `volatile`, (b) calls `Serial.println()` inside the ISR,
and (c) reads a multi-byte shared variable without an atomic guard — identify all three bugs and
rewrite it correctly. *(This is a code-review-style exercise — graded on the corrected code
compiling and behaving correctly under a simulated interrupt storm, not on matching exact
wording of the identified bugs.)*

**4. Solution**

```cpp
// Corrected version
volatile uint32_t g_lastEventTime = 0; // (a) now volatile

ISR(INT0_vect) {
  g_lastEventTime = micros(); // (b) no Serial.println() here anymore
}

bool get_last_event_time(uint32_t *out) {
  if (out == nullptr) return false;
  uint8_t sreg = SREG; cli();       // (c) atomic guard added
  *out = g_lastEventTime;
  SREG = sreg;
  return true;
}
```

---

### Topic 3.4: Finite State Machines (FSM)
*Focus: Event-Driven State Architectures, `enum class`, Switch-Case State Engines.*

**1. Theory & Core Concepts**

A Finite State Machine models a system as a finite set of explicit states, transitions, and
triggering events. At any moment, the system is in exactly one state.

**FSM state table structure** — combining state enums, action handlers, and transitions avoids
tangled `if`/`else` logic:
```cpp
struct StateTransition { SystemState currentState; SystemEvent triggerEvent; SystemState nextState; };
```

**2. Code Comparison**

```cpp
// Unstructured spaghetti anti-pattern — avoid
if (state == 1) {
  if (digitalRead(2) == LOW) { state = 2; if (sensorRead > 100) state = 3; }
}
```

```cpp
// Structured FSM
#include <Arduino.h>
enum class SystemState { IDLE, PROCESSING, FAULT };
void handle_idle() {}
void handle_processing() {}
void handle_fault() {}
typedef void (*StateActionHandler)();
struct StateHandlerMap { SystemState state; StateActionHandler handler; };
const StateHandlerMap STATE_TABLE[] = {
  {SystemState::IDLE, handle_idle}, {SystemState::PROCESSING, handle_processing}, {SystemState::FAULT, handle_fault}
};
```

**3. Problem Statement: "Automated Gate Controller FSM"**

Four states: `CLOSED → (button) → OPENING → (2000ms) → OPEN → (5000ms) → CLOSING → (2000ms) → CLOSED`.

**4. Solution**

```cpp
#include <Arduino.h>
enum class GateState { CLOSED, OPENING, OPEN, CLOSING };
static GateState currentGateState = GateState::CLOSED;
static uint32_t stateEntryTime = 0;

void set_gate_state(GateState newState) { currentGateState = newState; stateEntryTime = millis(); }

void process_gate_fsm(bool buttonEvent) {
  uint32_t now = millis();
  switch (currentGateState) {
    case GateState::CLOSED:  if (buttonEvent) set_gate_state(GateState::OPENING); break;
    case GateState::OPENING: if (now - stateEntryTime >= 2000) set_gate_state(GateState::OPEN); break;
    case GateState::OPEN:    if (now - stateEntryTime >= 5000) set_gate_state(GateState::CLOSING); break;
    case GateState::CLOSING: if (now - stateEntryTime >= 2000) set_gate_state(GateState::CLOSED); break;
  }
}
void setup() { Serial.begin(115200); pinMode(2, INPUT_PULLUP); }
void loop() {
  static bool lastButtonState = HIGH;
  bool currentButton = digitalRead(2);
  bool buttonTriggered = (lastButtonState == HIGH && currentButton == LOW);
  lastButtonState = currentButton;
  process_gate_fsm(buttonTriggered);
  delay(10);
}
```

---

### Topic 3.5: Memory Layout — Stack, Heap, SRAM & the `String` Trap *(new)*
*Focus: Where variables actually live in memory, why it matters more on a 2KB-RAM chip than
on a laptop. Fulfills the "Memory Layout" half of this module's title.*

**1. Theory & Core Concepts**

An ATmega328P has only **2KB of SRAM** total (compare: a modern laptop has ~16GB). Every
byte of RAM is shared between three regions:

```
0x0100 ─────────────────────────────────────────── 0x08FF (2048 bytes total)
│ Global/static vars │        (free)         │  Stack  │
│  (fixed at compile) │◄── heap grows up ──►  │◄── grows down
```

- **Global/static variables** — allocated once, for the program's entire lifetime. Size is
  known at compile time.
- **Stack** — local variables and function call frames. Grows *downward* automatically as
  functions call other functions; shrinks when they return.
- **Heap** — dynamic allocation (`malloc`, `new`, or the hidden allocations inside Arduino's
  `String` class). Grows *upward*. On AVR, there's no heap-corruption protection — if the stack
  and heap collide, memory silently corrupts, causing baffling crashes with no error message.

**Why the `String` class is dangerous on AVR**: `String` concatenation (`myString += "x"`)
reallocates the heap on every operation. Do this in `loop()` at high frequency and the heap
fragments over hours of runtime until it collides with the stack — a real, well-known cause of
"my Arduino randomly freezes after running for a day" bugs. Fixed-size character buffers
(`char buf[32]`) avoid this entirely, at the cost of manual length management.

**2. Code Comparison**

```cpp
// Dangerous on long-running AVR firmware: fragments the heap over time
String buildMessage(int sensorValue) {
  String msg = "Reading: ";
  msg += sensorValue;   // heap reallocation on every call
  msg += " units";
  return msg;
}
```

```cpp
// Safe: fixed-size stack buffer, zero heap allocation
void buildMessage(int sensorValue, char *outBuf, size_t bufSize) {
  snprintf(outBuf, bufSize, "Reading: %d units", sensorValue);
}
```

**3. Problem Statement: "Heap-Free Telemetry Formatter"**

Rewrite a `String`-based telemetry formatter (given, using concatenation) to use a fixed
`char[64]` buffer and `snprintf()` instead, with zero heap allocation, callable safely from
`loop()` at 100Hz without long-term memory fragmentation risk.

**4. Solution**

```cpp
#include <Arduino.h>
void format_telemetry(int16_t temp, uint16_t humidity, char *outBuf, size_t bufSize) {
  snprintf(outBuf, bufSize, "T:%d H:%u", temp, humidity);
}
void setup() { Serial.begin(115200); }
void loop() {
  char buf[64];
  format_telemetry(23, 55, buf, sizeof(buf));
  Serial.println(buf);
  delay(10);
}
```

---

## Module 4: Hardware Communication Protocols

### Topic 4.1: UART / Serial Communication
*Focus: UART, Baud Rate Calculation, Ring Buffers.*

> **🔧 Engineering note**: avr8js exports `AVRUSART`, so the peripheral itself is supported.
> This topic needs a new **frontend piece**, not just simulator config — a virtual serial
> monitor UI where the learner can watch outgoing bytes and type input back to the emulated
> chip.

**1. Theory & Core Concepts**

**UART**: asynchronous, full-duplex, two lines (TX/RX), both ends must agree on baud rate. A
standard 8N1 frame: 1 start bit + 8 data bits + 1 stop bit = 10 bits per byte.
```
UBRR0 = F_CPU / (16 * BaudRate) - 1
```

**Ring buffers**: incoming bytes are pushed into a circular FIFO buffer inside an ISR, so no byte
is dropped while `loop()` is busy doing something else.

**2. Code Comparison**

```cpp
// High-Level Arduino Abstraction
#include <Arduino.h>
void setup() { Serial.begin(9600); }
void loop() {
  if (Serial.available() > 0) { char rxByte = Serial.read(); Serial.print("Echo: "); Serial.println(rxByte); }
}
```

```cpp
// Bare-Metal Direct Register UART Driver
#include <Arduino.h>
void uart_init(uint32_t baudRate) {
  uint16_t ubrrValue = (F_CPU / (16UL * baudRate)) - 1;
  UBRR0H = (uint8_t)(ubrrValue >> 8); UBRR0L = (uint8_t)(ubrrValue);
  UCSR0B = (1 << TXEN0) | (1 << RXEN0);
  UCSR0C = (1 << UCSZ01) | (1 << UCSZ00); // 8N1
}
void uart_transmit_byte(uint8_t data) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = data; }
```

**3. Problem Statement: "Lock-Free Circular Ring Buffer UART Receiver"**

`ISR(USART_RX_vect)` pushes incoming bytes into a 64-byte ring buffer; `bool
ring_buffer_pop(uint8_t *outData)` retrieves them safely.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/interrupt.h>
constexpr size_t RING_BUF_SIZE = 64;
struct RingBuffer { uint8_t buffer[RING_BUF_SIZE]; volatile size_t head; volatile size_t tail; };
static RingBuffer rxBuffer = {{0}, 0, 0};

ISR(USART_RX_vect) {
  uint8_t incomingByte = UDR0;
  size_t nextHead = (rxBuffer.head + 1) % RING_BUF_SIZE;
  if (nextHead != rxBuffer.tail) { rxBuffer.buffer[rxBuffer.head] = incomingByte; rxBuffer.head = nextHead; }
}
void init_uart_ring_buffer(uint32_t baud) {
  uint16_t ubrr = (F_CPU / (16UL * baud)) - 1;
  UBRR0H = (uint8_t)(ubrr >> 8); UBRR0L = (uint8_t)(ubrr);
  UCSR0B = (1 << RXEN0) | (1 << TXEN0) | (1 << RXCIE0);
  UCSR0C = (1 << UCSZ01) | (1 << UCSZ00);
  sei();
}
bool ring_buffer_pop(uint8_t *outData) {
  if (outData == nullptr || rxBuffer.head == rxBuffer.tail) return false;
  *outData = rxBuffer.buffer[rxBuffer.tail];
  rxBuffer.tail = (rxBuffer.tail + 1) % RING_BUF_SIZE;
  return true;
}
void setup() { init_uart_ring_buffer(115200); }
void loop() {
  uint8_t rxByte = 0;
  if (ring_buffer_pop(&rxByte)) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = rxByte; }
}
```

---

### Topic 4.2: I2C Protocol (Master / Slave)
*Focus: I2C, 7-bit Addressing, START/STOP Conditions, Register Burst Reads.*

> **🔧 Engineering note — grading approach**: avr8js's `AVRTWI` models the **bus master** only;
> there's no slave device on the other end unless we hand-build one (a real MPU6050/similar
> chip model — nontrivial work). **Decision: grade at the protocol level**, same as an HDLBits
> testbench checks waveform correctness without a real DUT — our checker verifies correct
> START condition, device address + R/W bit, ACK timing, and STOP condition sequencing on the
> simulated bus, not real sensor data round-tripping. Full virtual slave-chip modeling is
> deferred (see Appendix).

**1. Theory & Core Concepts**

**I2C bus**: two open-drain lines pulled up to VCC — **SDA** (data) and **SCL** (clock).
**START**: SDA pulled LOW while SCL is HIGH. **STOP**: SDA released HIGH while SCL is HIGH.
**ACK/NACK**: receiver pulls SDA LOW on the 9th clock cycle to acknowledge.

**2. Code Comparison**

```cpp
// High-Level Wire Library
#include <Arduino.h>
#include <Wire.h>
constexpr uint8_t SENSOR_I2C_ADDR = 0x68;
void read_sensor_register(uint8_t regAddr, uint8_t *outData) {
  Wire.beginTransmission(SENSOR_I2C_ADDR);
  Wire.write(regAddr);
  Wire.endTransmission(false); // repeated START
  Wire.requestFrom(SENSOR_I2C_ADDR, (uint8_t)1);
  if (Wire.available()) *outData = Wire.read();
}
```

```cpp
// Bare-Metal Hardware TWI
#include <Arduino.h>
#include <util/twi.h>
void twi_init() { TWBR = 72; TWSR = 0; } // 100kHz @ 16MHz
void twi_start() { TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN); while (!(TWCR & (1 << TWINT))); }
void twi_write_byte(uint8_t data) { TWDR = data; TWCR = (1 << TWINT) | (1 << TWEN); while (!(TWCR & (1 << TWINT))); }
```

**3. Problem Statement: "Bare-Metal Multi-Byte I2C Burst Reader"**

`i2c_burst_read(devAddr, regAddr, buffer, len)`: START → address+write → register address →
repeated-START → address+read → read `len-1` bytes with ACK, final byte with NACK → STOP.
*(Graded on correct bus signal sequencing, per the note above.)*

**4. Solution**

```cpp
#include <Arduino.h>
#include <util/twi.h>
void twi_init_100khz() { TWBR = 72; TWSR = 0; TWCR = (1 << TWEN); }
static bool twi_wait_complete() { uint16_t timeout = 10000; while (!(TWCR & (1 << TWINT))) if (--timeout == 0) return false; return true; }

bool i2c_burst_read(uint8_t devAddr, uint8_t regAddr, uint8_t *buffer, size_t len) {
  if (buffer == nullptr || len == 0) return false;
  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN); if (!twi_wait_complete()) return false;       // START
  TWDR = (devAddr << 1) | 0; TWCR = (1 << TWINT) | (1 << TWEN); if (!twi_wait_complete()) return false; // addr+W
  TWDR = regAddr; TWCR = (1 << TWINT) | (1 << TWEN); if (!twi_wait_complete()) return false;        // reg addr
  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN); if (!twi_wait_complete()) return false;         // repeated START
  TWDR = (devAddr << 1) | 1; TWCR = (1 << TWINT) | (1 << TWEN); if (!twi_wait_complete()) return false; // addr+R
  for (size_t i = 0; i < len; i++) {
    TWCR = (i < len - 1) ? ((1 << TWINT) | (1 << TWEN) | (1 << TWEA)) : ((1 << TWINT) | (1 << TWEN));
    if (!twi_wait_complete()) return false;
    buffer[i] = TWDR;
  }
  TWCR = (1 << TWINT) | (1 << TWSTO) | (1 << TWEN); // STOP
  return true;
}
void setup() { Serial.begin(115200); twi_init_100khz(); }
void loop() {
  uint8_t sensorData[6] = {0};
  if (i2c_burst_read(0x68, 0x3B, sensorData, 6)) Serial.println("I2C Burst Read Successful.");
  delay(1000);
}
```

---

### Topic 4.3: SPI Protocol & High-Speed Peripherals
*Focus: SPI, MOSI/MISO, CPOL/CPHA, Shift Register Transfers.*

> **🔧 Engineering note**: same situation as I2C — avr8js's `AVRSPI` models the master side.
> Graded at the protocol level (correct CS assertion, clock/data shifting, mode timing), not
> against a real flash-chip response. See Appendix for future full peripheral simulation.

**1. Theory & Core Concepts**

**SPI**: high-speed, full-duplex, 4 lines — **MOSI**, **MISO**, **SCK**, **CS/SS** (active-LOW).

| Mode | CPOL | CPHA | Sample Edge |
|------|------|------|-------------|
| 0 | 0 (idle LOW) | 0 | Rising |
| 1 | 0 (idle LOW) | 1 | Falling |
| 2 | 1 (idle HIGH) | 0 | Falling |
| 3 | 1 (idle HIGH) | 1 | Rising |

**2. Code Comparison**

```cpp
// High-Level SPI Library
#include <Arduino.h>
#include <SPI.h>
constexpr uint8_t CS_PIN = 10;
void setup() { pinMode(CS_PIN, OUTPUT); digitalWrite(CS_PIN, HIGH); SPI.begin(); }
uint8_t spi_transfer_byte(uint8_t txByte) {
  digitalWrite(CS_PIN, LOW);
  SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
  uint8_t rxByte = SPI.transfer(txByte);
  SPI.endTransaction();
  digitalWrite(CS_PIN, HIGH);
  return rxByte;
}
```

```cpp
// Bare-Metal Hardware SPI Master
#include <Arduino.h>
void spi_master_init() {
  DDRB |= (1 << PB2) | (1 << PB3) | (1 << PB5); // SS, MOSI, SCK output
  DDRB &= ~(1 << PB4);                          // MISO input
  PORTB |= (1 << PB2);                          // CS high
  SPCR = (1 << SPE) | (1 << MSTR) | (1 << SPR0); // Enable, Master, prescaler 16
}
uint8_t spi_master_transfer(uint8_t data) { SPDR = data; while (!(SPSR & (1 << SPIF))); return SPDR; }
```

**3. Problem Statement: "High-Speed Flash Memory SPI Block Driver"**

`spi_transfer_block()` shifts an outbound array while capturing incoming bytes in place, Mode
0 @ 4MHz, asserting/de-asserting CS around the transaction.

**4. Solution**

```cpp
#include <Arduino.h>
constexpr uint8_t CS_BIT = PB2;
void init_spi_fast() {
  DDRB |= (1 << CS_BIT) | (1 << PB3) | (1 << PB5);
  DDRB &= ~(1 << PB4);
  PORTB |= (1 << CS_BIT);
  SPCR = (1 << SPE) | (1 << MSTR); SPSR = 0; // Mode 0, 4MHz
}
void spi_transfer_block(const uint8_t *txBuf, uint8_t *rxBuf, size_t len) {
  if (len == 0) return;
  PORTB &= ~(1 << CS_BIT);
  for (size_t i = 0; i < len; i++) {
    SPDR = (txBuf != nullptr) ? txBuf[i] : 0xFF;
    while (!(SPSR & (1 << SPIF)));
    if (rxBuf != nullptr) rxBuf[i] = SPDR;
  }
  PORTB |= (1 << CS_BIT);
}
void setup() { Serial.begin(115200); init_spi_fast(); }
void loop() {
  uint8_t command[4] = {0x9F, 0, 0, 0}, response[4] = {0};
  spi_transfer_block(command, response, 4);
  Serial.print("SPI Flash JEDEC ID: 0x"); Serial.println(response[1], HEX);
  delay(2000);
}
```

---

### Topic 4.4: EEPROM Read/Write *(new)*
*Focus: Non-volatile storage that survives power loss — settings, calibration data, run counters.*

**1. Theory & Core Concepts**

Unlike SRAM (wiped on every reset/power-loss), the ATmega328P has **1KB of EEPROM** that
persists indefinitely without power. Ideal for storing configuration that should survive a reboot
— a saved brightness setting, a Wi-Fi password, a boot counter.

**Register-level access**: `EEAR` (address register), `EEDR` (data register), `EECR` (control
register — write `EEMPE` then `EEPE` to trigger a write, which takes ~3.3ms per byte, far
slower than SRAM). **`avr/eeprom.h`** wraps this into simple `eeprom_read_byte()` /
`eeprom_write_byte()` functions.

**Wear consideration**: EEPROM cells are rated for ~100,000 write cycles. Writing every
`loop()` iteration would wear it out in minutes — always write only on meaningful change, never
on a timer.

**2. Code Comparison**

```cpp
// High-Level: Arduino's EEPROM library
#include <Arduino.h>
#include <EEPROM.h>
void setup() {
  EEPROM.write(0, 200);          // store a byte at address 0
  uint8_t saved = EEPROM.read(0); // reads back 200, even after a power cycle
}
```

```cpp
// Bare-metal: avr/eeprom.h helpers wrap the EEAR/EEDR/EECR sequence
#include <avr/eeprom.h>
void save_setting(uint8_t value) { eeprom_write_byte((uint8_t*)0, value); }
uint8_t load_setting() { return eeprom_read_byte((const uint8_t*)0); }
```

**3. Problem Statement: "Persistent Boot Counter"**

Implement `uint16_t get_and_increment_boot_count()` that reads a 2-byte counter from EEPROM
address 0, increments it, writes it back, and returns the new value — so it correctly persists
and increments across simulated power cycles (re-running `setup()`), demonstrating real
non-volatile behavior.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/eeprom.h>

uint16_t get_and_increment_boot_count() {
  uint16_t count = eeprom_read_word((const uint16_t*)0);
  if (count == 0xFFFF) count = 0; // first-ever boot: EEPROM starts erased (all 1s)
  count++;
  eeprom_write_word((uint16_t*)0, count);
  return count;
}
void setup() {
  Serial.begin(115200);
  uint16_t bootCount = get_and_increment_boot_count();
  Serial.print("This device has booted "); Serial.print(bootCount); Serial.println(" times.");
}
void loop() {}
```

---

### Topic 4.5: Watchdog Timer *(new)*
*Focus: Automatic fault recovery — detecting and recovering from a hung/crashed program
without human intervention.*

**1. Theory & Core Concepts**

Embedded devices often run unattended for months. If firmware hangs (infinite loop, deadlock,
corrupted state), there's no one around to power-cycle it. The **Watchdog Timer (WDT)** is an
independent hardware counter that resets the chip automatically if it isn't "fed" (reset)
periodically — the assumption being that healthy code reaches the feed point regularly, so a
missed feed means something is stuck.

**Pattern**: enable the watchdog with a timeout (e.g. 2 seconds), then call `wdt_reset()` near
the top of every `loop()` iteration. If `loop()` ever hangs and stops reaching that call, the
watchdog fires and reboots the chip after the timeout — automatic recovery with zero human
involvement.

**2. Code Comparison**

```cpp
// No watchdog: a hang here means the device is dead until someone finds it and power-cycles it
void loop() {
  read_sensor(); // if this hangs (e.g. sensor bus lockup), the device is stuck forever
  process_data();
}
```

```cpp
// With watchdog: an unrecoverable hang triggers an automatic reboot within the timeout
#include <avr/wdt.h>
void setup() { wdt_enable(WDTO_2S); } // reset the chip if not fed within 2 seconds
void loop() {
  wdt_reset(); // "feed" the watchdog -- proves this iteration completed
  read_sensor();
  process_data();
}
```

**3. Problem Statement: "Watchdog-Protected Sensor Poll"**

Enable a 2-second watchdog. Implement `loop()` so it feeds the watchdog only *after* a
(simulated) sensor read completes successfully — so that if the sensor read function is ever
replaced with one that hangs, the watchdog reboots the system instead of the device staying
silently stuck forever.

**4. Solution**

```cpp
#include <Arduino.h>
#include <avr/wdt.h>

bool read_sensor_safely() {
  // Placeholder for real sensor I/O -- returns success/failure
  return true;
}
void setup() {
  Serial.begin(115200);
  wdt_enable(WDTO_2S);
}
void loop() {
  if (read_sensor_safely()) {
    wdt_reset(); // only feed the watchdog once real work has actually completed
    Serial.println("Sensor poll OK, watchdog fed.");
  }
  // If read_sensor_safely() ever hangs, wdt_reset() is never reached,
  // and the chip auto-reboots within 2 seconds.
  delay(500);
}
```

---

## Module 5: Modular C/C++ Architecture & Driver Design

### Topic 5.1: Split Compilation & File Scoping (.h and .cpp)
*Focus: Translation Units, Header Guards, `static` Scope, `extern`.*

**1. Theory & Core Concepts**

**Compilation pipeline**: each `.cpp` file compiles independently into an object file (`.o`); the
linker then resolves symbols across all object files into the final `.hex`.

**Header guards** prevent double-inclusion within one translation unit:
```cpp
#ifndef DRIVER_H
#define DRIVER_H
// declarations
#endif
```

**Scoping**: `static` at file scope limits a symbol's visibility to its own `.cpp` file (internal
linkage) — prevents naming collisions across files. `extern` tells the compiler a symbol is
defined elsewhere.

**2. Practice Task: Split a driver across 3 files**

```cpp
// status_led.h
#ifndef STATUS_LED_H
#define STATUS_LED_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
void status_led_init(uint8_t pinBit);
void status_led_toggle(void);
#ifdef __cplusplus
}
#endif
#endif
```

```cpp
// status_led.cpp
#include "status_led.h"
#include <Arduino.h>
static uint8_t s_ledPinBit = PB5; // internal linkage -- invisible outside this file

void status_led_init(uint8_t pinBit) { s_ledPinBit = pinBit; DDRB |= (1 << s_ledPinBit); }
void status_led_toggle(void) { PORTB ^= (1 << s_ledPinBit); }
```

```cpp
// main.cpp
#include <Arduino.h>
#include "status_led.h"
void setup() { status_led_init(PB5); }
void loop() { status_led_toggle(); delay(250); }
```

---

### Topic 5.2: Object-Oriented Driver Wrappers (Classes)
*Focus: Class Encapsulation, Constructor Initialization Lists, Multi-Instance Objects.*

**1. Theory & Core Concepts**

C++ classes encapsulate hardware state (pins, timers, flags) privately, exposing clean public
methods. **Member initialization lists** initialize fields before the constructor body runs:
```cpp
class DigitalOutput {
  const uint8_t _pin;
public:
  DigitalOutput(uint8_t pin) : _pin(pin) {}
};
```

**3. Problem Statement: "Multi-Instance Debounced Button Class"**

`DebouncedButton` class maintaining debounce timers independently per instance —
`begin()`, `update()` returning `true` on falling edges.

**4. Solution**

```cpp
#include <Arduino.h>
class DebouncedButton {
  const uint8_t _pin;
  const uint32_t _debounceMs;
  uint8_t _lastRawState, _stableState;
  uint32_t _lastStateChangeTime;
public:
  DebouncedButton(uint8_t pin, uint32_t debounceMs = 50)
    : _pin(pin), _debounceMs(debounceMs), _lastRawState(HIGH), _stableState(HIGH), _lastStateChangeTime(0) {}

  void begin() { pinMode(_pin, INPUT_PULLUP); }

  bool update() {
    uint8_t currentRaw = digitalRead(_pin);
    uint32_t now = millis();
    bool fallingEdge = false;
    if (currentRaw != _lastRawState) { _lastStateChangeTime = now; _lastRawState = currentRaw; }
    if ((now - _lastStateChangeTime) >= _debounceMs) {
      if (currentRaw != _stableState) {
        if (_stableState == HIGH && currentRaw == LOW) fallingEdge = true;
        _stableState = currentRaw;
      }
    }
    return fallingEdge;
  }
};
DebouncedButton btnStart(2, 30), btnStop(3, 30);
void setup() { Serial.begin(115200); btnStart.begin(); btnStop.begin(); }
void loop() {
  if (btnStart.update()) Serial.println("START Button Triggered!");
  if (btnStop.update())  Serial.println("STOP Button Triggered!");
}
```

---

### Topic 5.3: Abstract Hardware Interfaces (Polymorphism & HAL)
*Focus: Hardware Abstraction Layers, Pure Virtual Functions, Swappable Drivers.*

**1. Theory & Core Concepts**

An abstract base class defines a uniform hardware contract; derived classes implement the
specifics, without the application logic ever needing to change:
```
IDistanceSensor (virtual getDistanceCm() = 0)
        ▲
   ┌─────┴─────┐
UltrasonicSensor   SimulatedDistanceSensor
```

**3. Problem Statement: "Polymorphic Distance Sensor HAL"**

`IDistanceSensor` abstract class, `UltrasonicSensor` and `SimulatedDistanceSensor` concrete
drivers, `evaluate_navigation(IDistanceSensor &sensor)` working identically against either.

**4. Solution**

```cpp
#include <Arduino.h>
class IDistanceSensor {
public:
  virtual ~IDistanceSensor() {}
  virtual float getDistanceCm() = 0;
};
class UltrasonicSensor : public IDistanceSensor {
  uint8_t _trigPin, _echoPin;
public:
  UltrasonicSensor(uint8_t trig, uint8_t echo) : _trigPin(trig), _echoPin(echo) {}
  void begin() { pinMode(_trigPin, OUTPUT); pinMode(_echoPin, INPUT); }
  float getDistanceCm() override {
    digitalWrite(_trigPin, LOW); delayMicroseconds(2);
    digitalWrite(_trigPin, HIGH); delayMicroseconds(10);
    digitalWrite(_trigPin, LOW);
    uint32_t duration = pulseIn(_echoPin, HIGH, 30000);
    return (duration == 0) ? 999.0f : (float)duration / 58.3f;
  }
};
class SimulatedDistanceSensor : public IDistanceSensor {
  float _simulatedValue;
public:
  SimulatedDistanceSensor(float initialValue) : _simulatedValue(initialValue) {}
  void setSimulatedValue(float val) { _simulatedValue = val; }
  float getDistanceCm() override { return _simulatedValue; }
};
void evaluate_navigation(IDistanceSensor &sensor) {
  float distance = sensor.getDistanceCm();
  Serial.print("[HAL Nav Engine] Clearance: "); Serial.print(distance); Serial.println(" cm");
  Serial.println((distance < 15.0f) ? " --> [ACTION] Emergency Brake Engaged!" : " --> [ACTION] Path Clear.");
}
UltrasonicSensor realSensor(7, 8);
SimulatedDistanceSensor testSensor(10.5f);
void setup() { Serial.begin(115200); realSensor.begin(); }
void loop() { evaluate_navigation(realSensor); evaluate_navigation(testSensor); delay(2000); }
```

---

### Topic 5.4: Multi-Sensor System Integration Project
*Focus: Full project folder hierarchy, multi-file driver integration, FSM-driven system
architecture. The capstone — combines everything from Modules 1-5.*

**1. Theory & Core Concepts**

```
/src
├── main.cpp        (system setup & main loop)
├── config.h         (pin & parameter configuration)
├── drivers/
│   ├── status_led.h/.cpp   (GPIO output driver)
│   └── env_sensor.h/.cpp   (I2C sensor driver wrapper)
```

**2. Complete Integrated Project**

```cpp
// config.h
#ifndef CONFIG_H
#define CONFIG_H
#include <stdint.h>
constexpr uint8_t PIN_STATUS_LED = 13;
constexpr uint8_t I2C_ADDR_ENVIRONMENT = 0x68;
constexpr uint32_t SENSOR_POLL_INTERVAL_MS = 500;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 1000;
#endif
```

```cpp
// status_led.h
#ifndef STATUS_LED_H
#define STATUS_LED_H
#include <stdint.h>
class StatusLed {
  uint8_t _pinBit;
public:
  StatusLed(uint8_t pinBit);
  void begin(); void set(bool state); void toggle();
};
#endif
```

```cpp
// status_led.cpp
#include "status_led.h"
#include <Arduino.h>
StatusLed::StatusLed(uint8_t pinBit) : _pinBit(pinBit) {}
void StatusLed::begin() { DDRB |= (1 << _pinBit); }
void StatusLed::set(bool state) { if (state) PORTB |= (1 << _pinBit); else PORTB &= ~(1 << _pinBit); }
void StatusLed::toggle() { PORTB ^= (1 << _pinBit); }
```

```cpp
// env_sensor.h
#ifndef ENV_SENSOR_H
#define ENV_SENSOR_H
#include <stdint.h>
struct EnvDataPayload { int16_t rawTemperature; uint16_t rawHumidity; bool isValid; };
class EnvSensorDriver {
  uint8_t _i2cAddress;
public:
  EnvSensorDriver(uint8_t i2cAddr);
  void begin();
  bool readData(EnvDataPayload *outPayload);
};
#endif
```

```cpp
// env_sensor.cpp
#include "env_sensor.h"
#include <Arduino.h>
#include <Wire.h>
EnvSensorDriver::EnvSensorDriver(uint8_t i2cAddr) : _i2cAddress(i2cAddr) {}
void EnvSensorDriver::begin() { Wire.begin(); }
bool EnvSensorDriver::readData(EnvDataPayload *outPayload) {
  if (outPayload == nullptr) return false;
  Wire.requestFrom(_i2cAddress, (uint8_t)2);
  if (Wire.available() >= 2) {
    outPayload->rawTemperature = (Wire.read() << 8) | Wire.read();
    outPayload->rawHumidity = 50;
    outPayload->isValid = true;
    return true;
  }
  outPayload->isValid = false;
  return false;
}
```

```cpp
// main.cpp
#include <Arduino.h>
#include "config.h"
#include "status_led.h"
#include "env_sensor.h"

enum class SystemMode { INITIALIZING, NORMAL_RUN, WARNING_ALARM };
static StatusLed g_statusLed(PB5);
static EnvSensorDriver g_envSensor(I2C_ADDR_ENVIRONMENT);
static SystemMode g_currentMode = SystemMode::INITIALIZING;

void process_system_fsm(const EnvDataPayload &data) {
  switch (g_currentMode) {
    case SystemMode::INITIALIZING:
      g_currentMode = SystemMode::NORMAL_RUN;
      break;
    case SystemMode::NORMAL_RUN:
      g_statusLed.set(false);
      if (data.isValid && data.rawTemperature > 1000) g_currentMode = SystemMode::WARNING_ALARM;
      break;
    case SystemMode::WARNING_ALARM:
      g_statusLed.toggle();
      if (data.isValid && data.rawTemperature <= 1000) g_currentMode = SystemMode::NORMAL_RUN;
      break;
  }
}
void setup() {
  Serial.begin(115200);
  g_statusLed.begin();
  g_envSensor.begin();
}
void loop() {
  static uint32_t lastSensorPollTime = 0, lastTelemetryTime = 0;
  static EnvDataPayload currentPayload = {0, 0, false};
  uint32_t now = millis();

  if (now - lastSensorPollTime >= SENSOR_POLL_INTERVAL_MS) {
    lastSensorPollTime = now;
    g_envSensor.readData(&currentPayload);
    process_system_fsm(currentPayload);
  }
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    Serial.print("[TELEMETRY] Status:"); Serial.print(currentPayload.isValid ? "OK" : "OFFLINE");
    Serial.print(" | RawTemp:"); Serial.println(currentPayload.rawTemperature);
  }
}
```

---

## Appendix: Deferred / Under Consideration

Ideas raised during curriculum planning that aren't committed to the roadmap yet:

- **Sleep/low-power modes** — real and common embedded topic, but avr8js doesn't currently
  list sleep mode support among its exports. Feasibility unconfirmed; revisit if/when we check
  more deeply or find a workaround.
- **Full virtual I2C/SPI slave device models** (a real simulated MPU6050, flash chip, etc.,
  responding with realistic data) — would let 4.2/4.3 grade actual data round-tripping instead of
  protocol-level sequencing. Meaningful chunk of engineering work; worth it later if the platform
  gains traction, not blocking for launch.
- **ESP32/other boards** — already deferred per our original scope discussion.
