#!/bin/bash
# Compiles an Arduino sketch (.ino) into a .hex file for the ATmega328p (Arduino Uno),
# using avr-gcc directly against the official ArduinoCore-avr source.
#
# Usage: ./build.sh path/to/sketch_folder/sketch.ino output.hex

set -e

SKETCH_INO="$1"
OUTPUT_HEX="$2"
CORE_DIR="$(dirname "$0")/ArduinoCore-avr"
BUILD_DIR=$(mktemp -d)

MCU=atmega328p
F_CPU=16000000UL

CORE_SRC="$CORE_DIR/cores/arduino"
VARIANT_SRC="$CORE_DIR/variants/standard"

echo "Build dir: $BUILD_DIR"

# The Arduino build process wraps a .ino file as C++ with Arduino.h included.
SKETCH_CPP="$BUILD_DIR/sketch.cpp"
{
  echo '#include <Arduino.h>'
  cat "$SKETCH_INO"
} > "$SKETCH_CPP"

COMMON_FLAGS="-mmcu=$MCU -DF_CPU=$F_CPU -DARDUINO=10819 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR \
  -I$CORE_SRC -I$VARIANT_SRC -Os -ffunction-sections -fdata-sections -flto -w"

# Compile all core C files
for f in "$CORE_SRC"/*.c; do
  obj="$BUILD_DIR/$(basename "${f%.c}").o"
  avr-gcc -c $COMMON_FLAGS "$f" -o "$obj"
done

# Compile all core C++ files
for f in "$CORE_SRC"/*.cpp; do
  obj="$BUILD_DIR/$(basename "${f%.cpp}").o"
  avr-g++ -c $COMMON_FLAGS -fno-exceptions -fpermissive "$f" -o "$obj" 2>/dev/null || \
  avr-g++ -c $COMMON_FLAGS -fno-exceptions -fpermissive "$f" -o "$obj"
done

# Compile the sketch itself
avr-g++ -c $COMMON_FLAGS -fno-exceptions -fpermissive "$SKETCH_CPP" -o "$BUILD_DIR/sketch.o"

# Link everything into one ELF binary
avr-gcc -mmcu=$MCU -Os -flto -fuse-linker-plugin -Wl,--gc-sections \
  -o "$BUILD_DIR/firmware.elf" "$BUILD_DIR"/*.o -lm

# Convert to Intel HEX (what actually gets flashed to real hardware, and what we simulate)
avr-objcopy -O ihex -R .eeprom "$BUILD_DIR/firmware.elf" "$OUTPUT_HEX"

echo "Built: $OUTPUT_HEX"
avr-size "$BUILD_DIR/firmware.elf"

rm -rf "$BUILD_DIR"
