#define F_CPU 16000000UL
#include <avr/io.h>
#include <util/delay.h>

int main(void) {
    DDRB |= (1 << PB5);   // pin 13 on Arduino Uno = PB5, set as output
    while (1) {
        PORTB ^= (1 << PB5);  // toggle LED
        _delay_ms(1000);
    }
}
