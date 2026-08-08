// Structured index of the curriculum defined in docs/curriculum.md.
// This is metadata only (ids, titles, focus lines) -- full lesson content
// (theory/code/problem/solution) will be loaded per-topic later once the
// content-authoring pipeline exists. For now this drives navigation.

export const tracks = [
  {
    id: 'fundamentals',
    name: 'Fundamentals',
    description: 'The Arduino API only. No registers, no pointers -- just building working circuits.',
    modules: [
      {
        id: 'f-basics',
        name: 'Getting Started',
        topics: [
          { id: 'blink-led', title: 'Blink an LED', focus: 'pinMode, digitalWrite, delay' },
          { id: 'push-button', title: 'Push Button Input', focus: 'digitalRead, pull-up resistors' },
          { id: 'traffic-light', title: 'Traffic Light Controller', focus: 'Multiple outputs, timed sequencing' },
          { id: 'pwm-fading', title: 'PWM & LED Fading', focus: 'analogWrite, brightness control' },
          { id: 'potentiometer', title: 'Potentiometer Input', focus: 'analogRead, ADC, map()' },
          { id: 'servo-control', title: 'Servo Motor Control', focus: 'Servo library, angle control' },
          { id: 'dc-motor', title: 'DC Motor Control', focus: 'Transistor/H-bridge, direction + speed' },
          { id: 'buzzer-tone', title: 'Buzzer & Tone Generation', focus: 'tone(), noTone(), note sequences' },
          { id: 'ultrasonic', title: 'Ultrasonic Distance Sensor', focus: 'pulseIn(), timing-based sensing' },
          { id: 'millis-timing', title: 'Non-blocking Timing with millis()', focus: 'Doing multiple things at once' },
        ],
      },
    ],
  },
  {
    id: 'systems',
    name: 'Systems & Firmware Engineering',
    description: 'Real C/C++, direct hardware registers, and professional firmware architecture.',
    modules: [
      {
        id: 'm1',
        name: 'Module 1: Digital I/O, Bitwise Ops & C Fundamentals',
        topics: [
          { id: '1-1-blink-led', title: 'Blink an LED', focus: 'Registers, fixed-width types, bitwise ops' },
          { id: '1-2-push-buttons', title: 'Push Buttons, Debouncing & Bit Masking', focus: 'Pull-ups, PINx, software debounce' },
          { id: '1-3-traffic-light', title: 'Traffic Light Controller & State Enums', focus: 'Port writes, enum class' },
          { id: '1-4-pointers', title: 'Pointers & References Primer', focus: 'Address-of, dereference, pass-by-pointer' },
          { id: '1-5-macros', title: 'Preprocessor Macros & Conditional Compilation', focus: '#define, #ifdef, build flags' },
        ],
      },
      {
        id: 'm2',
        name: 'Module 2: Analog Controls & Actuators',
        topics: [
          { id: '2-1-pwm-timers', title: 'PWM & Duty Cycles (Timer Hardware)', focus: 'TCCR1A/B, OCR1A, lookup tables' },
          { id: '2-2-adc', title: 'Potentiometers, ADC & Volatile Variables', focus: 'ADMUX, ADCSRA, volatile' },
          { id: '2-3-servos', title: 'Servos & Function Pointers', focus: 'RC pulse protocol, callbacks' },
          { id: '2-4-dc-motors', title: 'DC Motors, H-Bridges & Struct Configuration', focus: 'Shoot-through, flyback diodes' },
          { id: '2-5-buzzers', title: 'Buzzers, Tones & Array Structures', focus: 'Pitch mapping, arrays of structs' },
        ],
      },
      {
        id: 'm3',
        name: 'Module 3: Non-Blocking Architecture & Memory Layout',
        topics: [
          { id: '3-1-millis', title: 'Precise Timing with millis() & Overflow Math', focus: 'Unsigned rollover-safe deltas' },
          { id: '3-2-ultrasonic-interrupts', title: 'Ultrasonic Sensors & External Interrupts', focus: 'INT0/INT1, ISRs' },
          { id: '3-3-isr-safety', title: 'ISR Safety Rules & Race Conditions', focus: 'volatile, atomic guards' },
          { id: '3-4-fsm', title: 'Finite State Machines (FSM)', focus: 'enum class, switch-case engines' },
          { id: '3-5-memory-layout', title: 'Memory Layout: Stack, Heap & SRAM', focus: 'Why String is dangerous on AVR' },
        ],
      },
      {
        id: 'm4',
        name: 'Module 4: Hardware Communication Protocols',
        topics: [
          { id: '4-1-uart', title: 'UART / Serial Communication', focus: 'Baud rate, ring buffers' },
          { id: '4-2-i2c', title: 'I2C Protocol (Master / Slave)', focus: 'START/STOP, 7-bit addressing' },
          { id: '4-3-spi', title: 'SPI Protocol & High-Speed Peripherals', focus: 'MOSI/MISO, CPOL/CPHA' },
          { id: '4-4-eeprom', title: 'EEPROM Read/Write', focus: 'Non-volatile config storage' },
          { id: '4-5-watchdog', title: 'Watchdog Timer', focus: 'Automatic fault recovery' },
        ],
      },
      {
        id: 'm5',
        name: 'Module 5: Modular Architecture & Driver Design',
        topics: [
          { id: '5-1-split-compilation', title: 'Split Compilation & File Scoping', focus: '.h/.cpp, header guards, extern' },
          { id: '5-2-oop-drivers', title: 'Object-Oriented Driver Wrappers', focus: 'Classes, multi-instance objects' },
          { id: '5-3-hal', title: 'Abstract Hardware Interfaces (HAL)', focus: 'Pure virtual functions, polymorphism' },
          { id: '5-4-integration', title: 'Multi-Sensor System Integration Project', focus: 'Capstone: everything combined' },
        ],
      },
    ],
  },
];

// Flattens all topics across all tracks/modules into a single ordered list,
// each entry carrying its track/module context. Used for "next/previous topic"
// navigation and for finding the very first topic (the Landing page's
// "Get Started" button target).
export function getAllTopicsFlat() {
  const flat = [];
  for (const track of tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        flat.push({ ...topic, trackId: track.id, trackName: track.name, moduleId: mod.id, moduleName: mod.name });
      }
    }
  }
  return flat;
}

export function findTopic(trackId, topicId) {
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return null;
  for (const mod of track.modules) {
    const topic = mod.topics.find((t) => t.id === topicId);
    if (topic) return { ...topic, trackId, trackName: track.name, moduleId: mod.id, moduleName: mod.name };
  }
  return null;
}
