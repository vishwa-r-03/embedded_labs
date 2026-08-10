import blinkLed from './fundamentals/blink-led';
import pushButton from './fundamentals/push-button';
import trafficLight from './fundamentals/traffic-light';
import pwmFading from './fundamentals/pwm-fading';
import potentiometer from './fundamentals/potentiometer';
import servoControl from './fundamentals/servo-control';
import dcMotor from './fundamentals/dc-motor';
import buzzerTone from './fundamentals/buzzer-tone';
import ultrasonic from './fundamentals/ultrasonic';
import millisTiming from './fundamentals/millis-timing';

const registry = {
  'fundamentals/blink-led': blinkLed,
  'fundamentals/push-button': pushButton,
  'fundamentals/traffic-light': trafficLight,
  'fundamentals/pwm-fading': pwmFading,
  'fundamentals/potentiometer': potentiometer,
  'fundamentals/servo-control': servoControl,
  'fundamentals/dc-motor': dcMotor,
  'fundamentals/buzzer-tone': buzzerTone,
  'fundamentals/ultrasonic': ultrasonic,
  'fundamentals/millis-timing': millisTiming,
};

export function getLessonContent(trackId, topicId) {
  return registry[`${trackId}/${topicId}`] ?? null;
}