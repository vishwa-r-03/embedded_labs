import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'embedded-labs:progress:v1';

function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable -- progress just won't persist this session. Not fatal.
  }
}

const listeners = new Set();
function notify() {
  for (const listener of listeners) listener();
}

export function markTopicComplete(topicId) {
  const data = readProgress();
  data[topicId] = { completedAt: new Date().toISOString() };
  writeProgress(data);
  notify();
}

export function clearTopicComplete(topicId) {
  const data = readProgress();
  delete data[topicId];
  writeProgress(data);
  notify();
}

export function isTopicComplete(topicId) {
  return Boolean(readProgress()[topicId]);
}

export function useProgress() {
  const subscribe = useCallback((callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '{}';
    } catch {
      return '{}';
    }
  }, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const data = JSON.parse(snapshot);

  return {
    completedTopicIds: new Set(Object.keys(data)),
    isComplete: (topicId) => Boolean(data[topicId]),
    markComplete: markTopicComplete,
    clearComplete: clearTopicComplete,
  };
}
