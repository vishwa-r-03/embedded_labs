# Compile service container: Node + the AVR toolchain + ArduinoCore-avr + Servo,
# all bundled so this runs identically regardless of which host deploys it.
FROM node:20-slim

# gcc-avr / avr-libc / binutils-avr = the AVR compiler toolchain (same one used
# throughout development). git = needed to clone ArduinoCore-avr/Servo at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc-avr \
    avr-libc \
    binutils-avr \
    git \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


# Clone the Arduino core source and Servo library into the image at build time,
# same sources used throughout local development.
RUN git clone --depth 1 https://github.com/arduino/ArduinoCore-avr.git /app/ArduinoCore-avr
RUN git clone --depth 1 https://github.com/arduino-libraries/Servo.git /app/Servo

COPY build.sh /app/build.sh
RUN chmod +x /app/build.sh

COPY compile-service/package.json compile-service/package-lock.json* /app/compile-service/
WORKDIR /app/compile-service
RUN npm install --omit=dev

COPY compile-service/server.js /app/compile-service/server.js

# Render (and most hosts) inject PORT at runtime; server.js already reads
# process.env.PORT with a fallback, so no change needed there.
EXPOSE 4000

CMD ["node", "server.js"]