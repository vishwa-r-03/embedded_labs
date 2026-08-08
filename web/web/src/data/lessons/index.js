import blinkLed from './fundamentals/blink-led';

// Keyed by `${trackId}/${topicId}`. Only topics with real content go here --
// everything else in the curriculum still shows the "coming soon" placeholder
// in TopicPage until it's authored.
const registry = {
  'fundamentals/blink-led': blinkLed,
};

export function getLessonContent(trackId, topicId) {
  return registry[`${trackId}/${topicId}`] ?? null;
}
