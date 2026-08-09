// Arduino Uno (ATmega328P) digital pin -> AVR port/bit mapping.
// Covers digital pins 0-13 and analog pins A0-A5 (used as digital I/O here).
export function arduinoPinToPort(pin) {
  if (typeof pin === 'string' && pin.startsWith('A')) {
    const analogNum = parseInt(pin.slice(1), 10);
    return { port: 'C', bit: analogNum }; // A0 = PC0, A1 = PC1, ...
  }
  const n = Number(pin);
  if (n >= 0 && n <= 7) return { port: 'D', bit: n };
  if (n >= 8 && n <= 13) return { port: 'B', bit: n - 8 };
  throw new Error(`Unsupported pin: ${pin}`);
}

// A0-A5 map directly to ADC channels 0-5 on the ATmega328P.
export function arduinoPinToADCChannel(pin) {
  if (typeof pin !== 'string' || !pin.startsWith('A')) {
    throw new Error(`Expected an analog pin like "A0", got: ${pin}`);
  }
  return parseInt(pin.slice(1), 10);
}