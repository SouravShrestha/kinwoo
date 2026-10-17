import type { KeyValueStorage } from "../houses/storage";

const selectedListKey = (houseId: string) => `kinwoo.selectedList.${houseId}`;

export function createListStorage(storage: KeyValueStorage) {
  return {
    async loadSelectedList(houseId: string): Promise<string | null> {
      return storage.getItem(selectedListKey(houseId));
    },
    async persistSelectedList(houseId: string, listId: string): Promise<void> {
      return storage.setItem(selectedListKey(houseId), listId);
    },
  };
}
