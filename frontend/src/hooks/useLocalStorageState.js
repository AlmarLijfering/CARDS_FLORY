import { useEffect, useState } from 'react';

export function useLocalStorageState(key, initialValue, normalizeValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (stored == null) {
        return typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      const parsed = JSON.parse(stored);
      return normalizeValue ? normalizeValue(parsed) : parsed;
    } catch (error) {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore storage failures and keep the current in-memory value.
    }
  }, [key, value]);

  return [value, setValue];
}

