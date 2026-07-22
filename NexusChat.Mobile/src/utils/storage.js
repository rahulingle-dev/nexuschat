// Cross-platform storage helper for Web, React Native, and Expo Go

const memoryStorage = {};

export const getItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // Ignore storage restrictions
  }
  return memoryStorage[key] || null;
};

export const setItem = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {
    // Ignore storage restrictions
  }
  memoryStorage[key] = value;
};

export const removeItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch (e) {
    // Ignore storage restrictions
  }
  delete memoryStorage[key];
};
