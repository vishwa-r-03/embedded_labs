#!/bin/bash
# Compiles an Arduino sketch (.ino) into a .hex file for the ATmega328p (Arduino Uno),
# using avr-gcc directly against the official ArduinoCore-avr source.
#
# Usage: ./build.sh path/to/sketch_folder/sketch.ino output.hex

set -e

SKETCH_INO="$1"
OUTPUT_HEX="$2"
ROOT_DIR="$(dirname "$0")"
CORE_DIR="$ROOT_DIR/ArduinoCore-avr"
BUILD_DIR=$(mktemp -d)

MCU=atmega328p
F_CPU=16000000UL

CORE_SRC="$CORE_DIR/cores/arduino"
VARIANT_SRC="$CORE_DIR/variants/standard"

# Third-party Arduino libraries available to sketches. Each entry needs:
# - its top-level src/ dir added to the include path (so #include <Xyz.h> resolves)
# - its architecture-specific .cpp file(s) compiled in
# Add a new library by adding one line to LIBRARY_INCLUDE_DIRS and one to the
# LIBRARY_SOURCES loop below, matching the Servo entry.
LIBRARY_INCLUDE_DIRS=(
  "$ROOT_DIR/Servo/src"
)
LIBRARY_SOURCES=(
  "$ROOT_DIR/Servo/src/avr/Servo.cpp"
)

LIBRARY_INCLUDE_FLAGS=""
for dir in "${LIBRARY_INCLUDE_DIRS[@]}"; do
  LIBRARY_INCLUDE_FLAGS="$LIBRARY_INCLUDE_FLAGS -I$dir"
done

SKETCH_CPP="$BUILD_DIR/sketch.cpp"
{
  echo '#include <Arduino.h>'
  cat "$SKETCH_INO"
} > "$SKETCH_CPP"

COMMON_FLAGS="-mmcu=$MCU -DF_CPU=$F_CPU -DARDUINO=10819 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR -DDECIMAL_DIG=21 \
  -I$CORE_SRC -I$VARIANT_SRC $LIBRARY_INCLUDE_FLAGS -Os -ffunction-sections -fdata-sections -flto -w"

# Explicitly enforce gnu++11 standard and disable thread-safe statics for C++ files
CXX_FLAGS="-std=gnu++11 -fno-threadsafe-statics -fno-exceptions -fpermissive"

for f in "$CORE_SRC"/*.c; do
  obj="$BUILD_DIR/core_$(basename "${f%.c}").o"
  avr-gcc -c $COMMON_FLAGS "$f" -o "$obj"
done

for f in "$CORE_SRC"/*.S; do
  [ -e "$f" ] || continue # no .S files matched
  obj="$BUILD_DIR/core_$(basename "${f%.S}")_asm.o"
  avr-gcc -c $COMMON_FLAGS -x assembler-with-cpp "$f" -o "$obj"
done

for f in "$CORE_SRC"/*.cpp; do
  obj="$BUILD_DIR/core_$(basename "${f%.cpp}").o"
  avr-g++ -c $COMMON_FLAGS $CXX_FLAGS "$f" -o "$obj"
done

# Compile each configured library's sources (only pulled into the link if the
# sketch actually references symbols from them -- harmless to always compile).
i=0
for f in "${LIBRARY_SOURCES[@]}"; do
  i=$((i + 1))
  obj="$BUILD_DIR/lib${i}_$(basename "${f%.cpp}").o"
  avr-g++ -c $COMMON_FLAGS $CXX_FLAGS "$f" -o "$obj"
done

avr-g++ -c $COMMON_FLAGS $CXX_FLAGS "$SKETCH_CPP" -o "$BUILD_DIR/sketch.o"

avr-gcc -mmcu=$MCU -Os -flto -fuse-linker-plugin -Wl,--gc-sections \
  -o "$BUILD_DIR/firmware.elf" "$BUILD_DIR"/*.o -lm

avr-objcopy -O ihex -R .eeprom "$BUILD_DIR/firmware.elf" "$OUTPUT_HEX"

echo "Built: $OUTPUT_HEX"
avr-size "$BUILD_DIR/firmware.elf"

rm -rf "$BUILD_DIR"