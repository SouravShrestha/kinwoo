// Supabase keeps the refresh token in whatever storage it is given. AsyncStorage is plain app
// data (readable on rooted devices, included in backups), so sessions live in the keychain or
// keystore instead. SecureStore values are size-limited, so each value is split into chunks.

export type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// 512 UTF-16 units stay under SecureStore's 2048-byte guidance even if every one encodes to 4 bytes.
export const CHUNK_LENGTH = 512;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function createChunkedSecureStorage(
  secure: SecureStoreLike,
  // Sessions written before this change; moved across on first read so nobody is signed out.
  legacy?: KeyValueStorage,
): KeyValueStorage {
  const readCount = async (key: string) => {
    const raw = await secure.getItemAsync(countKey(key));
    const count = raw === null ? null : Number(raw);
    return count !== null && Number.isInteger(count) && count >= 0 ? count : null;
  };

  const deleteChunks = async (key: string, from: number, to: number) => {
    for (let index = from; index < to; index += 1) {
      await secure.deleteItemAsync(chunkKey(key, index));
    }
  };

  const setItem = async (key: string, value: string) => {
    const previous = (await readCount(key)) ?? 0;
    const count = Math.max(1, Math.ceil(value.length / CHUNK_LENGTH));
    for (let index = 0; index < count; index += 1) {
      const chunk = value.slice(index * CHUNK_LENGTH, (index + 1) * CHUNK_LENGTH);
      await secure.setItemAsync(chunkKey(key, index), chunk);
    }
    // The count is written last, so a crash mid-write leaves the previous value readable.
    await secure.setItemAsync(countKey(key), String(count));
    await deleteChunks(key, count, previous);
  };

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === null) {
        const old = (await legacy?.getItem(key)) ?? null;
        if (old !== null && legacy) {
          await setItem(key, old);
          await legacy.removeItem(key);
        }
        return old;
      }

      const chunks: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const chunk = await secure.getItemAsync(chunkKey(key, index));
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join("");
    },

    setItem,

    async removeItem(key) {
      const count = (await readCount(key)) ?? 0;
      await secure.deleteItemAsync(countKey(key));
      await deleteChunks(key, 0, count);
      await legacy?.removeItem(key);
    },
  };
}
