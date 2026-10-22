import type { KeyValueStorage } from "@kinwoo/client/houses";

// localStorage can throw (private mode, blocked storage); the house choice is a convenience, so
// failures degrade to "nothing stored".
export const houseStorage: KeyValueStorage = {
  getItem: async (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignored on purpose.
    }
  },
  removeItem: async (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignored on purpose.
    }
  },
};
